const fs = require('fs');
const path = require('path');
const { ValidationError, UnprocessableError } = require('../errors');
const { EnrichInputSchema, EnrichOutputSchema } = require('../llm/schema');
const { callEnrichModel, callRepairModel } = require('../llm/enrich-client');

const PROMPT_VERSION = 'enrich-v1';
const QUARANTINE_PATH = path.join(__dirname, '..', '..', 'logs', 'quarantine.jsonl');

// A fixed, fake-but-valid answer — used only when LLM_STUB=1.
function stubEnrichment() {
  const stub = {
    category: 'fiction',
    summary: 'A stubbed summary standing in for a real model answer.',
    quality_flags: ['none'],
  };
  return EnrichOutputSchema.parse(stub);
}

// Turns a Zod validation failure into a short, readable string —
// used both in the repair prompt and in the quarantine log.
function formatZodError(zodError) {
  return zodError.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
}

// Appends one line of failure detail to logs/quarantine.jsonl. Creates the
// logs/ folder the first time this runs, since it isn't committed to Git.
function writeToQuarantine(entry) {
  fs.mkdirSync(path.dirname(QUARANTINE_PATH), { recursive: true });
  fs.appendFileSync(QUARANTINE_PATH, JSON.stringify(entry) + '\n');
}

async function enrichBook(rawInput) {
  const inputParsed = EnrichInputSchema.safeParse(rawInput);
  if (!inputParsed.success) {
    const issue = inputParsed.error.issues[0];
    throw new ValidationError(`${issue.path.join('.')}: ${issue.message}`);
  }

  if (process.env.LLM_STUB === '1') {
    return stubEnrichment();
  }

  const bookRecord = inputParsed.data;

  // --- First attempt ---
  const first = await callEnrichModel(bookRecord);
  const firstValidation = EnrichOutputSchema.safeParse(first.parsed);

  if (firstValidation.success) {
    return firstValidation.data;
  }

  // --- Repair attempt (exactly one) ---
  const firstErrorMessage = first.parsed
    ? formatZodError(firstValidation.error)
    : 'Response was not valid JSON.';

  const repaired = await callRepairModel(bookRecord, first.rawText, firstErrorMessage);
  const repairValidation = EnrichOutputSchema.safeParse(repaired.parsed);

  if (repairValidation.success) {
    return repairValidation.data;
  }

  // --- Give up cleanly: quarantine and return a 422 ---
  const repairErrorMessage = repaired.parsed
    ? formatZodError(repairValidation.error)
    : 'Repaired response was not valid JSON.';

  writeToQuarantine({
    timestamp: new Date().toISOString(),
    promptVersion: PROMPT_VERSION,
    input: bookRecord,
    firstRawResponse: first.rawText,
    firstError: firstErrorMessage,
    repairRawResponse: repaired.rawText,
    repairError: repairErrorMessage,
  });

  throw new UnprocessableError(
    `Model could not produce a valid response after one repair attempt: ${repairErrorMessage}`
  );
}

module.exports = { enrichBook };