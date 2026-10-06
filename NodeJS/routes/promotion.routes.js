const express = require('express');
const router = express.Router();
const pool = require('../db/dbPromise');
const { isAdminAuthenticated } = require('../middleware/auth.middleware');

// ============================================================
// Helper: Calculate discount amount given promo and subtotal
// ============================================================
function calculateDiscount(promo, subtotal) {
    let discount = 0;
    const val = parseFloat(promo.discount_value) || 0;
    const sub = parseFloat(subtotal) || 0;

    if (promo.discount_type === 'percentage') {
        discount = (sub * val) / 100;
        if (promo.max_discount !== null && promo.max_discount !== undefined) {
            const maxCap = parseFloat(promo.max_discount);
            if (!isNaN(maxCap) && maxCap > 0) {
                discount = Math.min(discount, maxCap);
            }
        }
    } else {
        // fixed dollar amount
        discount = Math.min(val, sub);
    }

    return Math.max(0, Math.round(discount * 100) / 100);
}

// ============================================================
// POST /promotion/validate
// Public endpoint for checkout: validates promo code against subtotal
// ============================================================
router.post('/validate', async (req, res) => {
    try {
        const { code, subtotal } = req.body;

        if (!code || typeof code !== 'string') {
            return res.status(400).json({ status: 'error', message: 'Promo code is required.' });
        }

        const cleanCode = code.trim().toUpperCase();
        const numSubtotal = parseFloat(subtotal);

        if (isNaN(numSubtotal) || numSubtotal <= 0) {
            return res.status(400).json({ status: 'error', message: 'Valid cart subtotal is required.' });
        }

        const [rows] = await pool.query('SELECT * FROM promotions WHERE code = ?', [cleanCode]);

        if (rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                valid: false,
                message: `Promo code "${cleanCode}" is invalid.`
            });
        }

        const promo = rows[0];

        // Check if active
        if (!promo.is_active) {
            return res.status(400).json({
                status: 'error',
                valid: false,
                message: `Promo code "${cleanCode}" is no longer active.`
            });
        }

        // Check date range
        const now = new Date();
        if (promo.start_date && new Date(promo.start_date) > now) {
            return res.status(400).json({
                status: 'error',
                valid: false,
                message: `Promo code "${cleanCode}" is not yet active.`
            });
        }

        if (promo.end_date && new Date(promo.end_date) < now) {
            return res.status(400).json({
                status: 'error',
                valid: false,
                message: `Promo code "${cleanCode}" has expired.`
            });
        }

        // Check usage limit
        if (promo.usage_limit !== null && promo.used_count >= promo.usage_limit) {
            return res.status(400).json({
                status: 'error',
                valid: false,
                message: `Promo code "${cleanCode}" has reached its maximum usage limit.`
            });
        }

        // Check minimum order amount
        const minAmount = parseFloat(promo.min_order_amount) || 0;
        if (numSubtotal < minAmount) {
            return res.status(400).json({
                status: 'error',
                valid: false,
                message: `Promo code "${cleanCode}" requires a minimum order of $${minAmount.toFixed(2)}. (Current subtotal: $${numSubtotal.toFixed(2)})`
            });
        }

        // Calculate discount
        const discountAmount = calculateDiscount(promo, numSubtotal);
        const finalTotal = Math.max(0, Math.round((numSubtotal - discountAmount) * 100) / 100);

        return res.json({
            status: 'success',
            valid: true,
            code: promo.code,
            description: promo.description || '',
            discountType: promo.discount_type,
            discountValue: parseFloat(promo.discount_value),
            discountAmount: discountAmount,
            originalSubtotal: numSubtotal,
            finalTotal: finalTotal,
            message: promo.discount_type === 'percentage'
                ? `Coupon "${promo.code}" applied: ${parseFloat(promo.discount_value)}% off (-$${discountAmount.toFixed(2)})`
                : `Coupon "${promo.code}" applied: -$${discountAmount.toFixed(2)} off`
        });

    } catch (err) {
        console.error('Error validating promo code:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error while validating code.' });
    }
});

