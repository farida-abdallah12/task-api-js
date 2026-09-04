// Domain errors. The service layer throws these when a business rule fails.
// They carry MEANING ("not found", "invalid input") but know nothing about HTTP —
// it's the error-handler middleware that maps them to 404 / 400 status codes.

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

class UnprocessableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnprocessableError';
  }
}

class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

class ServiceDisabledError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ServiceDisabledError';
  }
}

module.exports = {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  UnprocessableError,
  TimeoutError,
  ServiceDisabledError,
};