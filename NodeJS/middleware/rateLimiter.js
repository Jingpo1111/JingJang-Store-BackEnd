/**
 * Lightweight, high-performance in-memory Rate Limiting Middleware for Express 5
 * Protects against brute-force attacks, OTP spam, and API denial-of-service.
 */

function createRateLimiter({
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,                  // max requests per windowMs
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    skipFailedRequests = false,
    keyGenerator = (req) => {
        return (
            req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.socket?.remoteAddress ||
            req.ip ||
            'unknown-ip'
        );
    }
} = {}) {
    const hits = new Map();

    // Clean up expired entries every 60 seconds to prevent memory leaks
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, record] of hits.entries()) {
            if (now > record.resetTime) {
                hits.delete(key);
            }
        }
    }, 60 * 1000);

    // Prevent interval from keeping the process alive in tests
    if (cleanupInterval.unref) {
        cleanupInterval.unref();
    }

    return function rateLimiter(req, res, next) {
        const key = keyGenerator(req);
        const now = Date.now();

        let record = hits.get(key);

        if (!record || now > record.resetTime) {
            record = {
                count: 0,
                resetTime: now + windowMs
            };
            hits.set(key, record);
        }

        record.count++;

        const remaining = Math.max(0, max - record.count);
        const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);

        // Standard HTTP RateLimit headers
        res.setHeader('RateLimit-Limit', max);
        res.setHeader('RateLimit-Remaining', remaining);
        res.setHeader('RateLimit-Reset', retryAfterSeconds);

        if (record.count > max) {
            res.setHeader('Retry-After', retryAfterSeconds);
            return res.status(statusCode).json({
                status: 'error',
                message: typeof message === 'function' ? message(req, res) : message,
                retryAfterSeconds
            });
        }

        next();
    };
}

// 1. Strict Limiter for Authentication (Brute-force password guessing defense)
const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,                  // 15 attempts per IP per 15 min
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
});

// 2. Strict Limiter for OTP (Spam, SMS/Email cost, and OTP brute-force defense)
const otpLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 6,                   // 6 requests per IP per 10 min
    message: 'Too many OTP requests from this IP. Please wait a few minutes before trying again.'
});

// 3. General API Limiter (DDoS & scraping defense)
const apiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,                 // 300 requests per IP per 15 min
    message: 'API rate limit exceeded. Please slow down and try again later.'
});

module.exports = {
    createRateLimiter,
    authLimiter,
    otpLimiter,
    apiLimiter
};
