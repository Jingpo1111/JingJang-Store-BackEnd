const express = require('express');
const router = express.Router();
const passport = require('passport');
const { isCustomerAuthenticated } = require('../middleware/auth.middleware');

// ============================================================
// Dual-Environment Helper: Automatically detect Local vs Deploy
// ============================================================
function getOAuthCallbackUrl(req) {
    const host = req.get('host') || '';
    // If running on local machine (localhost or 127.0.0.1)
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return process.env.GOOGLE_CALLBACK_URL_LOCAL || `http://${host}/auth/google/callback`;
    }
    // If deployed on Render or other production host
    if (process.env.GOOGLE_CALLBACK_URL) {
        return process.env.GOOGLE_CALLBACK_URL;
    }
    const proto = req.get('x-forwarded-proto') || 'https';
    return `${proto}://${host}/auth/google/callback`;
}

function getFrontendRedirectUrl(req) {

    const saved = req.session && req.session.returnTo;
    if (saved) return saved;

    const host = req.get('host') || '';

    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return (process.env.FRONTEND_URL_LOCAL || 'http://127.0.0.1:5500/FrontEnd').trim().replace(/\/$/, '');
    }


    return (process.env.FRONTEND_URL || 'https://jingjang-store.vercel.app').trim().replace(/\/$/, '');
}

// ============================================================
// GET /auth/google — Initiate Google OAuth 2.0 authentication
// ============================================================
router.get('/google', (req, res, next) => {
    // Check if client ID is configured
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'your_google_client_id_here') {
        return res.status(500).send(`
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h2>⚠️ Google OAuth Not Configured</h2>
                <p>Please provide your <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in <code>Backend/NodeJS/.env</code>.</p>
                <p><a href="javascript:history.back()">Go Back</a></p>
            </div>
        `);
    }

    // Save originating frontend address so redirect works accurately (Live Server 5500, port 3000, or Vercel)
    const referer = req.query.redirect || req.get('referer');
    if (referer && req.session) {
        try {
            const refererUrl = new URL(referer);
            let basePath = refererUrl.origin;
            if (refererUrl.pathname.includes('/FrontEnd')) {
                basePath += '/FrontEnd';
            }
            req.session.returnTo = basePath;
        } catch (e) { }
    }

    const callbackURL = getOAuthCallbackUrl(req);

    passport.authenticate('google', {
        callbackURL: callbackURL,
        scope: ['profile', 'email'],
        prompt: 'select_account' // Allow user to choose which Google account to use
    })(req, res, next);
});

// ============================================================
// GET /auth/google/callback — Google OAuth callback handler
// ============================================================
router.get('/google/callback', (req, res, next) => {
    const callbackURL = getOAuthCallbackUrl(req);
    const frontendUrl = getFrontendRedirectUrl(req);

    passport.authenticate('google', { callbackURL: callbackURL }, (err, user, info) => {
        if (err) {
            console.error('❌ Google Auth Error:', err);
            return res.redirect(`${frontendUrl}/login/login.html?error=auth_failed&msg=${encodeURIComponent(err.message)}`);
        }

        if (!user) {
            return res.redirect(`${frontendUrl}/login/login.html?error=access_denied`);
        }

        // Establish login session via express-session
        req.logIn(user, (loginErr) => {
            if (loginErr) {
                console.error('❌ Session Login Error:', loginErr);
                return res.redirect(`${frontendUrl}/login/login.html?error=session_error`);
            }

            // Successfully authenticated!
            // Format registration date from customers.created_at
            const rawDate = user.created_at || new Date();
            const formattedRegDate = new Date(rawDate).toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Phnom_Penh'
            });

            // Redirect to frontend store with user details in query params so localStorage syncs
            const userIdStr = user.userid_str || ('JJ-' + ('0000' + user.id).slice(-4));
            const params = new URLSearchParams({
                auth: 'google_success',
                id: user.id,
                userId: userIdStr,
                name: user.name || '',
                email: user.email || '',
                avatar: user.avatar || '',
                role: user.role || 'customer',
                regDate: formattedRegDate
            });

            return res.redirect(`${frontendUrl}/index.html?${params.toString()}`);
        });
    })(req, res, next);
});

// ============================================================
// GET /auth/current-user — Check currently authenticated user
// ============================================================
router.get('/current-user', (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        const rawDate = req.user.created_at || new Date();
        const formattedRegDate = new Date(rawDate).toLocaleString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Phnom_Penh'
        });

        return res.json({
            status: 'success',
            isAuthenticated: true,
            user: {
                id: req.user.id,
                google_id: req.user.google_id,
                name: req.user.name,
                email: req.user.email,
                avatar: req.user.avatar,
                role: req.user.role,
                userId: req.user.userid_str || ('JJ-' + ('0000' + req.user.id).slice(-4)),
                regDate: formattedRegDate,
                createdAt: rawDate
            }
        });
    }

    res.json({
        status: 'success',
        isAuthenticated: false,
        user: null
    });
});

// ============================================================
// GET /auth/logout — Destroy session and redirect to store home
// ============================================================
router.get('/logout', (req, res, next) => {
    const frontendUrl = getFrontendRedirectUrl(req);

    req.logout((err) => {
        if (err) {
            console.error('⚠️ Logout error:', err);
        }

        if (req.session) {
            req.session.destroy((sessionErr) => {
                if (sessionErr) {
                    console.error('⚠️ Session destruction error:', sessionErr);
                }
                res.clearCookie('connect.sid');

                if (req.xhr || req.headers.accept?.includes('json')) {
                    return res.json({ status: 'success', message: 'Logged out successfully' });
                }
                return res.redirect(`${frontendUrl}/index.html?auth=logged_out`);
            });
        } else {
            res.clearCookie('connect.sid');
            if (req.xhr || req.headers.accept?.includes('json')) {
                return res.json({ status: 'success', message: 'Logged out successfully' });
            }
            return res.redirect(`${frontendUrl}/index.html?auth=logged_out`);
        }
    });
});

// ============================================================
// GET /auth/customer-only — Example route protected by isCustomerAuthenticated
// ============================================================
router.get('/customer-only', isCustomerAuthenticated, (req, res) => {
    res.json({
        status: 'success',
        message: 'You are authenticated as a customer.',
        user: req.user
    });
});

module.exports = router;
