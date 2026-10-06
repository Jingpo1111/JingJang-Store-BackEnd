const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verifyResetTokenHMAC } = require('../utils/token.util');
const { hashPassword, verifyPassword } = require('../utils/password.util');
const { isAdminAuthenticated } = require('../middleware/auth.middleware');

// ============================================================
// Helper: Generate User ID like JJ-0001, JJ-0002...
// ============================================================
function generateUserId(lastCount) {
    return 'JJ-' + ('0000' + lastCount).slice(-4);
}

// ============================================================
// GET /user — Get all users (Admin Dashboard Only)
// Protected by isAdminAuthenticated
// ============================================================
router.get('/', isAdminAuthenticated, (req, res) => {
    const sql = 'SELECT userid_str AS userId, username, email, role, register_date AS registerDate FROM users ORDER BY userid DESC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });
        const formatted = results.map(u => {
            const d = u.registerDate ? new Date(u.registerDate) : null;
            const formattedDate = (d && !isNaN(d.getTime())) ? d.toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Phnom_Penh'
            }) : (u.registerDate || '-');
            return {
                ...u,
                registerDate: formattedDate
            };
        });
        res.json({ status: 'success', users: formatted });
    });
});

// ============================================================
// POST /user/check-register — Check if username or email is already taken
// ============================================================
router.post('/check-register', (req, res) => {
    const { username, email } = req.body;

    if (!username || !email) {
        return res.status(400).json({ status: 'error', message: 'Username and email are required.' });
    }

    const sql = 'SELECT username, email FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)';
    db.query(sql, [username.trim(), email.trim()], (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });

        if (results.length > 0) {
            const found = results[0];
            if (found.username.toLowerCase() === username.trim().toLowerCase()) {
                return res.json({ status: 'error', message: 'Username already exists. Please choose another.' });
            }
            if (found.email.toLowerCase() === email.trim().toLowerCase()) {
                return res.json({ status: 'error', message: 'Email already registered. Please use another email.' });
            }
        }

        res.json({ status: 'success', message: 'Username and email are available.' });
    });
});

// ============================================================
// POST /user/register — Register new user with strong scrypt hashing
// ============================================================
router.post('/register', (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ status: 'error', message: 'Username, password, and email are required.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters long for security.' });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check if username or email is taken
    const checkSql = 'SELECT username, email FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)';
    db.query(checkSql, [cleanUsername, cleanEmail], (err, existing) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });

        if (existing.length > 0) {
            const found = existing[0];
            if (found.username.toLowerCase() === cleanUsername.toLowerCase()) {
                return res.json({ status: 'error', message: 'Username already exists. Please choose another.' });
            }
            return res.json({ status: 'error', message: 'Email already registered. Please use another email.' });
        }

        // Cryptographically secure password hash using scrypt
        const hashedPassword = hashPassword(password);

        // Count total users to create JJ-XXXX style ID
        db.query('SELECT COUNT(*) AS cnt FROM users', (err2, countResult) => {
            if (err2) return res.status(500).json({ status: 'error', message: err2.message });

            const newNum = (countResult[0].cnt || 0) + 1;
            const userId = generateUserId(newNum);
            const registerDate = new Date().toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Phnom_Penh'
            });

            const insertSql = 'INSERT INTO users (userid_str, username, password, email, role, register_date) VALUES (?, ?, ?, ?, "customer", NOW())';
            db.query(insertSql, [userId, cleanUsername, hashedPassword, cleanEmail], (err3, insertResult) => {
                if (err3) return res.status(500).json({ status: 'error', message: err3.message });

                // Initialize server session
                if (req.session) {
                    req.session.user = {
                        id: insertResult.insertId,
                        userId: userId,
                        username: cleanUsername,
                        email: cleanEmail,
                        role: 'customer'
                    };
                }

                res.status(201).json({
                    status: 'success',
                    action: 'register',
                    userId: userId,
                    username: cleanUsername,
                    email: cleanEmail,
                    registerDate: registerDate,
                    message: 'Registration successful! Your User ID is: ' + userId
                });
            });
        });
    });
});

