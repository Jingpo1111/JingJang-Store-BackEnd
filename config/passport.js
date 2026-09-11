const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const UserModel = require('../models/user.model');

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';

if (!clientID || !clientSecret || clientID === 'your_google_client_id_here') {
    console.warn('⚠️ [Passport] GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET not set in .env. Please set them to enable Google OAuth.');
}

passport.use(
    new GoogleStrategy(
        {
            clientID: clientID || 'MISSING_CLIENT_ID',
            clientSecret: clientSecret || 'MISSING_CLIENT_SECRET',
            callbackURL: callbackURL,
            proxy: true
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Find or create customer using UserModel
                const customer = await UserModel.findOrCreateFromGoogle(profile);
                return done(null, customer);
            } catch (error) {
                console.error('❌ [Passport GoogleStrategy] Error finding/creating customer:', error);
                return done(error, null);
            }
        }
    )
);

// Save ONLY the customer's MySQL `id` in the session cookie
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Fetch customer from MySQL database by `id` on each incoming request (`req.user`)
passport.deserializeUser(async (id, done) => {
    try {
        const customer = await UserModel.findById(id);
        if (!customer) {
            return done(null, false);
        }
        done(null, customer);
    } catch (error) {
        console.error('❌ [Passport] Error in deserializeUser:', error);
        done(error, null);
    }
});

module.exports = passport;
