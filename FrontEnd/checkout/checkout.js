let receiptBase64 = "";
let receiptMimeType = "";

function openCheckout() {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }
    document.getElementById('cart-sidebar').classList.remove('open');
    document.getElementById('checkout-total-price').innerText = document.getElementById('cart-total').innerText;
    document.getElementById('checkout-modal').style.display = 'flex';
}

function closeCheckout() {
    document.getElementById('checkout-modal').style.display = 'none';
}

function previewReceipt(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function () {
        const output = document.getElementById('receipt-preview');
        output.src = reader.result;
        output.style.display = 'block';

        receiptBase64 = reader.result;
        receiptMimeType = file.type;
    };
    reader.readAsDataURL(file);
}

async function submitOrder(event) {
    event.preventDefault();

    const API_URL = CONFIG.API_BASE + '/order';

    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.innerText = 'Processing... Please wait';
    submitBtn.disabled = true;

    // Get userId from localStorage (JJ-XXXX format)
    const userId = localStorage.getItem('jj_userId') || 'GUEST';

    const orderData = {
        userid:  userId,
        name:    document.getElementById('cus-name').value,
        Phone:   document.getElementById('cus-phone').value,
        Address: document.getElementById('cus-address').value,
        Note:    document.getElementById('cus-note').value || 'គ្មាន',
        Total:   document.getElementById('checkout-total-price').innerText,
        Items:   JSON.stringify(cart),
        Receipt: receiptBase64 || 'No Receipt'
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(orderData),
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.status === 'success') {
            alert('✅ Payment Successful! Order ID: ' + result.orderId + '\nWe have received your order.');
        } else {
            alert('⚠️ Order created but server returned: ' + (result.message || 'Unknown response'));
        }

        cart = [];
        updateCartUI();
        document.getElementById('checkout-form').reset();
        document.getElementById('receipt-preview').style.display = 'none';
        receiptBase64 = '';
        closeCheckout();

        // Force refresh profile orders so the new order appears immediately
        if (typeof loadProfileOrders === 'function') {
            loadProfileOrders(true);
        }

    } catch (error) {
        alert('❌ Error sending order. Please check your connection.');
    } finally {
        submitBtn.innerText = 'Confirm Order';
        submitBtn.disabled = false;
    }
}

function getRealLocation() {
    const addressInput = document.getElementById('cus-address');
    const locationBtn = document.getElementById('btn-location');

    if (navigator.geolocation) {
        locationBtn.innerHTML = "⏳ Finding...";
        locationBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                addressInput.value = `https://www.google.com/maps?q=${lat},${lon}`;

                locationBtn.innerHTML = "📍 Location";
                locationBtn.disabled = false;
            },
            function (error) {
                alert("Location access denied. Please type manually.");
                locationBtn.innerHTML = "📍 Location";
                locationBtn.disabled = false;
            },
            { enableHighAccuracy: true }
        );
    } else {
        alert("Your browser doesn't support Geolocation.");
    }
}

// ----------------------------------------------------
// មុខងារថ្មីសម្រាប់ Bank Selection នឹងផ្លាស់ប្តូរ QR/Link
// ----------------------------------------------------
function toggleBankMenu() {
    const menu = document.getElementById('bank-dropdown');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function chooseBank(method, img, name) {
    // ផ្លាស់ប្តូរឈ្មោះ និងរូបតំណាង
    document.getElementById('selected-bank').innerHTML = `<img src="${img}" class="bank-icon"> ${name}`;

    const link = document.getElementById('payment-link');
    const qrImage = document.getElementById('qr-image');

    if (method === 'aba') {
        link.href = "https://pay.ababank.com/oRF8/4y0ur1w1";
        link.innerHTML = "🔗 Open ABA Link";
        qrImage.src = "img/abaqr.JPG";
    } else if (method === 'ac') {
        link.href = "https://acledabank.com.kh/acleda?payment_data=qWY5B2SAUfIhLblxzOtfu5ckLzMHjaSki6Ru0bsOyNK+ylPBgZ0sHH6BeGUscKoE58OqGYCB+0+/7oWYyz8zgsTJ6N1UFR6fIgKzYTC4dNBSP571ZBhr8NiW1VOcGNIzwp6mftkf9IzguusEGUFd8ONloxLNNAw/BQNxsYnPnySIPbhS8RMpf0EpteXXX9HIojN3S+eHDxcvzAKL/su/VQV2g35MTN2izKPWyPmhi4yiRBRS0zBA4p3xcAqn+NjU&key=khqr"; // កែតម្រូវ URL នៅពេលអ្នកដឹងពិតប្រាកដ
        link.innerHTML = "🔗 Open ACLEDA Link";
        qrImage.src = "img/acqr.jpg";
    }
}

// បិទ Dropdown ពេលចុចខាងក្រៅវា
document.addEventListener('click', function (event) {
    const selectBox = document.querySelector('.custom-select-box');
    if (selectBox && !selectBox.contains(event.target)) {
        document.getElementById('bank-dropdown').style.display = 'none';
    }
});