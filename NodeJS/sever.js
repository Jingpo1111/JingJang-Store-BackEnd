const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const app = express();

// Database connections
require('./db/database');
require('./db/dbPromise');

// Passport configuration
require('./config/passport');

// CORS configuration (allow credentials for cross-origin cookies)
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));      // allow large base64 receipt images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Express Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'jingjang-store-session-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set to true if served over HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport & Session
app.use(passport.initialize());
app.use(passport.session());

// ============================================================
// Routes
// ============================================================
const authRouter = require('./routes/auth.routes.js');
const userRouter = require('./routes/user.js');
const orderRouter = require('./routes/order.js');
const otpRouter = require('./routes/otp.js');
const categaryRouter = require('./routes/Categary.js');

app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/order', orderRouter);
app.use('/otp', otpRouter);
app.use('/categary', categaryRouter);

// Serve Frontend static assets
const path = require('path');
const frontendPath = path.join(__dirname, '../../FrontEnd');
app.use('/FrontEnd', express.static(frontendPath));
app.use(express.static(frontendPath));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'JingJang Store API is running.',
        user: req.user ? req.user.name : null
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
