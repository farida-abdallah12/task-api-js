const { z } = require('zod');

// What a request into /enrich must look like.
const EnrichInputSchema = z.object({
  title: z.string().min(1, 'title is required'),
  price: z.number().positive('price must be a positive number'),
  availability: z.string().min(1, 'availability is required'),
  description: z.string().optional(),
});

// What a correct enriched result looks like — this is the contract.
// Stage 3 will validate the model's raw answer against this same schema.
const EnrichOutputSchema = z.object({
  category: z.enum(['fiction', 'nonfiction', 'childrens', 'academic', 'other']),
  summary: z.string().min(1).max(300),
  quality_flags: z.array(
    z.enum(['missing_description', 'price_anomaly', 'title_too_short', 'needs_review', 'none'])
  ),
});

module.exports = { EnrichInputSchema, EnrichOutputSchema };