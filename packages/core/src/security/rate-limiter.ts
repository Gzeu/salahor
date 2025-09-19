/**
 * Advanced Rate Limiter with Token Bucket Algorithm
 * Provides protection against DoS attacks and resource exhaustion
 */

export interface RateLimiterConfig {
  /** Maximum number of tokens in the bucket */
  capacity: number;
  /** Rate at which tokens are refilled (tokens per second) */
  refillRate: number;
  /** Initial number of tokens */
  initialTokens?: number;
  /** Enable sliding window for more accurate limiting */
  slidingWindow?: boolean;
  /** Window size in milliseconds for sliding window */
  windowSize?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly config: Required<RateLimiterConfig>;
  private readonly requests: number[] = [];

  constructor(config: RateLimiterConfig) {
    this.config = {
      capacity: config.capacity,
      refillRate: config.refillRate,
      initialTokens: config.initialTokens ?? config.capacity,
      slidingWindow: config.slidingWindow ?? false,
      windowSize: config.windowSize ?? 60000 // 1 minute default
    };
    
    this.tokens = this.config.initialTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Attempts to consume tokens from the bucket
   * @param tokens Number of tokens to consume (default: 1)
   * @returns Rate limit result
   */
  consume(tokens: number = 1): RateLimitResult {
    const now = Date.now();
    
    // Refill tokens based on elapsed time
    this.refillTokens(now);
    
    if (this.config.slidingWindow) {
      return this.consumeWithSlidingWindow(tokens, now);
    }
    
    return this.consumeTokenBucket(tokens, now);
  }

  private refillTokens(now: number): void {
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.config.refillRate;
    
    this.tokens = Math.min(this.config.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  private consumeTokenBucket(tokens: number, now: number): RateLimitResult {
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return {
        allowed: true,
        remaining: Math.floor(this.tokens),
        resetTime: now + ((this.config.capacity - this.tokens) / this.config.refillRate) * 1000
      };
    }
    
    const retryAfter = Math.ceil((tokens - this.tokens) / this.config.refillRate * 1000);
    return {
      allowed: false,
      remaining: Math.floor(this.tokens),
      resetTime: now + retryAfter,
      retryAfter
    };
  }

  private consumeWithSlidingWindow(tokens: number, now: number): RateLimitResult {
    // Clean old requests outside the window
    const windowStart = now - this.config.windowSize;
    while (this.requests.length > 0 && this.requests[0] < windowStart) {
      this.requests.shift();
    }
    
    if (this.requests.length + tokens <= this.config.capacity) {
      for (let i = 0; i < tokens; i++) {
        this.requests.push(now);
      }
      
      return {
        allowed: true,
        remaining: this.config.capacity - this.requests.length,
        resetTime: this.requests[0] + this.config.windowSize
      };
    }
    
    return {
      allowed: false,
      remaining: this.config.capacity - this.requests.length,
      resetTime: this.requests[0] + this.config.windowSize,
      retryAfter: this.requests[0] + this.config.windowSize - now
    };
  }

  /**
   * Gets current bucket status
   */
  getStatus(): { tokens: number; capacity: number; refillRate: number } {
    this.refillTokens(Date.now());
    return {
      tokens: Math.floor(this.tokens),
      capacity: this.config.capacity,
      refillRate: this.config.refillRate
    };
  }

  /**
   * Resets the rate limiter to initial state
   */
  reset(): void {
    this.tokens = this.config.initialTokens;
    this.lastRefill = Date.now();
    this.requests.length = 0;
  }
}

/**
 * Global rate limiter registry for managing multiple limiters
 */
export class RateLimiterRegistry {
  private limiters = new Map<string, TokenBucketRateLimiter>();

  /**
   * Gets or creates a rate limiter for a specific key
   */
  getLimiter(key: string, config: RateLimiterConfig): TokenBucketRateLimiter {
    if (!this.limiters.has(key)) {
      this.limiters.set(key, new TokenBucketRateLimiter(config));
    }
    return this.limiters.get(key)!;
  }

  /**
   * Removes a rate limiter
   */
  removeLimiter(key: string): boolean {
    return this.limiters.delete(key);
  }

  /**
   * Clears all rate limiters
   */
  clear(): void {
    this.limiters.clear();
  }

  /**
   * Gets all active limiter keys
   */
  getKeys(): string[] {
    return Array.from(this.limiters.keys());
  }
}

// Global registry instance
export const globalRateLimiterRegistry = new RateLimiterRegistry();
