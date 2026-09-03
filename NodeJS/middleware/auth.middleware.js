/**
 * Middleware to protect customer-only routes (e.g. /my-orders, /checkout)
 * Works for both API requests (returns 401 JSON) and browser navigation (redirects to login).
 */
function isCustomerAuthenticated(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }

    // Check if the request expects JSON or is an API request
    if (req.xhr || req.headers.accept?.includes('json') || req.path.startsWith('/api') || req.path.startsWith('/order')) {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication required. Please sign in to access this resource.'
        });
    }

    // For standard browser page navigation, redirect to login page
    const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5500/FrontEnd';
    return res.redirect(`${frontendUrl}/login/login.html?error=unauthorized`);
}

module.exports = {
    isCustomerAuthenticated
};
