const pool = require('../db/dbPromise');

// Helper to generate JJ-XXXX formatted IDs matching the store convention
function generateUserIdStr(num) {
    return 'JJ-' + ('0000' + num).slice(-4);
}

class UserModel {
    /**
     * Find customer in `customers` table by Google ID
     * @param {string} googleId
     */
    static async findByGoogleId(googleId) {
        const [rows] = await pool.query(
            'SELECT * FROM customers WHERE google_id = ? LIMIT 1',
            [googleId]
        );
        return rows.length ? rows[0] : null;
    }

    /**
     * Find customer in `customers` table by primary key ID
     * @param {number|string} id
     */
    static async findById(id) {
        const [rows] = await pool.query(
            'SELECT * FROM customers WHERE id = ? LIMIT 1',
            [id]
        );
        if (!rows.length) return null;

        const customer = rows[0];

        // Also fetch corresponding userid_str from `users` table for seamless order tracking
        try {
            const [userRows] = await pool.query(
                'SELECT userid_str FROM users WHERE google_id = ? OR email = ? LIMIT 1',
                [customer.google_id, customer.email]
            );
            customer.userid_str = userRows.length ? userRows[0].userid_str : ('JJ-' + ('0000' + customer.id).slice(-4));
        } catch (e) {
            customer.userid_str = 'JJ-' + ('0000' + customer.id).slice(-4);
        }

        return customer;
    }

    /**
     * Find customer by email in `customers` table
     * @param {string} email
     */
    static async findByEmail(email) {
        const [rows] = await pool.query(
            'SELECT * FROM customers WHERE LOWER(email) = LOWER(?) LIMIT 1',
            [email]
        );
        return rows.length ? rows[0] : null;
    }

    /**
     * Create a new record in `customers` table
     */
    static async createCustomer({ google_id, name, email, avatar, role = 'customer' }) {
        const [result] = await pool.query(
            'INSERT INTO customers (google_id, name, email, avatar, role) VALUES (?, ?, ?, ?, ?)',
            [google_id, name, email, avatar, role]
        );
        return {
            id: result.insertId,
            google_id,
            name,
            email,
            avatar,
            role
        };
    }

    /**
     * Update customer profile info
     */
    static async updateCustomer(id, { name, avatar }) {
        await pool.query(
            'UPDATE customers SET name = COALESCE(?, name), avatar = COALESCE(?, avatar) WHERE id = ?',
            [name, avatar, id]
        );
    }

    /**
     * Synchronize with the `users` table so old technology (orders, admin, profile)
     * recognizes the Google customer with a `JJ-XXXX` userId.
     */
    static async syncWithUsersTable({ google_id, name, email, avatar, role = 'customer' }) {
        try {
            // Check if user already exists by google_id or email
            const [existing] = await pool.query(
                'SELECT userid, userid_str, username, email, google_id FROM users WHERE google_id = ? OR LOWER(email) = LOWER(?) LIMIT 1',
                [google_id, email]
            );

            if (existing.length > 0) {
                const u = existing[0];
                // Update google_id and avatar if missing
                await pool.query(
                    'UPDATE users SET google_id = COALESCE(google_id, ?), avatar = COALESCE(?, avatar), role = COALESCE(role, ?) WHERE userid = ?',
                    [google_id, avatar, role, u.userid]
                );
                return u.userid_str;
            }

            // Otherwise, assign next JJ-XXXX and insert
            const [countResult] = await pool.query('SELECT COUNT(*) AS cnt FROM users');
            const newNum = (countResult[0].cnt || 0) + 1;
            const newUserIdStr = generateUserIdStr(newNum);

            // Clean username for users table (must be unique)
            let baseUsername = (name || email.split('@')[0]).replace(/\s+/g, '_');
            let candidateUsername = baseUsername;
            const [nameMatches] = await pool.query(
                'SELECT username FROM users WHERE username = ? LIMIT 1',
                [candidateUsername]
            );
            if (nameMatches.length > 0) {
                candidateUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
            }

            await pool.query(
                'INSERT INTO users (userid_str, username, password, email, google_id, avatar, role, register_date) VALUES (?, ?, NULL, ?, ?, ?, ?, NOW())',
                [newUserIdStr, candidateUsername, email, google_id, avatar, role]
            );

            return newUserIdStr;
        } catch (err) {
            console.error('⚠️ Warning: Failed to sync with `users` table:', err.message);
            return null;
        }
    }

    /**
     * Find or create customer from Google OAuth profile
     * Satisfies Requirement 3a:
     * - Check if `google_id` exists in MySQL database.
     * - If they exist, log them in.
     * - If not, create a new customer account in MySQL with their Google details.
     * - Also synchronizes with `users` table so old order/profile routes work seamlessly.
     */
    static async findOrCreateFromGoogle(profile) {
        const google_id = profile.id;
        const name = profile.displayName || 
            (profile.name ? `${profile.name.givenName || ''} ${profile.name.familyName || ''}`.trim() : 'Google User');
        const email = (profile.emails && profile.emails[0]) ? profile.emails[0].value : null;
        const avatar = (profile.photos && profile.photos[0]) ? profile.photos[0].value : null;

        if (!google_id) {
            throw new Error('Google profile did not provide an ID');
        }

        // 1. Check if customer exists by google_id
        let customer = await this.findByGoogleId(google_id);

        if (customer) {
            // Update avatar or name if they changed
            if (avatar && avatar !== customer.avatar) {
                await this.updateCustomer(customer.id, { name, avatar });
                customer.avatar = avatar;
                customer.name = name;
            }
        } else if (email) {
            // Check if customer exists with the same email
            const existingByEmail = await this.findByEmail(email);
            if (existingByEmail) {
                // Link account
                await pool.query(
                    'UPDATE customers SET google_id = ?, avatar = COALESCE(?, avatar) WHERE id = ?',
                    [google_id, avatar, existingByEmail.id]
                );
                customer = await this.findById(existingByEmail.id);
            }
        }

        // If still not found, create new customer
        if (!customer) {
            customer = await this.createCustomer({
                google_id,
                name,
                email: email || `${google_id}@google.user`,
                avatar,
                role: 'customer'
            });
        }

        // 2. Synchronize with `users` table for seamless integration with old tech
        const userIdStr = await this.syncWithUsersTable({
            google_id,
            name,
            email: customer.email,
            avatar,
            role: customer.role || 'customer'
        });

        customer.userid_str = userIdStr || ('JJ-' + ('0000' + customer.id).slice(-4));

        return customer;
    }
}

module.exports = UserModel;
