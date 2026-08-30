// main.js

// Function to slide images inside a specific product card
function moveSlide(button, direction) {
    const sliderContainer = button.parentElement;
    const slides = sliderContainer.querySelectorAll('.slide');

    let currentIndex = 0;

    for (let i = 0; i < slides.length; i++) {
        if (slides[i].classList.contains('active')) {
            currentIndex = i;
            slides[i].classList.remove('active');
            break;
        }
    }

    let nextIndex = currentIndex + direction;

    if (nextIndex >= slides.length) {
        nextIndex = 0;
    } else if (nextIndex < 0) {
        nextIndex = slides.length - 1;
    }

    slides[nextIndex].classList.add('active');
}





function sendMessage(event) {
    event.preventDefault();
    const form = event.target;

    emailjs.sendForm('service_jhndxtb', 'template_gxxvf9e', form)
        .then(() => {
            alert('សាររបស់អ្នកត្រូវបានផ្ញើ!');
            form.reset();
        })
        .catch(() => alert('មានបញ្ហា សូមព្យាយាមម្តងទៀត!'));

    return false;
}

// 1. Array of products
const productData = [
    {
        id: 1,
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
        id: 2,
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
        id: 3,
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
        id: 4,
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
        id: 5,
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
        id: 6,
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
        id: 7,
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
        id: 8,
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
        id: 9,
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
        id: 10,
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
        id: 11,
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
        id: 12,
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
        id: 13,
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
        id: 14,
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
        id: 15,
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
    }
];

let currentFilter = 'ALL';

function filterProducts(type) {
    currentFilter = type;

    // Update active class on filter buttons
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        if (btn.innerText === type || (btn.innerText === 'ALL' && type === 'ALL')) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    renderProducts();
}

// 2. Render function to generate HTML
function renderProducts() {
    const grid = document.querySelector('.product-grid');
    if (!grid) return;

    const filteredData = currentFilter === 'ALL'
        ? productData
        : productData.filter(p => p.type === currentFilter);

    grid.innerHTML = filteredData.map(product => {
        const imagesHtml = product.images.map((img, index) => {
            const altText = index === 0 ? 'Front' : (index === 1 ? 'Back' : 'Side');
            const activeClass = index === 0 ? 'active' : '';
            const loadingAttr = index !== 0 ? 'loading="lazy"' : '';
            return `<img src="${img}" alt="${altText}" class="slide ${activeClass}" ${loadingAttr}>`;
        }).join('');

        const specsHtml = product.specs.map(spec => `<p class="specs">${spec}</p>`).join('');

        const colorsHtml = product.colors.map((c, index) => {
            const checked = index === 0 ? 'checked' : '';
            const borderStyle = c.border ? 'border: 1px solid #ddd;' : '';
            return `
                        <input type="radio" name="${product.colorName}" id="color_${c.value}_${product.colorName}" value="${c.value}" ${checked}>
                        <label for="color_${c.value}_${product.colorName}" class="color-swatch" style="background-color: ${c.colorCode}; ${borderStyle}"></label>
            `;
        }).join('');

        return `
        <div class="product-card">
            <div class="image-slider">
                ${imagesHtml}
                <button class="slider-btn prev" onclick="moveSlide(this, -1)">&#10094;</button>
                <button class="slider-btn next" onclick="moveSlide(this, 1)">&#10095;</button>
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                ${specsHtml}
                <p class="price">$${product.price}</p>
                <div class="color-selection">
                    <div class="color-options">
                        ${colorsHtml}
                    </div>
                </div>
                <button class="add-to-cart" onclick="addToCart('${product.cartName}', ${product.price}, '${product.colorName}')">Add to Cart</button>
            </div>
        </div>
        `;
    }).join('');
}

// 3. Initialize rendering on page load
document.addEventListener('DOMContentLoaded', renderProducts);
