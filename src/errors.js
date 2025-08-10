/**
 * Base error class for uniconnect errors
 * @extends Error
 */
export class UniconnectError extends Error {
  constructor(message, code = 'UNICONNECT_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Error thrown when an operation is aborted
 * @extends UniconnectError
 */
export class AbortError extends UniconnectError {
  constructor(message = 'Operation was aborted') {
    super(message, 'ABORT_ERR');
  }
}

/**
 * Error thrown when a queue overflows
 * @extends UniconnectError
 */
export class QueueOverflowError extends UniconnectError {
  constructor(message = 'Queue overflow') {
    super(message, 'QUEUE_OVERFLOW');
  }
}

/**
 * Error thrown for invalid arguments
 * @extends UniconnectError
 */
export class ValidationError extends UniconnectError {
  constructor(message = 'Invalid argument') {
    super(message, 'VALIDATION_ERROR');
  }
}

/**
 * Error thrown for unsupported operations
 * @extends UniconnectError
 */
export class NotSupportedError extends UniconnectError {
  constructor(message = 'Operation not supported') {
    super(message, 'NOT_SUPPORTED');
  }
}
