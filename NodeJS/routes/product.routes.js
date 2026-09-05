const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../db/dbPromise');
const { uploadToCloudinary } = require('../config/cloudinary');

// Setup multer with memory storage (max 10MB per file, max 10 files)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 10
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// ============================================================
// GET /products - Get all products with images and parsed JSON
// ============================================================
router.get('/', async (req, res) => {
    try {
        const [products] = await pool.query(`
            SELECT 
                p.id,
                p.category_id,
                c.name AS category_name,
                p.name,
                p.type,
                p.cart_name,
                p.specs,
                p.price,
                p.color_name,
                p.colors,
                p.created_at
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.id DESC
        `);

        const [images] = await pool.query(`
            SELECT product_id, image_url 
            FROM product_images 
            ORDER BY id ASC
        `);

        // Group images by product_id
        const imageMap = {};
        for (const img of images) {
            if (!imageMap[img.product_id]) {
                imageMap[img.product_id] = [];
            }
            imageMap[img.product_id].push(img.image_url);
        }

        // Format products to match FrontEnd expectations
        const formatted = products.map(p => {
            let specs = p.specs;
            if (typeof specs === 'string') {
                try { specs = JSON.parse(specs); } catch (e) { specs = []; }
            }

            let colors = p.colors;
            if (typeof colors === 'string') {
                try { colors = JSON.parse(colors); } catch (e) { colors = []; }
            }

            const type = p.type || p.category_name || 'General';
            const cartName = p.cart_name || p.name;
            const colorName = p.color_name || `color_prod_${p.id}`;

            return {
                id: p.id,
                category_id: p.category_id,
                category_name: p.category_name || type,
                name: p.name,
                type: type,
                cartName: cartName,
                cart_name: cartName,
                price: parseFloat(p.price) || 0,
                colorName: colorName,
                color_name: colorName,
                specs: Array.isArray(specs) ? specs : [],
                colors: Array.isArray(colors) ? colors : [],
                images: imageMap[p.id] || [],
                created_at: p.created_at
            };
        });

        res.json({
            status: 'success',
            count: formatted.length,
            data: formatted
        });
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// ============================================================
// GET /products/:id - Get a single product by ID
// ============================================================
router.get('/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const [products] = await pool.query(`
            SELECT 
                p.*,
                c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        `, [productId]);

        if (products.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        }

        const p = products[0];
        const [images] = await pool.query('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY id ASC', [productId]);

        let specs = p.specs;
        if (typeof specs === 'string') {
            try { specs = JSON.parse(specs); } catch (e) { specs = []; }
        }

        let colors = p.colors;
        if (typeof colors === 'string') {
            try { colors = JSON.parse(colors); } catch (e) { colors = []; }
        }

        res.json({
            status: 'success',
            data: {
                id: p.id,
                category_id: p.category_id,
                category_name: p.category_name || p.type,
                name: p.name,
                type: p.type || p.category_name || 'General',
                cartName: p.cart_name || p.name,
                cart_name: p.cart_name || p.name,
                price: parseFloat(p.price) || 0,
                colorName: p.color_name || `color_prod_${p.id}`,
                color_name: p.color_name || `color_prod_${p.id}`,
                specs: Array.isArray(specs) ? specs : [],
                colors: Array.isArray(colors) ? colors : [],
                images: images.map(img => img.image_url),
                created_at: p.created_at
            }
        });
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// ============================================================
// POST /products - Create product with Cloudinary multi-image upload
// ============================================================
router.post('/', upload.array('photos', 10), async (req, res) => {
    try {
        const {
            name,
            category_id,
            type,
            cart_name,
            price,
            color_name,
            specs,
            colors
        } = req.body;

        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({ status: 'error', message: 'Product name is required' });
        }
        if (price === undefined || price === null || isNaN(parseFloat(price))) {
            return res.status(400).json({ status: 'error', message: 'Valid price is required' });
        }

        const parsedPrice = parseFloat(price);
        const trimmedName = name.trim();

        // If category_id is provided, fetch category name if type is omitted
        let resolvedType = (type || '').trim();
        let parsedCategoryId = category_id ? parseInt(category_id, 10) : null;

        if (parsedCategoryId && !resolvedType) {
            const [cats] = await pool.query('SELECT name FROM categories WHERE id = ?', [parsedCategoryId]);
            if (cats.length > 0) {
                resolvedType = cats[0].name;
            }
        }

        // Cart name fallback
        const resolvedCartName = (cart_name || '').trim() || trimmedName;

        // Color group name fallback
        const safeSlug = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
        const resolvedColorName = (color_name || '').trim() || `color_${safeSlug}_${Date.now()}`;

        // Parse Specs (can be string array or newline separated text or JSON)
        let parsedSpecs = [];
        if (typeof specs === 'string') {
            try {
                const parsed = JSON.parse(specs);
                parsedSpecs = Array.isArray(parsed) ? parsed : [specs];
            } catch (e) {
                // If not JSON, split by line breaks
                parsedSpecs = specs.split('\n').map(s => s.trim()).filter(Boolean);
            }
        } else if (Array.isArray(specs)) {
            parsedSpecs = specs;
        }

        // Parse Colors (can be JSON string or array of objects)
        let parsedColors = [];
        if (typeof colors === 'string') {
            try {
                const parsed = JSON.parse(colors);
                parsedColors = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                parsedColors = [];
            }
        } else if (Array.isArray(colors)) {
            parsedColors = colors;
        }

        // 1. Upload images to Cloudinary
        const uploadedImageUrls = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const secureUrl = await uploadToCloudinary(file.buffer, 'jingjang_store/products');
                uploadedImageUrls.push(secureUrl);
            }
        }

        // 2. Insert into products table
        const [result] = await pool.query(
            `INSERT INTO products 
            (category_id, name, type, cart_name, specs, price, color_name, colors) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                parsedCategoryId,
                trimmedName,
                resolvedType || null,
                resolvedCartName,
                JSON.stringify(parsedSpecs),
                parsedPrice,
                resolvedColorName,
                JSON.stringify(parsedColors)
            ]
        );

        const newProductId = result.insertId;

        // 3. Insert images into product_images table
        if (uploadedImageUrls.length > 0) {
            const imageValues = uploadedImageUrls.map(url => [newProductId, url]);
            await pool.query(
                'INSERT INTO product_images (product_id, image_url) VALUES ?',
                [imageValues]
            );
        }

        res.status(201).json({
            status: 'success',
            message: 'Product created successfully',
            data: {
                id: newProductId,
                name: trimmedName,
                category_id: parsedCategoryId,
                type: resolvedType,
                cart_name: resolvedCartName,
                price: parsedPrice,
                color_name: resolvedColorName,
                specs: parsedSpecs,
                colors: parsedColors,
                images: uploadedImageUrls
            }
        });
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// ============================================================
// DELETE /products/:id - Delete product and its images
// ============================================================
router.delete('/:id', async (req, res) => {
    try {
        const productId = req.params.id;

        // Delete related images first (even if ON DELETE CASCADE is defined)
        await pool.query('DELETE FROM product_images WHERE product_id = ?', [productId]);
        const [result] = await pool.query('DELETE FROM products WHERE id = ?', [productId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        }

        res.json({
            status: 'success',
            message: 'Product deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

module.exports = router;
