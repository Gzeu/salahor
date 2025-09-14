import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { createClient } from 'redis';

class RateLimiter {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.useRedis = options.redisUrl !== undefined;
        this.redisClient = null;
        this.limiters = new Map();
        this.defaultLimits = {
            // Default rate limits (per window)
            windowMs: 60 * 1000, // 1 minute
            max: 100, // Limit each IP to 100 requests per windowMs
            message: 'Too many requests, please try again later.',
            statusCode: 429,
            keyPrefix: 'rl',
            ...options.defaults
        };

        // Initialize Redis client if Redis URL is provided
        if (this.useRedis) {
            this.redisClient = createClient({
                url: options.redisUrl,
                enable_offline_queue: false,
                ...(options.redisOptions || {})
            });

            this.redisClient.on('error', (err) => {
                console.error('Redis error:', err);
            });
        }
    }

    /**
     * Get or create a rate limiter for a specific key and type
     */
    getLimiter(key, type = 'global') {
        const cacheKey = `${type}:${key}`;
        
        if (this.limiters.has(cacheKey)) {
            return this.limiters.get(cacheKey);
        }

        const config = {
            ...this.defaultLimits,
            ...(type === 'ws' ? {
                // More lenient limits for WebSocket connections
                windowMs: 5 * 60 * 1000, // 5 minutes
                max: 1000, // 1000 messages per 5 minutes
                keyPrefix: 'ws_rl'
            } : type === 'auth' ? {
                // Stricter limits for authentication endpoints
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 10, // 10 login attempts per 15 minutes
                keyPrefix: 'auth_rl',
                message: 'Too many login attempts, please try again later.'
            } : {
                // Default HTTP API limits
                keyPrefix: 'http_rl'
            })
        };

        // Use Redis for distributed rate limiting in production
        const limiter = this.useRedis
            ? new RateLimiterRedis({
                storeClient: this.redisClient,
                keyPrefix: config.keyPrefix,
                points: config.max,
                duration: config.windowMs / 1000, // Convert to seconds
                blockDuration: config.blockDuration || 0, // Block for the rest of the window
                inmemoryBlockOnConsumed: config.max + 1,
                inmemoryBlockDuration: config.windowMs / 1000,
                insuranceLimiter: new RateLimiterMemory({
                    points: config.max * 2,
                    duration: 1, // 1 second
                }),
            })
            : new RateLimiterMemory({
                points: config.max,
                duration: config.windowMs / 1000,
                blockDuration: config.blockDuration ? config.blockDuration / 1000 : 0,
            });

        // Store the limiter with its config
        this.limiters.set(cacheKey, { limiter, config });
        return { limiter, config };
    }

    /**
     * Middleware for Express/HTTP requests
     */
    httpMiddleware(options = {}) {
        return async (req, res, next) => {
            if (!this.enabled) return next();

            try {
                const key = options.keyGenerator ? 
                    options.keyGenerator(req) : 
                    req.ip;
                
                const { limiter, config } = this.getLimiter(
                    key, 
                    options.type || 'http'
                );

                const rateLimitRes = await limiter.consume(key, 1)
                    .catch((rateLimitRes) => rateLimitRes);

                // Set rate limit headers
                res.setHeader('X-RateLimit-Limit', config.max);
                res.setHeader('X-RateLimit-Remaining', rateLimitRes.remainingPoints);
                res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitRes.msBeforeNext / 1000));

                if (rateLimitRes.remainingPoints < 0) {
                    res.setHeader('Retry-After', Math.ceil(rateLimitRes.msBeforeNext / 1000));
                    return res.status(config.statusCode).json({
                        status: 'error',
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: config.message,
                        retryAfter: Math.ceil(rateLimitRes.msBeforeNext / 1000)
                    });
                }

                next();
            } catch (error) {
                console.error('Rate limiter error:', error);
                // Always allow the request if rate limiting fails
                next();
            }
        };
    }

    /**
     * Middleware for WebSocket connections
     */
    wsMiddleware() {
        return async (ws, req, next) => {
            if (!this.enabled) return next();

            try {
                const key = req.headers['x-forwarded-for'] || 
                           req.connection.remoteAddress;
                
                const { limiter } = this.getLimiter(key, 'ws');
                
                // Check rate limit
                const rateLimitRes = await limiter.consume(key, 1)
                    .catch((rateLimitRes) => rateLimitRes);

                if (rateLimitRes.remainingPoints < 0) {
                    ws.close(1008, 'Rate limit exceeded');
                    return;
                }

                // Store rate limit info on the socket for later use
                ws.rateLimit = {
                    limit: rateLimitRes.remainingPoints + 1, // +1 because we just consumed a point
                    remaining: rateLimitRes.remainingPoints,
                    reset: Date.now() + rateLimitRes.msBeforeNext
                };

                next();
            } catch (error) {
                console.error('WebSocket rate limiter error:', error);
                // Allow the connection if rate limiting fails
                next();
            }
        };
    }

    /**
     * Check if a message from a WebSocket connection should be rate limited
     */
    async checkMessageRate(ws, messageSize = 1) {
        if (!this.enabled || !ws.rateLimit) return true;

        try {
            const key = ws._socket.remoteAddress;
            const { limiter } = this.getLimiter(key, 'ws_message');
            
            const rateLimitRes = await limiter.consume(key, messageSize)
                .catch((rateLimitRes) => rateLimitRes);

            if (rateLimitRes.remainingPoints < 0) {
                return {
                    allowed: false,
                    retryAfter: Math.ceil(rateLimitRes.msBeforeNext / 1000),
                    limit: rateLimitRes.remainingPoints + messageSize,
                    remaining: 0,
                    reset: Date.now() + rateLimitRes.msBeforeNext
                };
            }

            return {
                allowed: true,
                limit: rateLimitRes.remainingPoints + messageSize,
                remaining: rateLimitRes.remainingPoints,
                reset: Date.now() + rateLimitRes.msBeforeNext
            };
        } catch (error) {
            console.error('Message rate limiter error:', error);
            // Allow the message if rate limiting fails
            return { allowed: true };
        }
    }

    /**
     * Clean up resources
     */
    async close() {
        if (this.redisClient) {
            await this.redisClient.quit();
        }
    }
}

export default RateLimiter;
