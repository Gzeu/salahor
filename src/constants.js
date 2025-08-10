/**
 * Constants used throughout the package
 */

// Queue overflow policies
export const QUEUE_POLICIES = Object.freeze({
  DROP_OLD: 'drop-old',
  DROP_NEW: 'drop-new',
  THROW: 'throw'
});

// Error messages
export const ERROR_MESSAGES = Object.freeze({
  QUEUE_OVERFLOW: 'Queue overflow',
  OPERATION_ABORTED: 'Operation was aborted',
  INVALID_QUEUE_LIMIT: 'queueLimit must be a non-negative number',
  INVALID_OVERFLOW_POLICY: (policy, validPolicies) => 
    `Invalid overflow policy '${policy}'. Must be one of: ${validPolicies.join(', ')}`
});
