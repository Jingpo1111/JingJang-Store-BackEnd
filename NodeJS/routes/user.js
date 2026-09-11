const express = require('express');
const router = express.Router();
const db = require('../db/database');

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

// ============================================================
// GET /user — Get all users (Admin Dashboard)
// ============================================================
router.get('/', (req, res) => {
    const sql = 'SELECT userid_str AS userId, username, email, register_date AS registerDate FROM users';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });
        res.json({ status: 'success', users: results });
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
            res.json({
                status: 'success',
                userId: u.userid_str,
                username: u.username,
                email: u.email || '',
                registerDate: u.register_date || ''
            });
        } else {
            res.json({ status: 'error', message: 'User not found.' });
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
// POST /user/reset-password — Reset password by email (after OTP verified)
// (mirrors action: "resetPassword" in AuthScript.gs)
// ============================================================
router.post('/reset-password', (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ status: 'error', message: 'Email and new password are required.' });
    }
    if (newPassword.length < 4) {
        return res.status(400).json({ status: 'error', message: 'New password must be at least 4 characters.' });
    }

    const encodedNew = base64Encode(newPassword);
    const sql = 'UPDATE users SET password = ? WHERE LOWER(email) = LOWER(?)';
    db.query(sql, [encodedNew, email], (err, result) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });
        if (result.affectedRows === 0) {
            return res.json({ status: 'error', message: 'Email not found.' });
        }
        res.json({ status: 'success', message: 'Password reset successfully! You can now login.' });
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