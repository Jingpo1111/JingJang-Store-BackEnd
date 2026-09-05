const pool = require('./db/dbPromise');

const initialProducts = [
    {
        name: 'Acer OMR228 1000Hz',
        type: 'Mouse',
        cartName: 'Acer OMR228 1000Hz',
        specs: [
            'Suppor: <strong>Computer, android</strong>',
            '<strong>Connectivity: Bluetooth, Type-C, USB-2.4G</strong>'
        ],
        price: 11,
        colorName: 'color_aceromr228',
        colors: [
            { name: 'Black', value: 'Black', colorCode: '#2c2c2c' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/Mouse-aceromr228/1.jpg',
            'img/Mouse-aceromr228/2.jpg',
            'img/Mouse-aceromr228/3.jpg',
            'img/Mouse-aceromr228/4.jpg'
        ]
    },
    {
        name: 'Acer OMW030 gaming RGB',
        type: 'Mouse',
        cartName: 'Acer OMW030 gaming RGB',
        specs: [
            'Suppor: <strong>Computer gaming</strong>',
            '<strong>Connectivity: USB wired 7200DPI</strong>'
        ],
        price: 11.5,
        colorName: 'color_aceromw030',
        colors: [
            { name: 'Black', value: 'Black', colorCode: '#2c2c2c' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/Mouse aceromw030/1.jpg',
            'img/Mouse aceromw030/2.jpg',
            'img/Mouse aceromw030/3.jpg'
        ]
    },
    {
        name: 'Acer OMW950 gaming RGB',
        type: 'Mouse',
        cartName: 'Acer OMW950 gaming RGB',
        specs: [
            'Support :<strong>Computer gaming </strong>',
            '<strong>Connectivity: USB wired 7200DPI</strong>'
        ],
        price: 12,
        colorName: 'color_aceromw950',
        colors: [
            { name: 'Black', value: 'Black', colorCode: '#2c2c2c' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/Mouse aceromw950 wired/1.jpg',
            'img/Mouse aceromw950 wired/2.jpg',
            'img/Mouse aceromw950 wired/3.jpg',
            'img/Mouse aceromw950 wired/4.jpg'
        ]
    },
    {
        name: 'FMouse M500SE 4800DPI',
        type: 'Mouse',
        cartName: 'FMouse M500SE',
        specs: [
            'Support APP: <strong>Computer, Android, </strong>',
            '<strong>Connectivity: Bluetooth, Type-C, USB-2.4G</strong>'
        ],
        price: 17,
        colorName: 'color_m500se',
        colors: [
            { name: 'Black', value: 'Black', colorCode: '#2c2c2c' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/Fmouse M500se/1.png',
            'img/Fmouse M500se/2.jpg',
            'img/Fmouse M500se/3.jpg',
            'img/Fmouse M500se/4.jpg',
            'img/Fmouse M500se/5.jpg'
        ]
    },
    {
        name: 'FMouse M233 1600DPI ',
        type: 'Mouse',
        cartName: 'FMouse M233',
        specs: [
            'Office Mouse Support : <strong>Computer, Android</strong>',
            '<strong>Connectivity: Bluetooth, Type-C, USB-2.4G</strong>'
        ],
        price: 13,
        colorName: 'color_m233',
        colors: [
            { name: 'Black', value: 'Black', colorCode: '#2c2c2c' },
            { name: 'Pink', value: 'Pink', colorCode: 'pink' },
            { name: 'Orange', value: 'Orange', colorCode: 'orange' },
            { name: 'Blue', value: 'Blue', colorCode: 'blue' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/Fmouse-m233/1.jpg',
            'img/Fmouse-m233/2.jpg',
            'img/Fmouse-m233/3.jpg',
            'img/Fmouse-m233/4.jpg',
            'img/Fmouse-m233/5.jpg'
        ]
    },
    {
        name: 'FMouse M235Pro 4800DPI RGB ',
        type: 'Mouse',
        cartName: 'FMouse M235Pro',
        specs: [
            'Support: <strong>Computer, Android, IOS</strong>',
            '<strong>Connectivity: Bluetooth, Type-C, USB-2.4G</strong>'
        ],
        price: 16,
        colorName: 'color_m235_pro',
        colors: [
            { name: 'Black', value: 'Black', colorCode: '#2c2c2c' },
            { name: 'black+Green', value: 'black+Green', colorCode: 'rgb(53, 175, 132)' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/mouse m235 pro/1.jpg',
            'img/mouse m235 pro/2.jpg',
            'img/mouse m235 pro/3.jpg',
            'img/mouse m235 pro/4.jpg',
            'img/mouse m235 pro/5.jpg'
        ]
    },
    {
        name: 'Mouse Aula SC650 12000 DPI',
        type: 'Mouse',
        cartName: 'Mouse Aula SC650',
        specs: [
            'Support for gaming: <strong>Computer, Android, IOS</strong>',
            '<strong>Connectivity: Bluetooth, Type-C, USB-2.4G</strong>'
        ],
        price: 20,
        colorName: 'color_sc650',
        colors: [
            { name: 'Black', value: 'Black', colorCode: '#2c2c2c' },
            { name: 'Pink', value: 'Pink', colorCode: 'rgb(184, 45, 126)' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/mouse aulaSC650/1.jpg',
            'img/mouse aulaSC650/2.jpg',
            'img/mouse aulaSC650/3.jpg',
            'img/mouse aulaSC650/4.jpg',
            'img/mouse aulaSC650/5.jpg'
        ]
    },
    {
        name: 'Gamesir Tegeniria',
        type: 'Controller',
        cartName: 'Gamesir Tegeniria',
        specs: [
            'Supporrt: <strong>Computer</strong>',
            '<strong>Method Connection: USB</strong>'
        ],
        price: 15,
        colorName: 'color_tegeniria',
        colors: [
            { name: 'Gray', value: 'Gray', colorCode: 'gray' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/Gamesir Tegeniria/1.jpg',
            'img/Gamesir Tegeniria/2.jpg',
            'img/Gamesir Tegeniria/3.jpg',
            'img/Gamesir Tegeniria/4.jpg',
            'img/Gamesir Tegeniria/5.jpg'
        ]
    },
    {
        name: 'Gamesir Nova2Life',
        type: 'Controller',
        cartName: 'Gamesir Nova2Life',
        specs: [
            'Supporrt: <strong>Computer, Android, IOS </strong>',
            '<strong>Method Connection: Bluetooth, Type-C, USB-Reciver</strong>'
        ],
        price: 25,
        colorName: 'color_nova2life',
        colors: [
            { name: 'Black', value: 'Black', colorCode: '#2c2c2c' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/Gamesir nova2life/1.jpg',
            'img/Gamesir nova2life/2.jpg',
            'img/Gamesir nova2life/3.jpg',
            'img/Gamesir nova2life/4.jpg',
            'img/Gamesir nova2life/5.jpg'
        ]
    },
    {
        name: 'Gamesir X5Life (Type-C)',
        type: 'Controller',
        cartName: 'Gamesir X5Life',
        specs: [
            'Supporrt <strong>Android & IOS</strong>',
            'Game App: <strong>Gamesir, GameHub</strong>'
        ],
        price: 22,
        colorName: 'color_gamesir_x5',
        colors: [
            { name: 'Pink', value: 'Pink', colorCode: 'pink' },
            { name: 'Black', value: 'Black', colorCode: '#2c2c2c' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/Gamesir x5life/gamesir x5life 1.jpg',
            'img/Gamesir x5life/gamesir x5life 2.jpg',
            'img/Gamesir x5life/gamesir x5life 3.jpg',
            'img/Gamesir x5life/gamesir x5life 4.jpg',
            'img/Gamesir x5life/gamesir x5life 5.jpg'
        ]
    },
    {
        name: 'Mini Stand Computer(1Pair)',
        type: 'Stand',
        cartName: 'Mini Stand Computer',
        specs: [
            'Supporrt Computer: <strong>14inch - 17inch</strong>',
            '<strong>Flexible for use</strong>'
        ],
        price: 4,
        colorName: 'color_ministand',
        colors: [
            { name: 'Black', value: 'Black', colorCode: '#2c2c2c' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/MiniStandcomputer/1.jpg',
            'img/MiniStandcomputer/2.jpg'
        ]
    },
    {
        name: 'Anker Cable Lightning 60W(0.9m)',
        type: 'Charger',
        cartName: 'Anker Cable Lightning',
        specs: [
            'Supporrt <strong>IOS</strong>',
            'The best for: <strong>iPhone 8 to iPhone 14PM</strong>'
        ],
        price: 12,
        colorName: 'color_anker_light',
        colors: [
            { name: 'Black', value: 'Black', colorCode: '#2c2c2c' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/AnkerLihtning60w/1.png',
            'img/AnkerLihtning60w/3.jpg',
            'img/AnkerLihtning60w/4.jpg'
        ]
    },
    {
        name: 'Anker Cable Type-c 100W(0.9m)',
        type: 'Charger',
        cartName: 'Anker Cable 100W',
        specs: [
            'Supporrt <strong>Android & IOS</strong>',
            'The best for: <strong>iPhone 15 up</strong>'
        ],
        price: 8,
        colorName: 'color_anker_100w',
        colors: [
            { name: 'Pink', value: 'Pink', colorCode: 'pink' },
            { name: 'Black', value: 'Black', colorCode: '#2c2c2c' },
            { name: 'Blue', value: 'Blue', colorCode: '#3498db' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/AnkerCable100W/1.jpg',
            'img/AnkerCable100W/2.jpg',
            'img/AnkerCable100W/3.jpg',
            'img/AnkerCable100W/4.jpg',
            'img/AnkerCable100W/5.jpg'
        ]
    },
    {
        name: 'JBL Earphone T310C (Type-C)',
        type: 'Earphone',
        cartName: 'JBL Earphone T310C',
        specs: [
            'Supporrt <strong>Android & IOS</strong>',
            'The best for EQ: <strong>BASS, VOCAL, DEFAULT</strong>'
        ],
        price: 18,
        colorName: 'color_jbl_t310c',
        colors: [
            { name: 'Red', value: 'Red', colorCode: 'red' },
            { name: 'Black', value: 'Black', colorCode: '#2c2c2c' },
            { name: 'Blue', value: 'Blue', colorCode: '#3498db' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/JBL T310C/T310C1.png',
            'img/JBL T310C/T310C2.jpg',
            'img/JBL T310C/T310C3.jpg',
            'img/JBL T310C/T310C4.jpg',
            'img/JBL T310C/T310C5.jpg'
        ]
    },
    {
        name: 'Anker Zolo 30W (Type-C)',
        type: 'Charger',
        cartName: 'Anker Zolo 30W',
        specs: [
            'Supporrt <strong>Android & IOS</strong>',
            'The best for: <strong>iPhone 12-iPhone 16 Pro Max</strong>'
        ],
        price: 12,
        colorName: 'color_anker_zolo',
        colors: [
            { name: 'Pink', value: 'Pink', colorCode: 'pink' },
            { name: 'Black', value: 'Black', colorCode: '#2c2c2c' },
            { name: 'Blue', value: 'Blue', colorCode: '#3498db' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/Anker30W/anker5.png',
            'img/Anker30W/anker1.jpg',
            'img/Anker30W/anker2.jpg',
            'img/Anker30W/anker4.jpg'
        ]
    },
    {
        name: 'Earphone JBL T110',
        type: 'Earphone',
        cartName: 'Earphone JBL T110',
        specs: [
            'Support for Audio <strong>3.5mm jack</strong>',
            'Best for Android'
        ],
        price: 17,
        colorName: 'color_jbl_t110',
        colors: [
            { name: 'Black', value: 'Black', colorCode: '#2c2c2c' },
            { name: 'Blue', value: 'Blue', colorCode: '#3498db' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/JBLT110/1.png',
            'img/JBLT110/2.jpg',
            'img/JBLT110/3.jpg'
        ]
    },
    {
        name: 'Earphone JBL RUN3 ',
        type: 'Earphone',
        cartName: 'Earphone JBL RUN3',
        specs: [
            'Support for Audio <strong>3.5mm jack</strong>',
            'For running, Gaming , Music'
        ],
        price: 22,
        colorName: 'color_jbl_run3',
        colors: [
            { name: 'Black', value: 'Black', colorCode: '#2c2c2c' },
            { name: 'White', value: 'White', colorCode: '#f9f9f9', border: true }
        ],
        images: [
            'img/JBLRUN3/1.png',
            'img/JBLRUN3/2.png',
            'img/JBLRUN3/3.jpg'
        ]
    }
];

async function seed() {
    console.log('🌱 Starting seed process...');

    // 1. Ensure categories
    const categories = ['Mouse', 'Controller', 'Stand', 'Charger', 'Earphone'];
    const categoryMap = {};

    for (const cat of categories) {
        const [existing] = await pool.query('SELECT id FROM categories WHERE name = ?', [cat]);
        if (existing.length > 0) {
            categoryMap[cat] = existing[0].id;
        } else {
            const [insert] = await pool.query('INSERT INTO categories (name) VALUES (?)', [cat]);
            categoryMap[cat] = insert.insertId;
            console.log(`✅ Created category: ${cat} (ID: ${insert.insertId})`);
        }
    }

    // 2. Check if products already exist
    const [existingProds] = await pool.query('SELECT COUNT(*) as count FROM products');
    if (existingProds[0].count > 0) {
        console.log(`ℹ️ Products table already has ${existingProds[0].count} products. Skipping seeding.`);
        process.exit(0);
    }

    // 3. Insert initial products
    for (const prod of initialProducts) {
        const categoryId = categoryMap[prod.type] || null;

        const [pResult] = await pool.query(
            `INSERT INTO products (category_id, name, type, cart_name, specs, price, color_name, colors) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                categoryId,
                prod.name,
                prod.type,
                prod.cartName,
                JSON.stringify(prod.specs),
                prod.price,
                prod.colorName,
                JSON.stringify(prod.colors)
            ]
        );

        const newProdId = pResult.insertId;

        // Insert images
        if (prod.images && prod.images.length > 0) {
            const imageValues = prod.images.map(img => [newProdId, img]);
            await pool.query('INSERT INTO product_images (product_id, image_url) VALUES ?', [imageValues]);
        }

        console.log(`✅ Seeded: ${prod.name} (ID: ${newProdId}) with ${prod.images.length} images`);
    }

    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
