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

// CORS configuration (allow credentials for cross-origin cookies)
app.use(cors({
    origin: true,
    credentials: true
}));

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

// Express Session Middleware
app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'jingjang-store-session-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // works seamlessly on both HTTP and HTTPS
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
const userRouter = require('./routes/user.routes.js');
const orderRouter = require('./routes/order.routes.js');
const otpRouter = require('./routes/otp.routes.js');
const categoryRouter = require('./routes/category.routes.js');
const productRouter = require('./routes/product.routes.js');

app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/order', orderRouter);
app.use('/otp', otpRouter);
app.use('/categories', categoryRouter);
app.use('/products', productRouter);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
