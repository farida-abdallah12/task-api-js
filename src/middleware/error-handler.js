const { NotFoundError, ValidationError, UnauthorizedError } = require('../errors'); // UPDATED

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof UnauthorizedError) {          // NEW
    return res.status(401).json({ error: err.message }); // NEW
  }                                                 // NEW

  // Anything we didn't expect is a real server bug.
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { errorHandler };