// ============================================================
// POST /user/login — Login with password verification and session establishment
// Supports auto-migration from legacy Base64 to scrypt
// ============================================================
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ status: 'error', message: 'Username/Email and password are required.' });
    }

    const cleanIdentifier = username.trim();
    const sql = 'SELECT * FROM users WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)) LIMIT 1';

    db.query(sql, [cleanIdentifier, cleanIdentifier], (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });

        if (results.length === 0) {
            return res.status(401).json({ status: 'error', message: 'Invalid username/email or password.' });
        }

        const user = results[0];
        const { valid, needsUpgrade } = verifyPassword(password, user.password);

        if (!valid) {
            return res.status(401).json({ status: 'error', message: 'Invalid username/email or password.' });
        }

        // Seamless security auto-upgrade: hash legacy password to modern scrypt in background
        if (needsUpgrade) {
            try {
                const newHash = hashPassword(password);
                db.query('UPDATE users SET password = ? WHERE userid = ?', [newHash, user.userid], (upErr) => {
                    if (upErr) console.warn('Could not auto-upgrade user password hash:', upErr.message);
                    else console.log(`🔒 Auto-upgraded password hash to scrypt for user ${user.username}`);
                });
            } catch (e) { }
        }

        // Establish secure server-side session
        const sessionPayload = {
            id: user.userid,
            userId: user.userid_str || ('JJ-' + ('0000' + user.userid).slice(-4)),
            username: user.username,
            email: user.email || '',
            role: user.role || 'customer'
        };

        if (req.session) {
            req.session.user = sessionPayload;
        }

        res.json({
            status: 'success',
            action: 'login',
            userId: sessionPayload.userId,
            username: user.username,
            email: user.email || '',
            role: user.role || 'customer',
            registerDate: user.register_date || '',
            message: 'Login successful!'
        });
    });
});

// ============================================================
// POST /user/check-email — Check if email is registered
// ============================================================
router.post('/check-email', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ status: 'error', message: 'Email is required.' });

    const sql = 'SELECT email FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1';
    db.query(sql, [email.trim()], (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });
        if (results.length > 0) {
            res.json({ status: 'success', message: 'Email is registered.' });
        } else {
            res.json({ status: 'error', message: 'Email not found.' });
        }
    });
});

// ============================================================
// POST /user/get-info — Get user info by userId_str
// ============================================================
router.post('/get-info', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ status: 'error', message: 'User ID is required.' });

    const sql = 'SELECT userid_str, username, email, role, register_date FROM users WHERE userid_str = ? LIMIT 1';
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });
        if (results.length > 0) {
            const u = results[0];
            const d = u.register_date ? new Date(u.register_date) : null;
            const formattedDate = (d && !isNaN(d.getTime())) ? d.toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Phnom_Penh'
            }) : (u.register_date || '');

            res.json({
                status: 'success',
                userId: u.userid_str,
                username: u.username,
                email: u.email || '',
                role: u.role || 'customer',
                registerDate: formattedDate,
                rawDate: u.register_date
            });
        } else {
            const custSql = 'SELECT id, google_id, name, email, role, created_at FROM customers WHERE id = ? OR google_id = ? LIMIT 1';
            db.query(custSql, [userId, userId], (custErr, custResults) => {
                if (custErr || custResults.length === 0) {
                    return res.json({ status: 'error', message: 'User not found.' });
                }
                const c = custResults[0];
                const cd = c.created_at ? new Date(c.created_at) : null;
                const formattedDate = (cd && !isNaN(cd.getTime())) ? cd.toLocaleString('en-GB', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Phnom_Penh'
                }) : (c.created_at || '');

                res.json({
                    status: 'success',
                    userId: 'JJ-' + ('0000' + c.id).slice(-4),
                    username: c.name,
                    email: c.email || '',
                    role: c.role || 'customer',
                    registerDate: formattedDate,
                    rawDate: c.created_at
                });
            });
        }
    });
});

// ============================================================
// POST /user/change-password — Change password with verification
// ============================================================
router.post('/change-password', (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({ status: 'error', message: 'All fields are required.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ status: 'error', message: 'New password must be at least 6 characters long.' });
    }

    // Verify current password with scrypt/legacy support
    const sql = 'SELECT userid, password FROM users WHERE userid_str = ? LIMIT 1';
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });
        if (results.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Account not found.' });
        }

        const user = results[0];
        const { valid } = verifyPassword(currentPassword, user.password);
        if (!valid) {
            return res.status(400).json({ status: 'error', message: 'Current password is incorrect.' });
        }

        const hashedNewPassword = hashPassword(newPassword);
        const updateSql = 'UPDATE users SET password = ? WHERE userid_str = ?';
        db.query(updateSql, [hashedNewPassword, userId], (err2) => {
            if (err2) return res.status(500).json({ status: 'error', message: err2.message });
            res.json({ status: 'success', message: 'Password changed successfully!' });
        });
    });
});

