const express = require('express');
const service = require('../services/llm.service');

const router = express.Router();

router.post('/enrich', async (req, res, next) => {
  try {
    const result = await service.enrichBook(req.body ?? {});
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;