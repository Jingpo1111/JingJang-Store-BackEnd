const express = require('express');
const router = express.Router();
const db = require('../db/database');

// ============================================================
// OTP Routes — mirrors OTP.gs in Google Apps Script
// Uses otp_codes table: email (PK), otp_code, created_at
// ============================================================

// ============================================================
// POST /otp/generate — Generate and store a 6-digit OTP
// Returns the OTP so frontend can send it via EmailJS
// ============================================================
router.post('/generate', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ status: 'ERROR', message: 'Email is required.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Upsert: insert or update if email already exists
    const sql = `
        INSERT INTO otp_codes (email, otp_code, created_at)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE otp_code = VALUES(otp_code), created_at = NOW()
    `;
    db.query(sql, [email, otp], (err) => {
        if (err) return res.status(500).json({ status: 'ERROR', message: err.message });

        // Return OTP to frontend — frontend will send it via EmailJS
        res.json({ status: 'SUCCESS', otp: otp });
    });
});

// ============================================================
// POST /otp/verify — Verify submitted OTP (5-minute expiry)
// ============================================================
router.post('/verify', (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ status: 'FAILED', message: 'Email and OTP are required.' });
    }

    const sql = 'SELECT otp_code, created_at FROM otp_codes WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err) return res.status(500).json({ status: 'FAILED', message: err.message });

        if (results.length === 0) {
            return res.json({ status: 'FAILED', message: 'Email not found.' });
        }

        const record = results[0];
        const createdAt = new Date(record.created_at);
        const now = new Date();
        const diffMs = now - createdAt;
        const FIVE_MINUTES = 5 * 60 * 1000;

        if (diffMs > FIVE_MINUTES) {
            return res.json({ status: 'FAILED', message: 'OTP has expired.' });
        }

        if (record.otp_code.toString() !== otp.toString()) {
            return res.json({ status: 'FAILED', message: 'Invalid OTP.' });
        }

        // OTP correct — clear it so it can't be reused
        db.query('UPDATE otp_codes SET otp_code = NULL WHERE email = ?', [email], () => {});

        res.json({ status: 'SUCCESS', message: 'Email verified successfully!' });
    });
});

module.exports = router;