// ============================================================
// POST /user/reset-password — Reset password (requires verified resetToken)
// ============================================================
router.post('/reset-password', (req, res) => {
    const { email, newPassword, userId, resetToken } = req.body;

    if (!resetToken) {
        return res.status(401).json({
            status: 'error',
            message: 'Verification required. Please verify your OTP code first.'
        });
    }

    if ((!email && !userId) || !newPassword) {
        return res.status(400).json({ status: 'error', message: 'Email or User ID, and new password are required.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ status: 'error', message: 'New password must be at least 6 characters long.' });
    }

    // Step 1: Verify token cryptographic HMAC signature and timestamp
    const tokenResult = verifyResetTokenHMAC(resetToken);
    if (!tokenResult.valid) {
        return res.status(401).json({ status: 'error', message: tokenResult.message });
    }

    const tokenEmail = tokenResult.email;

    // Step 2: Ensure the target user account matches the verified token's email
    if (email && email.trim().toLowerCase() !== tokenEmail) {
        return res.status(403).json({
            status: 'error',
            message: 'Security error: The reset token does not match the provided email address.'
        });
    }

    // Step 3: Query otp_codes table to verify this reset_token is active, matching, and not expired
    const checkTokenSql = `
        SELECT email, TIMESTAMPDIFF(SECOND, NOW(), token_expires_at) AS remaining_seconds 
        FROM otp_codes 
        WHERE email = ? AND reset_token = ?
    `;

    db.query(checkTokenSql, [tokenEmail, resetToken], (tokErr, tokResults) => {
        if (tokErr) {
            console.error('[ResetPassword] DB token check error:', tokErr.message);
            return res.status(500).json({ status: 'error', message: 'Internal server error verifying token.' });
        }

        if (tokResults.length === 0) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid or already used reset token. Please request a new OTP code.'
            });
        }

        if (tokResults[0].remaining_seconds !== null && tokResults[0].remaining_seconds <= 0) {
            return res.status(401).json({
                status: 'error',
                message: 'Reset token has expired. Please request a new OTP code.'
            });
        }

        // Check user exists in users table and matches token email
        const targetSql = 'SELECT userid, email, userid_str FROM users WHERE LOWER(email) = ? OR userid_str = ?';
        db.query(targetSql, [tokenEmail, userId || ''], (userErr, userResults) => {
            if (userErr) {
                return res.status(500).json({ status: 'error', message: userErr.message });
            }

            if (userResults.length === 0) {
                return res.status(404).json({ status: 'error', message: 'Account not found.' });
            }

            const targetUser = userResults[0];

            if (userId && targetUser.email.toLowerCase() !== tokenEmail) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Security error: The reset token does not match the owner of this User ID.'
                });
            }

            const hashedNewPassword = hashPassword(newPassword);

            // Step 4: Update the password in users table with secure scrypt hash
            const updatePwSql = 'UPDATE users SET password = ? WHERE userid = ?';
            db.query(updatePwSql, [hashedNewPassword, targetUser.userid], (updateErr) => {
                if (updateErr) {
                    return res.status(500).json({ status: 'error', message: updateErr.message });
                }

                // Step 5: Invalidate the token immediately so it CANNOT be replayed
                const invalidateSql = 'UPDATE otp_codes SET reset_token = NULL, token_expires_at = NULL WHERE email = ?';
                db.query(invalidateSql, [tokenEmail], () => { });

                res.json({
                    status: 'success',
                    message: 'Password updated successfully!'
                });
            });
        });
    });
});

// ============================================================
// POST /user/verify-password — Verify password with scrypt / legacy support
// ============================================================
router.post('/verify-password', (req, res) => {
    const { userId, password } = req.body;
    if (!userId || !password) {
        return res.status(400).json({ status: 'error', message: 'User ID and password are required.' });
    }

    const sql = 'SELECT userid, password FROM users WHERE userid_str = ? LIMIT 1';
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });
        if (results.length > 0) {
            const { valid } = verifyPassword(password, results[0].password);
            if (valid) {
                return res.json({ status: 'success', message: 'Password verified.' });
            }
        }
        res.json({ status: 'error', message: 'Incorrect password.' });
    });
});

module.exports = router;