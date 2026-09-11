const crypto = require('crypto');

// Expiration for password reset token: 10 minutes (600 seconds)
const RESET_TOKEN_EXPIRY_SECONDS = 10 * 60;

/**
 * Generate a cryptographically signed HMAC token for password resets.
 * Format: base64url(email|expiresAt|salt|hmac)
 * @param {string} email
 * @returns {{ token: string, expiresAt: number, expiresInSeconds: number }}
 */
function generateResetToken(email) {
    const secret = process.env.SESSION_SECRET || 'jingjang-store-session-secret-2026';
    const expiresAt = Date.now() + (RESET_TOKEN_EXPIRY_SECONDS * 1000);
    const randomSalt = crypto.randomBytes(16).toString('hex');
    const cleanEmail = email.trim().toLowerCase();
    const rawData = `${cleanEmail}|${expiresAt}|${randomSalt}`;
    const hmac = crypto.createHmac('sha256', secret).update(rawData).digest('hex');
    const token = Buffer.from(`${rawData}|${hmac}`).toString('base64url');
    return { token, expiresAt, expiresInSeconds: RESET_TOKEN_EXPIRY_SECONDS };
}

/**
 * Verify HMAC cryptographic signature and expiration of a reset token.
 * @param {string} token
 * @returns {{ valid: boolean, email?: string, message?: string }}
 */
function verifyResetTokenHMAC(token) {
    if (!token || typeof token !== 'string') {
        return { valid: false, message: 'Verification required. Reset token is missing.' };
    }

    try {
        const decoded = Buffer.from(token, 'base64url').toString('utf8');
        const parts = decoded.split('|');
        if (parts.length !== 4) {
            return { valid: false, message: 'Invalid reset token format.' };
        }

        const [tokenEmail, expiresAtStr, randomSalt, receivedHmac] = parts;
        const expiresAt = parseInt(expiresAtStr, 10);

        if (isNaN(expiresAt) || Date.now() > expiresAt) {
            return { valid: false, message: 'Reset token has expired. Please request a new verification code.' };
        }

        const secret = process.env.SESSION_SECRET || 'jingjang-store-session-secret-2026';
        const rawData = `${tokenEmail}|${expiresAtStr}|${randomSalt}`;
        const expectedHmac = crypto.createHmac('sha256', secret).update(rawData).digest('hex');

        const receivedBuffer = Buffer.from(receivedHmac, 'hex');
        const expectedBuffer = Buffer.from(expectedHmac, 'hex');

        if (receivedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) {
            return { valid: false, message: 'Invalid reset token signature.' };
        }

        return { valid: true, email: tokenEmail };
    } catch (err) {
        return { valid: false, message: 'Failed to parse reset token.' };
    }
}

module.exports = {
    RESET_TOKEN_EXPIRY_SECONDS,
    generateResetToken,
    verifyResetTokenHMAC
};
