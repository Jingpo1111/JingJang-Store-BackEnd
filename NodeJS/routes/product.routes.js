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
                p.option_name,
                p.option_values,
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

            let optionValues = p.option_values;
            if (typeof optionValues === 'string') {
                try {
                    optionValues = JSON.parse(optionValues);
                } catch (e) {
                    optionValues = optionValues.split(',').map(s => s.trim()).filter(Boolean);
                }
            }

            // Normalize options into array of { name, values } objects
            let normalizedOptions = [];
            if (Array.isArray(optionValues) && optionValues.length > 0) {
                if (typeof optionValues[0] === 'object' && optionValues[0] !== null && optionValues[0].name) {
                    normalizedOptions = optionValues.map(opt => ({
                        name: opt.name || 'Option',
                        values: Array.isArray(opt.values) ? opt.values : (typeof opt.values === 'string' ? opt.values.split(',').map(s => s.trim()).filter(Boolean) : [])
                    }));
                } else {
                    normalizedOptions = [{
                        name: p.option_name || 'Option',
                        values: optionValues
                    }];
                }
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
                option_name: p.option_name || (normalizedOptions.length > 0 ? normalizedOptions.map(o => o.name).join(', ') : null),
                options: normalizedOptions,
                option_values: normalizedOptions,
                images: imageMap[p.id] || [],
                created_at: p.created_at
            };
        });

        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
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

        let optionValues = p.option_values;
        if (typeof optionValues === 'string') {
            try {
                optionValues = JSON.parse(optionValues);
            } catch (e) {
                optionValues = optionValues.split(',').map(s => s.trim()).filter(Boolean);
            }
        }

        // Normalize options into array of { name, values } objects
        let normalizedOptions = [];
        if (Array.isArray(optionValues) && optionValues.length > 0) {
            if (typeof optionValues[0] === 'object' && optionValues[0] !== null && optionValues[0].name) {
                normalizedOptions = optionValues.map(opt => ({
                    name: opt.name || 'Option',
                    values: Array.isArray(opt.values) ? opt.values : (typeof opt.values === 'string' ? opt.values.split(',').map(s => s.trim()).filter(Boolean) : [])
                }));
            } else {
                normalizedOptions = [{
                    name: p.option_name || 'Option',
                    values: optionValues
                }];
            }
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
                option_name: p.option_name || (normalizedOptions.length > 0 ? normalizedOptions.map(o => o.name).join(', ') : null),
                options: normalizedOptions,
                option_values: normalizedOptions,
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
            colors,
            option_name,
            option_values
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

        // Parse Options (supports multi-option groups e.g. Size: S,M,L and Type: Wireless,Wired)
        let normalizedOptions = [];
        if (typeof option_values === 'string') {
            try {
                const parsed = JSON.parse(option_values);
                if (Array.isArray(parsed)) {
                    normalizedOptions = parsed;
                }
            } catch (e) {
                const vals = option_values.split(',').map(s => s.trim()).filter(Boolean);
                if (vals.length > 0) {
                    normalizedOptions = [{ name: (option_name || 'Option').trim(), values: vals }];
                }
            }
        } else if (Array.isArray(option_values)) {
            normalizedOptions = option_values;
        }

        // Standardize normalizedOptions
        normalizedOptions = normalizedOptions.map(opt => {
            if (typeof opt === 'object' && opt !== null && opt.name) {
                const vals = Array.isArray(opt.values)
                    ? opt.values
                    : (typeof opt.values === 'string' ? opt.values.split(',').map(s => s.trim()).filter(Boolean) : []);
                if (vals.length > 0) {
                    return { name: opt.name.trim(), values: vals };
                }
            }
            return null;
        }).filter(Boolean);

        const resolvedOptionName = normalizedOptions.length > 0
            ? normalizedOptions.map(o => o.name).join(', ')
            : ((option_name || '').trim() || null);
        const finalOptionValues = normalizedOptions.length > 0 ? JSON.stringify(normalizedOptions) : null;

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
            (category_id, name, type, cart_name, specs, price, color_name, colors, option_name, option_values) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                parsedCategoryId,
                trimmedName,
                resolvedType || null,
                resolvedCartName,
                JSON.stringify(parsedSpecs),
                parsedPrice,
                resolvedColorName,
                JSON.stringify(parsedColors),
                resolvedOptionName,
                finalOptionValues
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
                option_name: resolvedOptionName,
                options: normalizedOptions,
                option_values: normalizedOptions,
                images: uploadedImageUrls
            }
        });
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// ============================================================
// PUT /products/:id - Update product details and optionally add images
// ============================================================
router.put('/:id', upload.array('photos', 10), async (req, res) => {
    try {
        const productId = parseInt(req.params.id, 10);
        if (isNaN(productId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid product ID' });
        }

        // 1. Verify product exists
        const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);
        if (existing.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        }

        const current = existing[0];
        const {
            name,
            category_id,
            type,
            cart_name,
            price,
            color_name,
            specs,
            colors,
            option_name,
            option_values,
            remove_image_urls
        } = req.body;

        // Resolve fields with fallbacks to current values
        const updatedName = name !== undefined && name.trim() ? name.trim() : current.name;
        const updatedPrice = price !== undefined && !isNaN(parseFloat(price)) ? parseFloat(price) : current.price;
        const updatedCartName = cart_name !== undefined ? cart_name.trim() : current.cart_name;
        const updatedColorName = color_name !== undefined ? color_name.trim() : current.color_name;

        let updatedCategoryId = current.category_id;
        let updatedType = current.type;

        if (category_id !== undefined) {
            const parsedCatId = parseInt(category_id, 10);
            if (!isNaN(parsedCatId)) {
                const [catRows] = await pool.query('SELECT name FROM categories WHERE id = ?', [parsedCatId]);
                if (catRows.length > 0) {
                    updatedCategoryId = parsedCatId;
                    updatedType = catRows[0].name;
                }
            } else if (category_id === null || category_id === '') {
                updatedCategoryId = null;
            }
        }

        if (type !== undefined && type.trim()) {
            updatedType = type.trim();
        }

        // Specs
        let finalSpecs = current.specs;
        if (specs !== undefined) {
            if (typeof specs === 'string') {
                try {
                    finalSpecs = JSON.stringify(JSON.parse(specs));
                } catch (e) {
                    finalSpecs = JSON.stringify(specs.split('\n').map(s => s.trim()).filter(Boolean));
                }
            } else if (Array.isArray(specs)) {
                finalSpecs = JSON.stringify(specs);
            }
        }

        // Colors
        let finalColors = current.colors;
        if (colors !== undefined) {
            if (typeof colors === 'string') {
                try {
                    finalColors = JSON.stringify(JSON.parse(colors));
                } catch (e) {
                    finalColors = JSON.stringify([]);
                }
            } else if (Array.isArray(colors)) {
                finalColors = JSON.stringify(colors);
            }
        }

        // Options
        let finalOptionName = current.option_name;
        let finalOptionValues = current.option_values;
        if (option_values !== undefined) {
            let parsedOpts = [];
            if (typeof option_values === 'string') {
                try {
                    parsedOpts = JSON.parse(option_values);
                } catch (e) {
                    const vals = option_values.split(',').map(s => s.trim()).filter(Boolean);
                    if (vals.length > 0) {
                        parsedOpts = [{ name: (option_name || 'Option').trim(), values: vals }];
                    }
                }
            } else if (Array.isArray(option_values)) {
                parsedOpts = option_values;
            }

            if (Array.isArray(parsedOpts) && parsedOpts.length > 0) {
                finalOptionName = parsedOpts.map(o => o.name).join(', ');
                finalOptionValues = JSON.stringify(parsedOpts);
            } else {
                finalOptionName = null;
                finalOptionValues = null;
            }
        } else if (option_name !== undefined) {
            finalOptionName = option_name.trim() || null;
        }

        // Update product record
        await pool.query(`
            UPDATE products 
            SET category_id = ?,
                name = ?,
                type = ?,
                cart_name = ?,
                specs = ?,
                price = ?,
                color_name = ?,
                colors = ?,
                option_name = ?,
                option_values = ?
            WHERE id = ?
        `, [
            updatedCategoryId,
            updatedName,
            updatedType,
            updatedCartName,
            finalSpecs,
            updatedPrice,
            updatedColorName,
            finalColors,
            finalOptionName,
            finalOptionValues,
            productId
        ]);

        // Handle image removals if specified
        if (remove_image_urls) {
            let urlsToRemove = [];
            try {
                urlsToRemove = typeof remove_image_urls === 'string' ? JSON.parse(remove_image_urls) : remove_image_urls;
            } catch (e) {
                urlsToRemove = [remove_image_urls];
            }
            if (Array.isArray(urlsToRemove) && urlsToRemove.length > 0) {
                await pool.query('DELETE FROM product_images WHERE product_id = ? AND image_url IN (?)', [productId, urlsToRemove]);
            }
        }

        // Upload any newly provided photos to Cloudinary
        const newImageUrls = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const secureUrl = await uploadToCloudinary(file.buffer, 'jingjang_store/products');
                newImageUrls.push(secureUrl);
            }
            const imageValues = newImageUrls.map(url => [productId, url]);
            await pool.query('INSERT INTO product_images (product_id, image_url) VALUES ?', [imageValues]);
        }

        // Fetch all current images for updated product
        const [images] = await pool.query('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY id ASC', [productId]);

        res.json({
            status: 'success',
            message: 'Product updated successfully',
            data: {
                id: productId,
                name: updatedName,
                category_id: updatedCategoryId,
                type: updatedType,
                cart_name: updatedCartName,
                price: parseFloat(updatedPrice),
                color_name: updatedColorName,
                specs: finalSpecs ? JSON.parse(finalSpecs) : [],
                colors: finalColors ? JSON.parse(finalColors) : [],
                option_name: finalOptionName,
                option_values: finalOptionValues ? JSON.parse(finalOptionValues) : null,
                images: images.map(img => img.image_url)
            }
        });
    } catch (err) {
        console.error('Error updating product:', err);
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
