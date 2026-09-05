const express = require('express');
const router = express.Router();
const pool = require('../db/dbPromise');

// GET /categories - Get all categories
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name FROM categories ORDER BY name ASC');
        res.json({
            status: 'success',
            data: rows
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// POST /categories - Create a new category
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        const trimmedName = (name || '').trim();

        if (!trimmedName) {
            return res.status(400).json({ status: 'error', message: 'Category name is required' });
        }

        const [result] = await pool.query('INSERT INTO categories (name) VALUES (?)', [trimmedName]);
        res.status(201).json({
            status: 'success',
            message: 'Category created successfully',
            data: {
                id: result.insertId,
                name: trimmedName
            }
        });
    } catch (err) {
        console.error('Error creating category:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ status: 'error', message: 'This category already exists' });
        }
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// DELETE /categories/:id - Delete a category
router.delete('/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;

        // Check if products exist in this category
        const [products] = await pool.query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [categoryId]);
        if (products[0].count > 0) {
            return res.status(400).json({
                status: 'error',
                message: `Cannot delete category: ${products[0].count} product(s) are assigned to it.`
            });
        }

        const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Category not found' });
        }

        res.json({
            status: 'success',
            message: 'Category deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

module.exports = router;
