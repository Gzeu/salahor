/**
 * Base error class for operator-related errors
 */
export class OperatorError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OperatorError';
  }
}

/**
 * Error thrown when an operator encounters invalid input
 */
export class InvalidOperatorArgumentError extends OperatorError {
  constructor(message) {
    super(message);
    this.name = 'InvalidOperatorArgumentError';
  }
}

/**
 * Error thrown when an operator operation is aborted
 */
export class OperatorAbortedError extends OperatorError {
  constructor(message = 'Operation aborted') {
    super(message);
    this.name = 'OperatorAbortedError';
  }
}

/**
 * Error thrown when an operator times out
 */
export class OperatorTimeoutError extends OperatorError {
  constructor(message = 'Operation timed out') {
    super(message);
    this.name = 'OperatorTimeoutError';
  }
}

/**
 * Error thrown when a batch operation fails
 */
export class BatchOperationError extends OperatorError {
  constructor(message, batch) {
    super(message);
    this.name = 'BatchOperationError';
    this.batch = batch;
  }
}

/**
 * Error thrown when retry attempts are exhausted
 */
export class RetryExhaustedError extends OperatorError {
  constructor(message, attempts, lastError) {
    super(message);
    this.name = 'RetryExhaustedError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}
