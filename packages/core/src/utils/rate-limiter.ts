/**
 * Advanced rate limiting utilities using Token Bucket algorithm
 * Provides high-performance rate limiting for event streams
 */

export interface RateLimiterOptions {
  /**
   * Maximum number of tokens in the bucket (burst capacity)
   */
  capacity: number;

  /**
   * Number of tokens to add per refill interval
   */
  tokensPerInterval: number;

  /**
   * Refill interval in milliseconds
   * @default 1000
   */
  intervalMs?: number;

  /**
   * Initial number of tokens in the bucket
   * @default capacity
   */
  initialTokens?: number;
}

/**
 * Token Bucket rate limiter implementation
 * Allows burst traffic up to capacity, then limits to sustainable rate
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly tokensPerInterval: number;
  private readonly intervalMs: number;

  constructor(options: RateLimiterOptions) {
    this.capacity = options.capacity;
    this.tokensPerInterval = options.tokensPerInterval;
    this.intervalMs = options.intervalMs ?? 1000;
    this.tokens = options.initialTokens ?? options.capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume tokens from the bucket
   * @param tokensRequired Number of tokens to consume
   * @returns true if tokens were consumed, false if rate limit exceeded
   */
  consume(tokensRequired: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokensRequired) {
      this.tokens -= tokensRequired;
      return true;
    }

    return false;
  }

  /**
   * Get current number of available tokens
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get time until next token is available (in milliseconds)
   */
  getTimeUntilNextToken(): number {
    this.refill();

    if (this.tokens >= 1) {
      return 0;
    }

    const tokensNeeded = 1 - this.tokens;
    const timePerToken = this.intervalMs / this.tokensPerInterval;
    return Math.ceil(tokensNeeded * timePerToken);
  }

  /**
   * Reset the bucket to initial state
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;

    if (timePassed >= this.intervalMs) {
      const tokensToAdd = Math.floor(
        (timePassed / this.intervalMs) * this.tokensPerInterval
      );
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}

/**
 * Create a rate-limited version of a function
 * @param fn Function to rate limit
 * @param options Rate limiter options
 * @returns Rate-limited function that returns null when rate limit is exceeded
 */
export function withRateLimit<T extends unknown[], R>(
  fn: (...args: T) => R,
  options: RateLimiterOptions
): (...args: T) => R | null {
  const limiter = new TokenBucketRateLimiter(options);

  return (...args: T): R | null => {
    if (limiter.consume()) {
      return fn(...args);
    }
    return null;
  };
}

/**
 * Create a promise-based rate limiter that waits for tokens
 * @param options Rate limiter options
 * @returns Function that returns a promise resolving when rate limit allows
 */
export function createAsyncRateLimiter(
  options: RateLimiterOptions
): () => Promise<void> {
  const limiter = new TokenBucketRateLimiter(options);

  return async (): Promise<void> => {
    if (limiter.consume()) {
      return;
    }

    const waitTime = limiter.getTimeUntilNextToken();
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  };
}
