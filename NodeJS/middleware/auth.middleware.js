/**
 * Authentication and Role-based Authorization Middlewares
 */

/**
 * Ensures the user has an active customer or admin session.
 * Supports both Passport Google OAuth sessions and traditional email/password sessions.
 */
function isCustomerAuthenticated(req, res, next) {
    const isPassportAuth = req.isAuthenticated && req.isAuthenticated();
    const hasSessionUser = req.session && req.session.user;

    if (isPassportAuth || hasSessionUser) {
        if (!req.user && hasSessionUser) {
            req.user = req.session.user;
        }
        return next();
    }

    if (req.xhr || req.headers.accept?.includes('json') || req.path.startsWith('/api') || req.path.startsWith('/order') || req.path.startsWith('/user')) {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication required. Please sign in to access this resource.'
        });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5500/FrontEnd';
    return res.redirect(`${frontendUrl}/login/login.html?error=unauthorized`);
}

/**
 * Ensures the requester is authorized as an administrator.
 * Validates role === 'admin' in session OR a valid X-Admin-Key header.
 */
function isAdminAuthenticated(req, res, next) {
    // 1. Check session role (Passport or manual session)
    const role = req.user?.role || req.session?.user?.role;
    if (role === 'admin') {
        return next();
    }

    // 2. Check X-Admin-Key header (for admin portal API access & automated scripts)
    const adminKey = req.headers['x-admin-key'] || req.query['adminKey'];
    const configuredKey = process.env.ADMIN_KEY || process.env.ADMIN_SECRET_KEY || 'jj-admin-supersecret-2026';
    if (adminKey && adminKey === configuredKey) {
        return next();
    }

    return res.status(403).json({
        status: 'error',
        message: 'Access denied. Administrator privileges are required.'
    });
}

module.exports = {
    isCustomerAuthenticated,
    isAdminAuthenticated
};
