interface RateLimitRecord {
    count: number;
    resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up expired records every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
        if (value.resetTime <= now) {
            rateLimitMap.delete(key);
        }
    }
}, 5 * 60 * 1000).unref?.();

/**
 * Check if an IP has exceeded the allowed number of requests
 * @param ip Client IP address or identifier
 * @param maxRequests Maximum allowed requests in the window (default: 5)
 * @param windowMs Time window in milliseconds (default: 10 minutes)
 */
export function checkRateLimit(
    ip: string,
    maxRequests: number = 5,
    windowMs: number = 10 * 60 * 1000
): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || record.resetTime <= now) {
        rateLimitMap.set(ip, {
            count: 1,
            resetTime: now + windowMs,
        });
        return {
            allowed: true,
            remaining: maxRequests - 1,
            resetTime: now + windowMs,
        };
    }

    if (record.count >= maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetTime: record.resetTime,
        };
    }

    record.count += 1;
    return {
        allowed: true,
        remaining: maxRequests - record.count,
        resetTime: record.resetTime,
    };
}
