const { ValidationError } = require('../errors');
const { EnrichInputSchema, EnrichOutputSchema } = require('../llm/schema');

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

  // Stage 2 will replace this with the real prompt + model call.
  throw new Error('Real model calls are not wired up yet — set LLM_STUB=1 to test the endpoint shape.');
}

module.exports = { enrichBook };