const express = require('express');
const service = require('../services/auth.service');

const router = express.Router();

router.post('/auth/signup', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await service.signup(email, password);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const tokens = await service.login(email, password);
    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
});

module.exports = router;