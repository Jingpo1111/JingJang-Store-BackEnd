let cart = []; // Array to store cart items

// 1. មុខងារ Add to Cart (គាំទ្រការរើសពណ៌)
function addToCart(name, price, colorGroupName) {
    // 🔐 Check if user is logged in
    if (localStorage.getItem('jj_loggedIn') !== 'true') {
        if (confirm("You need to login first to add items to cart.\n\nGo to Login page?")) {
            window.location.href = 'login/login.html';
        }
        return;
    }

    let selectedColor = "";

    if (colorGroupName) {
        let colorInput = document.querySelector('input[name="' + colorGroupName + '"]:checked');
        if (colorInput) {
            selectedColor = " (ពណ៌: " + colorInput.value + ")";
        }
    }

    let finalName = name + selectedColor;
    const existingItem = cart.find(item => item.name === finalName);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ name: finalName, price: price, quantity: 1 });
    }

    updateCartUI();
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar) sidebar.classList.add('open');
}

// 2. មុខងារបន្ថែម ឬបន្ថយចំនួនទំនិញ (+ / -)
function updateQuantity(index, change) {
    cart[index].quantity += change;

    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }

    updateCartUI();
}

// 3. មុខងារបង្ហាញទិន្នន័យលើ Cart UI 
function updateCartUI() {
    const countEl = document.getElementById('cart-count');
    const itemsEl = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (countEl) countEl.innerText = totalItems;

    if (itemsEl) {
        itemsEl.innerHTML = '';
        let totalPrice = 0;

        if (cart.length === 0) {
            itemsEl.innerHTML = '<p style="text-align:center; color:#999;">Cart is empty</p>';
        } else {
            cart.forEach((item, index) => {
                const itemTotal = item.price * item.quantity;
                totalPrice += itemTotal;

                itemsEl.innerHTML += `
                    <div class="cart-item">
                        <div class="item-info">
                            <span class="item-name">${item.name}</span>
                            <span class="item-price">$${itemTotal.toFixed(2)}</span>
                        </div>
                        <div class="qty-controls">
                            <button class="qty-btn" onclick="updateQuantity(${index}, -1)">-</button>
                            <span class="qty-num">${item.quantity}</span>
                            <button class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
                        </div>
                    </div>
                `;
            });
        }
        if (totalEl) totalEl.innerText = totalPrice.toFixed(2);
    }
}

// 4. មុខងារបិទ/បើកកន្ត្រក
function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

