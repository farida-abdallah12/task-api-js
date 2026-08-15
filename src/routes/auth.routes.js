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

router.get('/public/info', (req, res) => {
  res.status(200).json({ message: 'Welcome stranger! This info is public.' });
});


router.get('/protected/profile', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Stage 3 will verify this token is real. For now, just proving one was sent.
  res.status(200).json({ message: 'Token received (not yet verified)' });
});

module.exports = router;