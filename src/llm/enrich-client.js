const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { TimeoutError } = require('../errors');

const PROMPT_VERSION = 'enrich-v1';
const PROMPT_PATH = path.join(__dirname, '..', '..', 'prompts', `${PROMPT_VERSION}.md`);
const SYSTEM_PROMPT = fs.readFileSync(PROMPT_PATH, 'utf8');

// 30-second timeout, and maxRetries: 0 so the SDK never silently retries on
// its own — we want full control over which errors get retried and how.
const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
  timeout: 30000,
  maxRetries: 0,
});

function isTimeoutError(err) {
  return err?.name === 'APIConnectionTimeoutError' || err?.constructor?.name === 'APIConnectionTimeoutError';
}

// Only these are worth retrying: a timeout, a rate limit (429), or the
// provider's own server having a bad moment (5xx). A bad key or bad
// request (400/401/403) will still be bad on the next attempt, so we
// never retry those — it would just waste time and quota.
function isRetryable(err) {
  if (isTimeoutError(err)) return true;
  if (err?.status === 429) return true;
  if (err?.status >= 500 && err?.status < 600) return true;
  return false;
}

// Exponential backoff with a little random jitter: 1s, then 2s, then 4s.
// If the provider tells us exactly how long to wait (Retry-After), we
// obey that instead of guessing.
function getRetryDelayMs(err, attempt) {
  const retryAfterHeader = err?.headers?.get?.('retry-after');
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (!Number.isNaN(seconds)) return seconds * 1000;
  }
  const base = [1000, 2000, 4000][attempt] ?? 4000;
  const jitter = Math.random() * 250;
  return base + jitter;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Runs an API call, retrying up to 2 extra times (3 attempts total) only
// for retryable failures. A genuine timeout that exhausts all attempts
// becomes a clean TimeoutError, which the route layer turns into a 504.
async function withRetry(fn) {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLastAttempt = attempt === maxAttempts - 1;
      if (!isRetryable(err) || isLastAttempt) {
        if (isTimeoutError(err)) {
          throw new TimeoutError('The model took too long to respond.');
        }
        throw err;
      }
      await wait(getRetryDelayMs(err, attempt));
    }
  }
}

// One structured log line per call — written to stdout, per the
// Twelve-Factor App logging convention. This is what lets you answer
// "what would this cost at 10,000 requests a day?" in your README.
function logCost({ usage, durationMs, isRepair }) {
  console.log(JSON.stringify({
    event: 'llm_call',
    promptVersion: PROMPT_VERSION,
    model: process.env.LLM_MODEL,
    inputTokens: usage?.prompt_tokens ?? null,
    outputTokens: usage?.completion_tokens ?? null,
    durationMs,
    isRepair,
  }));
}

function extractJson(rawText) {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : rawText;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    return null;
  }
  const jsonSlice = candidate.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(jsonSlice);
  } catch {
    return null;
  }
}

async function callEnrichModel(bookRecord) {
  const startedAt = Date.now();

  const response = await withRetry(() => client.chat.completions.create({
    model: process.env.LLM_MODEL,
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(bookRecord) },
    ],
  }));

  logCost({ usage: response.usage, durationMs: Date.now() - startedAt, isRepair: false });

  const rawText = response.choices[0].message.content;
  return { rawText, parsed: extractJson(rawText) };
}

async function callRepairModel(bookRecord, brokenRawText, validationErrorMessage) {
  const startedAt = Date.now();

  const response = await withRetry(() => client.chat.completions.create({
    model: process.env.LLM_MODEL,
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(bookRecord) },
      { role: 'assistant', content: brokenRawText },
      {
        role: 'user',
        content: `Your previous answer was rejected for this reason: ${validationErrorMessage}\nReturn only corrected JSON matching the schema. No explanation, no markdown fences.`,
      },
    ],
  }));

  logCost({ usage: response.usage, durationMs: Date.now() - startedAt, isRepair: true });

  const rawText = response.choices[0].message.content;
  return { rawText, parsed: extractJson(rawText) };
}

module.exports = { callEnrichModel, callRepairModel, PROMPT_VERSION };