// ============================================================
// GET /promotion — Get all promotions (Admin Only)
// ============================================================
router.get('/', isAdminAuthenticated, async (req, res) => {
    try {
        const [promotions] = await pool.query('SELECT * FROM promotions ORDER BY id DESC');
        res.json({
            status: 'success',
            promotions: promotions.map(p => ({
                id: p.id,
                code: p.code,
                description: p.description,
                discount_type: p.discount_type,
                discount_value: parseFloat(p.discount_value),
                min_order_amount: parseFloat(p.min_order_amount || 0),
                max_discount: p.max_discount ? parseFloat(p.max_discount) : null,
                usage_limit: p.usage_limit,
                used_count: p.used_count || 0,
                start_date: p.start_date,
                end_date: p.end_date,
                is_active: Boolean(p.is_active),
                created_at: p.created_at
            }))
        });
    } catch (err) {
        console.error('Error fetching promotions:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// ============================================================
// POST /promotion — Create a new promo code (Admin Only)
// ============================================================
router.post('/', isAdminAuthenticated, async (req, res) => {
    try {
        const {
            code,
            description,
            discount_type,
            discount_value,
            min_order_amount,
            max_discount,
            usage_limit,
            start_date,
            end_date,
            is_active
        } = req.body;

        if (!code || !discount_type || discount_value === undefined) {
            return res.status(400).json({
                status: 'error',
                message: 'Code, discount_type (percentage/fixed), and discount_value are required.'
            });
        }

        const cleanCode = code.trim().toUpperCase();
        if (!['percentage', 'fixed'].includes(discount_type)) {
            return res.status(400).json({
                status: 'error',
                message: 'discount_type must be either "percentage" or "fixed".'
            });
        }

        const numVal = parseFloat(discount_value);
        if (isNaN(numVal) || numVal <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'discount_value must be a positive number.'
            });
        }

        if (discount_type === 'percentage' && numVal > 100) {
            return res.status(400).json({
                status: 'error',
                message: 'Percentage discount cannot exceed 100%.'
            });
        }

        // Check if code already exists
        const [existing] = await pool.query('SELECT id FROM promotions WHERE code = ?', [cleanCode]);
        if (existing.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: `Promo code "${cleanCode}" already exists.`
            });
        }

        const sql = `
            INSERT INTO promotions 
            (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, start_date, end_date, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(sql, [
            cleanCode,
            description || null,
            discount_type,
            numVal,
            parseFloat(min_order_amount) || 0.00,
            max_discount ? parseFloat(max_discount) : null,
            usage_limit ? parseInt(usage_limit, 10) : null,
            start_date ? new Date(start_date) : new Date(),
            end_date ? new Date(end_date) : null,
            is_active === undefined ? 1 : (is_active ? 1 : 0)
        ]);

        res.status(201).json({
            status: 'success',
            message: `Promo code "${cleanCode}" created successfully.`,
            id: result.insertId
        });

    } catch (err) {
        console.error('Error creating promo code:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// ============================================================
// PUT /promotion/:id — Update an existing promo code (Admin Only)
// ============================================================
router.put('/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ status: 'error', message: 'Invalid promo ID.' });

        const {
            code,
            description,
            discount_type,
            discount_value,
            min_order_amount,
            max_discount,
            usage_limit,
            start_date,
            end_date,
            is_active
        } = req.body;

        const cleanCode = code ? code.trim().toUpperCase() : undefined;

        // Check uniqueness if code is changed
        if (cleanCode) {
            const [dups] = await pool.query('SELECT id FROM promotions WHERE code = ? AND id != ?', [cleanCode, id]);
            if (dups.length > 0) {
                return res.status(409).json({ status: 'error', message: `Promo code "${cleanCode}" is already in use.` });
            }
        }

        const sql = `
            UPDATE promotions SET
                code = COALESCE(?, code),
                description = COALESCE(?, description),
                discount_type = COALESCE(?, discount_type),
                discount_value = COALESCE(?, discount_value),
                min_order_amount = COALESCE(?, min_order_amount),
                max_discount = ?,
                usage_limit = ?,
                start_date = COALESCE(?, start_date),
                end_date = ?,
                is_active = COALESCE(?, is_active)
            WHERE id = ?
        `;

        const [result] = await pool.query(sql, [
            cleanCode || null,
            description !== undefined ? description : null,
            discount_type || null,
            discount_value !== undefined ? parseFloat(discount_value) : null,
            min_order_amount !== undefined ? parseFloat(min_order_amount) : null,
            max_discount ? parseFloat(max_discount) : null,
            usage_limit ? parseInt(usage_limit, 10) : null,
            start_date ? new Date(start_date) : null,
            end_date ? new Date(end_date) : null,
            is_active !== undefined ? (is_active ? 1 : 0) : null,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Promotion not found.' });
        }

        res.json({ status: 'success', message: 'Promotion updated successfully.' });
    } catch (err) {
        console.error('Error updating promo code:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// ============================================================
// PATCH /promotion/:id/toggle — Toggle active status (Admin Only)
// ============================================================
router.patch('/:id/toggle', isAdminAuthenticated, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ status: 'error', message: 'Invalid promo ID.' });

        const [rows] = await pool.query('SELECT is_active FROM promotions WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ status: 'error', message: 'Promotion not found.' });

        const newStatus = rows[0].is_active ? 0 : 1;
        await pool.query('UPDATE promotions SET is_active = ? WHERE id = ?', [newStatus, id]);

        res.json({
            status: 'success',
            is_active: Boolean(newStatus),
            message: `Promotion is now ${newStatus ? 'active' : 'disabled'}.`
        });
    } catch (err) {
        console.error('Error toggling promo status:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// ============================================================
// DELETE /promotion/:id — Delete a promo code (Admin Only)
// ============================================================
router.delete('/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ status: 'error', message: 'Invalid promo ID.' });

        const [result] = await pool.query('DELETE FROM promotions WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Promotion not found.' });
        }

        res.json({ status: 'success', message: 'Promotion deleted successfully.' });
    } catch (err) {
        console.error('Error deleting promo code:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

module.exports = {
    router,
    calculateDiscount
};
