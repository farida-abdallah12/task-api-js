const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Load the prompt once when this module is first required — no need to
// re-read the file from disk on every request.
const PROMPT_PATH = path.join(__dirname, '..', '..', 'prompts', 'enrich-v1.md');
const SYSTEM_PROMPT = fs.readFileSync(PROMPT_PATH, 'utf8');

const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
});

// Models sometimes wrap their JSON answer in a markdown code fence, or add
// a sentence before/after it ("Sure! Here's the JSON:"). This strips that
// noise so we can find and parse the actual JSON object underneath.
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

// Sends the validated book record to the model and returns whatever it
// answers, parsed into an object if possible. Does not validate against
// the output schema — that happens one level up, in llm.service.js.
async function callEnrichModel(bookRecord) {
  const response = await client.chat.completions.create({
    model: process.env.LLM_MODEL,
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(bookRecord) },
    ],
  });

  const rawText = response.choices[0].message.content;
  const parsed = extractJson(rawText);

  return { rawText, parsed };
}

// The repair retry: gives the model its own broken answer plus the exact
// validation error, and asks for a corrected version. Reuses the same
// conversation so the model has full context — the original instructions,
// the input it was given, what it answered, and why that answer was rejected.
async function callRepairModel(bookRecord, brokenRawText, validationErrorMessage) {
  const response = await client.chat.completions.create({
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
  });

  const rawText = response.choices[0].message.content;
  const parsed = extractJson(rawText);

  return { rawText, parsed };
}

module.exports = { callEnrichModel, callRepairModel };