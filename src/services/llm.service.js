const fs = require('fs');
const path = require('path');
const { ValidationError, UnprocessableError, ServiceDisabledError } = require('../errors');
const { EnrichInputSchema, EnrichOutputSchema } = require('../llm/schema');
const { callEnrichModel, callRepairModel, PROMPT_VERSION } = require('../llm/enrich-client');

const QUARANTINE_PATH = path.join(__dirname, '..', '..', 'logs', 'quarantine.jsonl');

function stubEnrichment() {
  const stub = {
    category: 'fiction',
    summary: 'A stubbed summary standing in for a real model answer.',
    quality_flags: ['none'],
  };
  return EnrichOutputSchema.parse(stub);
}

function formatZodError(zodError) {
  return zodError.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
}

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

  // Kill switch: skip the model entirely. Checked before any network call,
  // so flipping this off truly means zero calls made, zero cost, zero risk.
  if (process.env.LLM_ENABLED === 'false') {
    throw new ServiceDisabledError('The enrichment feature is currently disabled.');
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