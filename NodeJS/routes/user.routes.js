const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verifyResetTokenHMAC } = require('../utils/token.util');

// ============================================================
// Helper: base64 encode password (same as Utilities.base64Encode in Apps Script)
// ============================================================
function base64Encode(str) {
    return Buffer.from(str).toString('base64');
}

// ============================================================
// Helper: Generate User ID like JJ-0001, JJ-0002...
// ============================================================
function generateUserId(lastCount) {
    return 'JJ-' + ('0000' + lastCount).slice(-4);
}

// =====================================================
// GET /user — Get all users (Admin Dashboard)
// ============================================================
router.get('/', (req, res) => {
    const sql = 'SELECT userid_str AS userId, username, email, register_date AS registerDate FROM users ORDER BY userid DESC';
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
// (mirrors action: "checkRegister" in AuthScript.gs)
// ============================================================
router.post('/check-register', (req, res) => {
    const { username, email } = req.body;

    if (!username || !email) {
        return res.status(400).json({ status: 'error', message: 'Username and email are required.' });
    }

    const sql = 'SELECT username, email FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)';
    db.query(sql, [username, email], (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });

        if (results.length > 0) {
            const found = results[0];
            if (found.username.toLowerCase() === username.toLowerCase()) {
                return res.json({ status: 'error', message: 'Username already exists. Please choose another.' });
            }
            if (found.email.toLowerCase() === email.toLowerCase()) {
                return res.json({ status: 'error', message: 'Email already registered. Please use another email.' });
            }
        }

        res.json({ status: 'success', message: 'Username and email are available.' });
    });
});

// ============================================================
// POST /user/register — Register new user
// (mirrors action: "register" in AuthScript.gs)
// ============================================================
router.post('/register', (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ status: 'error', message: 'Username, password, and email are required.' });
    }
    if (password.length < 4) {
        return res.status(400).json({ status: 'error', message: 'Password must be at least 4 characters.' });
    }

    // Check if username or email is taken
    const checkSql = 'SELECT username, email FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)';
    db.query(checkSql, [username, email], (err, existing) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });

        if (existing.length > 0) {
            const found = existing[0];
            if (found.username.toLowerCase() === username.toLowerCase()) {
                return res.json({ status: 'error', message: 'Username already exists. Please choose another.' });
            }
            return res.json({ status: 'error', message: 'Email already registered. Please use another email.' });
        }

        const encodedPassword = base64Encode(password);

        // Count total users to create JJ-XXXX style ID
        db.query('SELECT COUNT(*) AS cnt FROM users', (err2, countResult) => {
            if (err2) return res.status(500).json({ status: 'error', message: err2.message });

            const newNum = (countResult[0].cnt || 0) + 1;
            const userId = generateUserId(newNum);
            const registerDate = new Date().toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Phnom_Penh'
            });

            const insertSql = 'INSERT INTO users (userid_str, username, password, email, register_date) VALUES (?, ?, ?, ?, NOW())';
            db.query(insertSql, [userId, username, encodedPassword, email], (err3) => {
                if (err3) return res.status(500).json({ status: 'error', message: err3.message });

                res.status(201).json({
                    status: 'success',
                    action: 'register',
                    userId: userId,
                    username: username,
                    email: email,
                    registerDate: registerDate,
                    message: 'Registration successful! Your User ID is: ' + userId
                });
            });
        });
    });
});

// ============================================================
// POST /user/login — Login by username or email + base64 password
// (mirrors action: "login" in AuthScript.gs)
// ============================================================
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ status: 'error', message: 'Username/Email and password are required.' });
    }

    const encodedPassword = base64Encode(password);
    const sql = 'SELECT * FROM users WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)) AND password = ?';
    db.query(sql, [username, username, encodedPassword], (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });

        if (results.length > 0) {
            const user = results[0];
            res.json({
                status: 'success',
                action: 'login',
                userId: user.userid_str || ('JJ-' + ('0000' + user.userid).slice(-4)),
                username: user.username,
                email: user.email || '',
                registerDate: user.register_date || '',
                message: 'Login successful!'
            });
        } else {
            res.json({ status: 'error', message: 'Invalid username/email or password.' });
        }
    });
});

// ============================================================
// POST /user/check-email — Check if email is registered
// (mirrors action: "checkEmail" in AuthScript.gs)
// ============================================================
router.post('/check-email', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ status: 'error', message: 'Email is required.' });

    const sql = 'SELECT email FROM users WHERE LOWER(email) = LOWER(?)';
    db.query(sql, [email], (err, results) => {
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
// (mirrors action: "getUserInfo" in AuthScript.gs)
// ============================================================
router.post('/get-info', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ status: 'error', message: 'User ID is required.' });

    const sql = 'SELECT userid_str, username, email, register_date FROM users WHERE userid_str = ?';
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
                registerDate: formattedDate,
                rawDate: u.register_date
            });
        } else {
            // Also check customers table if not found by string ID in users
            const custSql = 'SELECT id, google_id, name, email, created_at FROM customers WHERE id = ? OR google_id = ?';
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
                    registerDate: formattedDate,
                    rawDate: c.created_at
                });
            });
        }
    });
});

// ============================================================
// POST /user/change-password — Change password (verify current pw first)
// (mirrors action: "changePassword" in AuthScript.gs)
// ============================================================
router.post('/change-password', (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({ status: 'error', message: 'All fields are required.' });
    }
    if (newPassword.length < 4) {
        return res.status(400).json({ status: 'error', message: 'New password must be at least 4 characters.' });
    }

    const encodedCurrent = base64Encode(currentPassword);
    const encodedNew = base64Encode(newPassword);

    // Verify current password
    const sql = 'SELECT userid FROM users WHERE userid_str = ? AND password = ?';
    db.query(sql, [userId, encodedCurrent], (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });
        if (results.length === 0) {
            return res.json({ status: 'error', message: 'Current password is incorrect.' });
        }

        const updateSql = 'UPDATE users SET password = ? WHERE userid_str = ?';
        db.query(updateSql, [encodedNew, userId], (err2) => {
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
    if (newPassword.length < 4) {
        return res.status(400).json({ status: 'error', message: 'New password must be at least 4 characters.' });
    }

    // Step 1: Verify token cryptographic signature and timestamp
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

            // If userId was provided, ensure its account email matches the tokenEmail
            if (userId && targetUser.email.toLowerCase() !== tokenEmail) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Security error: The reset token does not match the owner of this User ID.'
                });
            }

            const encodedNew = base64Encode(newPassword);

            // Step 4: Update the password in users table
            const updatePwSql = 'UPDATE users SET password = ? WHERE userid = ?';
            db.query(updatePwSql, [encodedNew, targetUser.userid], (updateErr) => {
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
// POST /user/verify-password — Verify password (for logout confirmation)
// (mirrors action: "verifyPassword" in AuthScript.gs)
// ============================================================
router.post('/verify-password', (req, res) => {
    const { userId, password } = req.body;
    if (!userId || !password) {
        return res.status(400).json({ status: 'error', message: 'User ID and password are required.' });
    }

    const encodedPassword = base64Encode(password);
    const sql = 'SELECT userid FROM users WHERE userid_str = ? AND password = ?';
    db.query(sql, [userId, encodedPassword], (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });
        if (results.length > 0) {
            res.json({ status: 'success', message: 'Password verified.' });
        } else {
            res.json({ status: 'error', message: 'Incorrect password.' });
        }
    });
});

module.exports = router;