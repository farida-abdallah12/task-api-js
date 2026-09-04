const { ValidationError } = require('../errors');
const { EnrichInputSchema, EnrichOutputSchema } = require('../llm/schema');
const { callEnrichModel } = require('../llm/enrich-client');

// A fixed, fake-but-valid answer — used only when LLM_STUB=1.
// This lets you (and anyone testing your endpoint) exercise the whole
// request/response shape without spending a real model call.
function stubEnrichment() {
  const stub = {
    category: 'fiction',
    summary: 'A stubbed summary standing in for a real model answer.',
    quality_flags: ['none'],
  };
  // Validate even the stub against the output schema — if the stub itself
  // doesn't match the contract, that's a bug worth catching immediately.
  return EnrichOutputSchema.parse(stub);
}

async function enrichBook(rawInput) {
  const parsed = EnrichInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    // Take the first validation issue and name the exact field that failed.
    const issue = parsed.error.issues[0];
    throw new ValidationError(`${issue.path.join('.')}: ${issue.message}`);
  }

  if (process.env.LLM_STUB === '1') {
    return stubEnrichment();
  }

  // Stage 2: call the real model. NOTE — no output validation or repair
  // yet, that's Stage 3. For now we return whatever the model gave us,
  // parsed if possible, so we can eyeball real answers.
  const { rawText, parsed: modelAnswer } = await callEnrichModel(parsed.data);

  if (!modelAnswer) {
    // Temporary Stage 2 behavior: surface the raw text so you can see what
    // went wrong. Stage 3 replaces this with a proper repair-then-quarantine flow.
    throw new Error(`Model response could not be parsed as JSON. Raw response: ${rawText}`);
  }

  return modelAnswer;
}

module.exports = { enrichBook };