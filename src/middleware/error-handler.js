const {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  UnprocessableError,
  TimeoutError,
  ServiceDisabledError,
} = require('../errors');

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof UnauthorizedError) {
    return res.status(401).json({ error: err.message });
  }
  if (err instanceof UnprocessableError) {
    return res.status(422).json({ error: err.message });
  }
  if (err instanceof TimeoutError) {
    return res.status(504).json({ error: err.message });
  }
  if (err instanceof ServiceDisabledError) {
    return res.status(503).json({ error: err.message });
  }

  // Anything we didn't expect is a real server bug.
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { errorHandler };