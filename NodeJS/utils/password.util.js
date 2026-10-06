const crypto = require('crypto');

/**
 * Native, zero-dependency, cryptographically secure password hashing using scrypt.
 * Scrypt is memory-hard and NIST/OWASP recommended.
 */

const KEY_LEN = 64;
const SALT_LEN = 16;
const SCRYPT_OPTIONS = {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024
};

/**
 * Hash a plain-text password using crypto.scrypt
 * @param {string} password 
 * @returns {string} Formatted string: $scrypt$N=16384,r=8,p=1$<saltHex>$<hashHex>
 */
function hashPassword(password) {
    if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
    }
    const salt = crypto.randomBytes(SALT_LEN).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, KEY_LEN, SCRYPT_OPTIONS);
    return `$scrypt$N=${SCRYPT_OPTIONS.N},r=${SCRYPT_OPTIONS.r},p=${SCRYPT_OPTIONS.p}$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Verify a plain-text password against a stored hash or legacy Base64 string.
 * @param {string} password - Raw password provided by user
 * @param {string} storedHash - Hash from database
 * @returns {{ valid: boolean, needsUpgrade: boolean }}
 */
function verifyPassword(password, storedHash) {
    if (!password || !storedHash) {
        return { valid: false, needsUpgrade: false };
    }

    // 1. Modern scrypt format
    if (storedHash.startsWith('$scrypt$')) {
        try {
            const parts = storedHash.split('$');
            // Format: ["", "scrypt", "N=16384,r=8,p=1", salt, hash]
            if (parts.length !== 5) {
                return { valid: false, needsUpgrade: false };
            }

            const salt = parts[3];
            const originalHashHex = parts[4];
            const originalHashBuf = Buffer.from(originalHashHex, 'hex');

            const derivedKey = crypto.scryptSync(password, salt, KEY_LEN, SCRYPT_OPTIONS);

            if (derivedKey.length !== originalHashBuf.length) {
                return { valid: false, needsUpgrade: false };
            }

            const isValid = crypto.timingSafeEqual(derivedKey, originalHashBuf);
            return { valid: isValid, needsUpgrade: false };
        } catch (err) {
            console.error('Password verification error:', err);
            return { valid: false, needsUpgrade: false };
        }
    }

    // 2. Legacy Base64 backward compatibility (auto-migrate existing users seamlessly)
    try {
        const decodedLegacy = Buffer.from(storedHash, 'base64').toString('utf8');
        if (decodedLegacy === password) {
            return { valid: true, needsUpgrade: true };
        }
    } catch (e) { }

    // 3. Fallback direct comparison (if plain text was ever stored)
    if (storedHash === password) {
        return { valid: true, needsUpgrade: true };
    }

    return { valid: false, needsUpgrade: false };
}

module.exports = {
    hashPassword,
    verifyPassword
};
