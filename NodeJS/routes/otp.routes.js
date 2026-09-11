const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { generateResetToken, RESET_TOKEN_EXPIRY_SECONDS } = require('../utils/token.util');

// Auto-ensure otp_codes table has reset_token and token_expires_at columns
function ensureOtpColumns() {
    db.query("SHOW COLUMNS FROM otp_codes LIKE 'reset_token'", (err, rows) => {
        if (!err && rows && rows.length === 0) {
            db.query("ALTER TABLE otp_codes ADD COLUMN reset_token VARCHAR(500) DEFAULT NULL", () => { });
        }
    });
    db.query("SHOW COLUMNS FROM otp_codes LIKE 'token_expires_at'", (err, rows) => {
        if (!err && rows && rows.length === 0) {
            db.query("ALTER TABLE otp_codes ADD COLUMN token_expires_at DATETIME DEFAULT NULL", () => { });
        }
    });
}
ensureOtpColumns();

// Cooldown: 60 seconds between resend requests
// Expiration: 5 minutes (300 seconds) validity for the code so users have time to enter it
const COOLDOWN_SECONDS = 60;
const OTP_EXPIRY_SECONDS = 5 * 60; // 5 minutes

let resendClient = null;
function getResend() {
    if (!resendClient && process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_your_api_key_here') {
        const { Resend } = require('resend');
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}

// ============================================================
// POST /otp/generate — Generate and send a 6-digit OTP via Resend
// Enforces 60-second cooldown and 5-minute expiration
// ============================================================
router.post('/generate', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ status: 'ERROR', message: 'Email is required.' });
    }

    // Step 1: Check 60-second cooldown using MySQL's TIMESTAMPDIFF to avoid any clock drift
    const checkSql = 'SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS elapsed_seconds FROM otp_codes WHERE email = ?';
    db.query(checkSql, [email], async (checkErr, results) => {
        if (checkErr) {
            return res.status(500).json({ status: 'ERROR', message: checkErr.message });
        }

        if (results.length > 0 && results[0].elapsed_seconds !== null) {
            const elapsed = results[0].elapsed_seconds;
            if (elapsed < COOLDOWN_SECONDS) {
                const remainingSec = COOLDOWN_SECONDS - elapsed;
                return res.status(429).json({
                    status: 'COOLDOWN',
                    cooldownSeconds: remainingSec,
                    message: `Please wait ${remainingSec}s before requesting a new code.`
                });
            }
        }

        // Step 2: Generate random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Step 3: Upsert into MySQL database
        const upsertSql = `
            INSERT INTO otp_codes (email, otp_code, created_at)
            VALUES (?, ?, NOW())
            ON DUPLICATE KEY UPDATE otp_code = VALUES(otp_code), created_at = NOW()
        `;
        db.query(upsertSql, [email, otp], async (dbErr) => {
            if (dbErr) {
                return res.status(500).json({ status: 'ERROR', message: dbErr.message });
            }

            // Step 4: Dispatch email via Resend
            const resend = getResend();
            if (!resend) {
                console.warn(`[OTP] Resend API key is not configured in .env. Code for ${email} is: ${otp}`);
                return res.status(500).json({
                    status: 'ERROR',
                    message: 'Resend API key not configured yet. Please set RESEND_API_KEY in backend .env'
                });
            }

            try {
                const sender = process.env.RESEND_FROM_EMAIL || 'JingJang Store <noreply@jingjangstore.com>';
                const { data, error } = await resend.emails.send({
                    from: sender,
                    to: [email],
                    subject: `${otp} is your JingJang Store verification code`,
                    html: `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                            <div style="background: #3b665b; padding: 24px; text-align: center;">
                                <img src="https://res.cloudinary.com/k9ybxprb/image/upload/v1788942089/IMG_3840.png" 
                                     alt="JingJang Store Logo" 
                                     width="75" 
                                     height="75" 
                                     style="display: block; margin: 0 auto 12px auto; border-radius: 50%; background: #ffffff; padding: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); object-fit: cover;" />
                                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">JingJang Store</h1>
                            </div>
                            <div style="padding: 32px 24px;">
                                <h2 style="color: #1f2937; font-size: 18px; margin-top: 0; font-weight: 600;">Verification Code</h2>
                                <p style="color: #4b5563; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">
                                    Use the 6-digit verification code below to confirm your request.
                                </p>
                                <div style="background: #f3f4f6; border: 1px dashed #d1d5db; border-radius: 8px; text-align: center; padding: 18px; margin: 20px 0;">
                                    <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #111827; font-family: 'Courier New', monospace;">${otp}</span>
                                </div>
                                <div style="background: #fef2f2; border-left: 4px solid #3b665b; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
                                    <p style="color: #3b665b; font-size: 13px; margin: 0; font-weight: 500;">
                                        ⏳ <strong>Note:</strong> This code will expire in <strong>5 minutes</strong>.
                                    </p>
                                </div>
                                <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-top: 24px;">
                                    If you didn't request this code, you can safely ignore this email. Someone may have entered your email by mistake.
                                </p>
                            </div>
                            <div style="background: #f9fafb; padding: 16px 24px; border-top: 1px solid #e5e7eb; text-align: center;">
                                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                    &copy; ${new Date().getFullYear()} JingJang Store. All rights reserved.
                                </p>
                            </div>
                        </div>
                    `
                });

                if (error) {
                    console.error('Resend API Error:', error);
                    return res.status(500).json({ status: 'ERROR', message: error.message || 'Failed to send OTP email.' });
                }

                return res.json({
                    status: 'SUCCESS',
                    message: 'Verification code sent to your email.',
                    cooldownSeconds: COOLDOWN_SECONDS,
                    expiresInSeconds: OTP_EXPIRY_SECONDS
                });
            } catch (mailErr) {
                console.error('Failed to send email:', mailErr);
                return res.status(500).json({ status: 'ERROR', message: 'Failed to deliver email. Please try again.' });
            }
        });
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

    // Use TIMESTAMPDIFF to precisely check expiration against MySQL's own clock
    const sql = 'SELECT otp_code, TIMESTAMPDIFF(SECOND, created_at, NOW()) AS elapsed_seconds FROM otp_codes WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err) return res.status(500).json({ status: 'FAILED', message: err.message });

        if (results.length === 0 || !results[0].otp_code) {
            return res.json({ status: 'FAILED', message: 'No active OTP found. Please request a new code.' });
        }

        const record = results[0];
        const elapsedSeconds = record.elapsed_seconds !== null ? record.elapsed_seconds : 0;

        // Check 5-minute expiration
        if (elapsedSeconds > OTP_EXPIRY_SECONDS) {
            return res.json({ status: 'FAILED', message: 'OTP has expired. Please request a new code.' });
        }

        if (record.otp_code.toString().trim() !== otp.toString().trim()) {
            return res.json({ status: 'FAILED', message: 'Invalid OTP code. Please try again.' });
        }

        // Generate cryptographically signed, single-use password reset token
        const { token } = generateResetToken(email);

        // OTP verified successfully — clear raw otp_code and save reset_token with 10-minute expiry
        const updateSql = `
            UPDATE otp_codes 
            SET otp_code = NULL, 
                reset_token = ?, 
                token_expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND) 
            WHERE email = ?
        `;
        db.query(updateSql, [token, RESET_TOKEN_EXPIRY_SECONDS, email], (upErr) => {
            if (upErr) {
                console.error('[OTP] Failed to save reset token:', upErr.message);
            }

            res.json({
                status: 'SUCCESS',
                message: 'Email verified successfully!',
                resetToken: token,
                expiresInSeconds: RESET_TOKEN_EXPIRY_SECONDS
            });
        });
    });
});

module.exports = router;
