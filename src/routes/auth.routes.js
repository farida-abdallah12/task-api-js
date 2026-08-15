const express = require('express');
const service = require('../services/auth.service');
const { requireAuth } = require('../middleware/auth.middleware');

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

router.post('/auth/logout', requireAuth, async (req, res, next) => {
  try {
    await service.logout(req.token);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get('/public/info', (req, res) => {
  res.status(200).json({ message: 'Welcome stranger! This info is public.' });
});

router.get('/protected/profile', requireAuth, (req, res) => {
  res.status(200).json(req.user);
});

router.get('/protected/dashboard', requireAuth, (req, res) => {
  res.status(200).json({ message: `Welcome to your dashboard, ${req.user.email}` });
});

module.exports = router;