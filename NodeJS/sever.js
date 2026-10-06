const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const app = express();



require('./db/database');
require('./db/dbPromise');

// Passport configuration
require('./config/passport');

// ============================================================
// Security Hardening Headers (Helmet Equivalent)
// ============================================================
app.disable('x-powered-by');
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// CORS configuration with strict domain whitelisting
const allowedOrigins = [
    'https://www.jingjangstore.com',
    'https://jingjangstore.com',
    'https://admin.jingjangstore.com',
    'https://jingjang-store-admin.vercel.app',
    'https://jingjang-store.vercel.app',
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL
].filter(Boolean);

if (process.env.ALLOWED_ORIGINS) {
    allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()));
}

const isOriginAllowed = (origin) => {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
    if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) return true;
    if (/^https:\/\/[a-zA-Z0-9_-]+\.github\.io$/.test(origin)) return true;
    return false;
};

const corsOptions = {
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-admin-key',
        'X-Admin-Key',
        'Accept',
        'Origin',
        'X-Requested-With'
    ]
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));      // allow large base64 receipt images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust reverse proxy when deployed (e.g. Render, Heroku)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// MySQL Session Store (Replaces MemoryStore for production scalability)
const MySQLStore = require('express-mysql-session')(session);
const pool = require('./db/dbPromise');
const sessionStore = new MySQLStore({
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000, // Clear expired every 15 min
    expiration: 24 * 60 * 60 * 1000,         // 1 day
    createDatabaseTable: true
}, pool);

// Express Session Middleware with hardened security flags
app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'jingjang-store-session-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport & Session
app.use(passport.initialize());
app.use(passport.session());

// Normalize session user so req.user is available for both OAuth and password users
app.use((req, res, next) => {
    if (!req.user && req.session && req.session.user) {
        req.user = req.session.user;
    }
    next();
});

// ============================================================
// Rate Limiting & Security Middlewares
// ============================================================
const { authLimiter, otpLimiter, apiLimiter } = require('./middleware/rateLimiter.js');

// ============================================================
// Routes
// ============================================================
const authRouter = require('./routes/auth.routes.js');
const userRouter = require('./routes/user.routes.js');
const orderRouter = require('./routes/order.routes.js');
const otpRouter = require('./routes/otp.routes.js');
const categoryRouter = require('./routes/category.routes.js');
const productRouter = require('./routes/product.routes.js');
const { router: promotionRouter } = require('./routes/promotion.routes.js');

app.use('/auth', authLimiter, authRouter);
app.use('/otp', otpLimiter, otpRouter);
app.use('/user', apiLimiter, userRouter);
app.use('/order', apiLimiter, orderRouter);
app.use('/categories', apiLimiter, categoryRouter);
app.use('/products', apiLimiter, productRouter);
app.use('/promotion', apiLimiter, promotionRouter);

// Serve Frontend & Admin static assets
const path = require('path');
const frontendPath = path.join(__dirname, '../../FrontEnd');
const adminPath = path.join(__dirname, '../../Admin-JingJang');
app.use('/FrontEnd', express.static(frontendPath));
app.use('/admin', express.static(adminPath));
app.use('/Admin-JingJang', express.static(adminPath));
app.use(express.static(frontendPath));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'JingJang Store API is running.',
        user: req.user ? req.user.name : null
    });
});

// 404 Handler for undefined API routes
app.use((req, res, next) => {
    const apiPrefixes = ['/api', '/auth', '/user', '/order', '/otp', '/categories', '/products', '/promotion'];
    if (apiPrefixes.some(prefix => req.path.startsWith(prefix))) {
        return res.status(404).json({
            status: 'error',
            message: `API route ${req.method} ${req.originalUrl} not found.`
        });
    }
    next();
});

// Central Error Handler Middleware
app.use((err, req, res, next) => {
    console.error('💥 Unhandled Server Error:', err);
    if (res.headersSent) {
        return next(err);
    }
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        status: 'error',
        message: err.message || 'Internal Server Error'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
