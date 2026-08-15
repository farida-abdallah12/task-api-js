const authService = require('../services/auth.service');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const profile = await authService.getProfile(token);

    // Attach the verified user (and raw token, useful for logout) to the request
    req.user = profile;
    req.token = token;

    next(); // verified — let the request continue to the route handler
  } catch (err) {
    next(err); // let errorHandler turn UnauthorizedError into a 401 response
  }
}

module.exports = { requireAuth };