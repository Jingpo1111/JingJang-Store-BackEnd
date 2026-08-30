// ============================================================
// 📌 profile.js — Profile Page Logic
// ============================================================

// ✅ NodeJS Backend API (replaces Google Apps Script)
const API_BASE_PROFILE  = CONFIG.API_BASE;
const ORDER_API_BASE    = API_BASE_PROFILE + '/order'; // /order, /order/user/:id
const AUTH_API_BASE     = API_BASE_PROFILE + '/user';  // /user/login, /user/change-password
const OTP_API_BASE      = API_BASE_PROFILE + '/otp';   // /otp/generate, /otp/verify

// ========================
// Auto-Refresh Timer
// ========================
let orderAutoRefreshInterval = null;
const AUTO_REFRESH_MS = 60 * 60 * 1000; // 1 hour

function startOrderAutoRefresh() {
    stopOrderAutoRefresh(); // Clear any existing timer first
    orderAutoRefreshInterval = setInterval(() => {
        const modal = document.getElementById('profile-modal');
        // Only auto-refresh if the profile is currently open
        if (modal && modal.classList.contains('open')) {
            console.log('[Profile] Auto-refreshing orders (1 hour interval)...');
            loadProfileOrders(true);
        }
    }, AUTO_REFRESH_MS);
}

function stopOrderAutoRefresh() {
    if (orderAutoRefreshInterval) {
        clearInterval(orderAutoRefreshInterval);
        orderAutoRefreshInterval = null;
    }
}

// ========================
// Open / Close Profile
// ========================
function openProfile() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.classList.add('open');

        // Clear search box to prevent browser autofill from hiding orders
        const searchBox = document.getElementById('profile-order-search');
        if (searchBox) searchBox.value = '';

        loadProfileData();
        loadProfileOrders();
        startOrderAutoRefresh(); // Start the 1-hour auto-refresh
    }
}

function closeProfile() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.classList.remove('open');

    stopOrderAutoRefresh(); // Stop auto-refresh when profile is closed

    // Clear password form
    const form = document.getElementById('change-password-form');
    if (form) form.reset();
    const errEl = document.getElementById('password-error');
    const sucEl = document.getElementById('password-success');
    if (errEl) errEl.textContent = '';
    if (sucEl) sucEl.textContent = '';
}

// ========================
// Double-Click Refresh on "My Orders" Tab
// ========================
function handleOrdersTabDblClick() {
    const tabBtn = document.getElementById('ptab-orders');
    if (!tabBtn) return;

    // Show a loading spinner on the tab text
    const originalText = tabBtn.textContent;
    tabBtn.textContent = '🔄 Refreshing...';
    tabBtn.style.pointerEvents = 'none'; // Prevent spam clicks
    tabBtn.style.opacity = '0.6';

    loadProfileOrders(true).then(() => {
        tabBtn.textContent = '✅ Updated!';
        setTimeout(() => {
            tabBtn.textContent = originalText;
            tabBtn.style.pointerEvents = '';
            tabBtn.style.opacity = '';
        }, 1200);
    }).catch(() => {
        tabBtn.textContent = '❌ Failed';
        setTimeout(() => {
            tabBtn.textContent = originalText;
            tabBtn.style.pointerEvents = '';
            tabBtn.style.opacity = '';
        }, 1500);
    });
}

// ========================
// Load User Profile Data
// ========================
function loadProfileData() {
    const username = localStorage.getItem('jj_username') || '—';
    const userId = localStorage.getItem('jj_userId') || '—';
    const regDate = localStorage.getItem('jj_regDate') || '—';

    // Profile header
    const avatarEl = document.getElementById('profile-avatar');
    if (avatarEl) avatarEl.textContent = username.substring(0, 2).toUpperCase();

    const nameEl = document.getElementById('profile-name');
    if (nameEl) nameEl.textContent = username;

    const idEl = document.getElementById('profile-id');
    if (idEl) idEl.textContent = userId;

    const joinedEl = document.getElementById('profile-joined');
    if (joinedEl) joinedEl.textContent = regDate !== '—' ? 'Member since: ' + regDate : '';

    // Settings tab
    const setUser = document.getElementById('settings-username');
    if (setUser) setUser.textContent = username;

    const setId = document.getElementById('settings-userid');
    if (setId) setId.textContent = userId;

    const setDate = document.getElementById('settings-regdate');
    if (setDate) setDate.textContent = regDate;
}

// ========================
// Load User Orders
// ========================
let cachedOrdersJson = null;
let cachedUserId = null;
let lastOrdersFetchTime = 0;
let isLoadingOrders = false;

async function loadProfileOrders(forceRefresh = false) {
    const userId = localStorage.getItem('jj_userId');
    const listEl = document.getElementById('profile-order-list');

    if (!userId || !listEl) return;

    // Prevent duplicate simultaneous fetches
    if (isLoadingOrders) return;

    if (forceRefresh) {
        cachedOrdersJson = null;
        lastOrdersFetchTime = 0;
    }

    if (cachedUserId !== userId) {
        cachedOrdersJson = null;
        cachedUserId = userId;
        lastOrdersFetchTime = 0;
    }

    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    // If cache exists and less than 1 hour old, skip fetch
    if (cachedOrdersJson && (now - lastOrdersFetchTime < ONE_HOUR) && !forceRefresh) {
        return;
    }

    // Show loading only on first load (no cached data yet)
    if (!cachedOrdersJson) {
        listEl.innerHTML = '<p style="text-align:center; color:#999; padding: 30px 0;">⏳ Loading orders...</p>';
    }

    isLoadingOrders = true;

    try {
        const response = await fetch(ORDER_API_BASE + '/user/' + encodeURIComponent(userId));
        const orders = await response.json();
        const newOrdersJson = JSON.stringify(orders);

        lastOrdersFetchTime = Date.now();

        // Smart diff: if data hasn't changed, skip re-render entirely
        if (cachedOrdersJson === newOrdersJson) {
            isLoadingOrders = false;
            return;
        }
        cachedOrdersJson = newOrdersJson;

        // Update summary cards
        const totalEl = document.getElementById('total-orders');
        const pendingEl = document.getElementById('pending-orders');
        const successEl = document.getElementById('success-orders');

        if (totalEl) totalEl.textContent = orders.length;

        const pendingCount = orders.filter(o => {
            const s = (o.status || '').toLowerCase();
            return s === 'pending' || s === 'confirm order' || s === 'ordered' || s === 'in china';
        }).length;
        const successCount = orders.filter(o => {
            const s = (o.status || '').toLowerCase();
            return s === 'arrived khmer' || s === 'will be send to you' || s === 'success' || s === 'completed';
        }).length;

        if (pendingEl) pendingEl.textContent = pendingCount;
        if (successEl) successEl.textContent = successCount;

        // Render order list
        if (orders.length === 0) {
            listEl.innerHTML = `
                <div class="no-orders-msg">
                    <span class="no-orders-icon">📦</span>
                    <p>No orders yet.</p>
                    <p style="font-size:12px;">Start shopping to see your orders here!</p>
                </div>`;
            isLoadingOrders = false;
            return;
        }

        let html = '';
        // Show newest first
        orders.reverse().forEach(order => {
            let itemsHtml = '';
            try {
                const itemsArr = JSON.parse(order.items);
                itemsArr.forEach(item => {
                    itemsHtml += `<li>${item.name} (x${item.quantity})</li>`;
                });
            } catch (e) {
                itemsHtml = `<li>${order.items}</li>`;
            }

            const statusVal = order.status || 'Pending';
            let pillColor = '#ffffff'; let pillBg = '#f59e0b'; // amber (Pending)
            let border = 'none'; let shadow = '0 2px 4px rgba(0,0,0,0.1)';
            if (statusVal === 'Confirm order') { pillBg = '#3b82f6'; } // blue
            if (statusVal === 'Ordered') { pillBg = '#8b5cf6'; } // purple
            if (statusVal === 'In China') { pillBg = '#ec4899'; } // pink
            if (statusVal === 'Arrived Khmer') { pillBg = '#0ea5e9'; } // sky blue
            if (statusVal === 'Will be send to you' || statusVal === 'Completed') { pillBg = '#10b981'; } // emerald (Completed)
            if (statusVal === 'Cancelled') { pillBg = '#ef4444'; } // red

            let historyJson = order.history || '[]';
            let encodedHistory = encodeURIComponent(historyJson);

            html += `
                <div class="order-card" style="margin-bottom: 20px; background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #f1f1f1;">
                    <div class="order-card-header">
                        <span class="order-id-label">🆔 ${order.orderId || 'N/A'}</span>
                        <button class="order-status-pill" style="color: ${pillColor}; background: ${pillBg}; border: ${border}; box-shadow: ${shadow};" onclick="openTimeline('${encodedHistory}', '${statusVal}')">
                            ${statusVal}
                        </button>
                    </div>
                    <div class="order-detail-row">
                        <span class="order-detail-label">Date</span>
                        <span class="order-detail-value">${order.date || '—'}</span>
                    </div>
                    <div class="order-detail-row">
                        <span class="order-detail-label">Total</span>
                        <span class="order-detail-value" style="color:#e74c3c;">$${order.total || '0'}</span>
                    </div>
                    <div class="order-detail-row">
                        <span class="order-detail-label">Note</span>
                        <span class="order-detail-value">${order.note || 'គ្មាន'}</span>
                    </div>
                    <div class="order-items-list">
                        <ul>
                            ${itemsHtml}
                        </ul>
                    </div>
                </div>`;
        });

        listEl.innerHTML = html;

        // Re-apply current filter and search
        filterProfileOrders();

    } catch (error) {
        // Only show error if we have no cached data to display
        if (!cachedOrdersJson) {
            listEl.innerHTML = '<p style="text-align:center; color:#e74c3c; padding: 30px 0;">❌ Failed to load orders.</p>';
        }
    } finally {
        isLoadingOrders = false;
    }
}

// ========================
// Tab Switching
// ========================
function showProfileTab(tab) {
    const ordersTab = document.getElementById('ptab-orders');
    const settingsTab = document.getElementById('ptab-settings');
    const ordersContent = document.getElementById('profile-orders');
    const settingsContent = document.getElementById('profile-settings');

    if (tab === 'orders') {
        ordersTab.classList.add('active');
        settingsTab.classList.remove('active');
        ordersContent.classList.add('active');
        settingsContent.classList.remove('active');
    } else {
        ordersTab.classList.remove('active');
        settingsTab.classList.add('active');
        ordersContent.classList.remove('active');
        settingsContent.classList.add('active');
    }
}

// ========================
// Change Password (Step 1: Verify Current Password & Send OTP)
// ========================
let pendingPasswordChange = null;

async function handleChangePassword(event) {
    event.preventDefault();

    const currentPw = document.getElementById('current-password').value;
    const newPw = document.getElementById('new-password').value;
    const confirmPw = document.getElementById('confirm-new-password').value;
    const errEl = document.getElementById('password-error');
    const sucEl = document.getElementById('password-success');
    const btn = document.getElementById('change-pw-btn');

    errEl.textContent = '';
    sucEl.textContent = '';

    // Validation
    if (newPw !== confirmPw) {
        errEl.textContent = '❌ New passwords do not match!';
        return;
    }
    if (newPw.length < 4) {
        errEl.textContent = '❌ New password must be at least 4 characters.';
        return;
    }
    if (currentPw === newPw) {
        errEl.textContent = '❌ New password must be different from current password.';
        return;
    }

    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.btn-loader').style.display = 'inline';
    btn.disabled = true;

    try {
        const username = localStorage.getItem('jj_username');
        const email = localStorage.getItem('jj_email');

        if (!email) {
            errEl.textContent = '❌ Email not found in session. Please login again.';
            return;
        }

        // First, verify the current password by calling /user/login
        const loginCheck = await fetch(AUTH_API_BASE + '/login', {
            method: 'POST',
            body: JSON.stringify({ username, password: currentPw }),
            headers: { 'Content-Type': 'application/json' }
        });

        const loginResult = await loginCheck.json();

        if (loginResult.status !== 'success') {
            errEl.textContent = '❌ Incorrect current password.';
            return;
        }

        // Current password is correct. Save data temporarily
        pendingPasswordChange = {
            currentPw: currentPw,
            newPw: newPw,
            email: email
        };

        // Generate OTP via NodeJS /otp/generate
        const otpResponse = await fetch(OTP_API_BASE + '/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        const otpData = await otpResponse.json();

        if (otpData.status === 'SUCCESS') {
            // Send OTP via EmailJS
            await emailjs.send("service_uug1k5r", "template_abzvhmj", {
                to_email: email,
                otp_code: otpData.otp
            });

            // Show OTP Modal
            document.getElementById('profile-otp-email').textContent = email;
            document.getElementById('profile-otp-modal').style.display = 'flex';
        } else {
            errEl.textContent = '❌ Failed to send OTP: ' + (otpData.message || 'Unknown error');
        }
    } catch (error) {
        errEl.textContent = '❌ Connection error. Please try again.';
    } finally {
        btn.querySelector('.btn-text').style.display = 'inline';
        btn.querySelector('.btn-loader').style.display = 'none';
        btn.disabled = false;
    }
}

// ========================
// OTP Modal Functions for Change Password
// ========================
function closeProfileOTPModal() {
    document.getElementById('profile-otp-modal').style.display = 'none';
    document.getElementById('profile-otp-input').value = '';
    document.getElementById('profile-otp-error').textContent = '';
    pendingPasswordChange = null;
}

async function handleProfileVerifyOTP() {
    const otpInput = document.getElementById('profile-otp-input').value.trim();
    const errorEl = document.getElementById('profile-otp-error');
    const btn = document.getElementById('profile-otp-verify-btn');
    const formErrEl = document.getElementById('password-error');
    const formSucEl = document.getElementById('password-success');

    errorEl.textContent = '';

    if (!otpInput || otpInput.length !== 6) {
        errorEl.textContent = 'Please enter the 6-digit code.';
        return;
    }

    if (!pendingPasswordChange) {
        errorEl.textContent = 'Session lost. Please try again.';
        return;
    }

    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.btn-loader').style.display = 'inline';
    btn.disabled = true;

    try {
        // Verify OTP via NodeJS /otp/verify
        const response = await fetch(OTP_API_BASE + '/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: pendingPasswordChange.email,
                otp: otpInput
            })
        });

        const data = await response.json();

        if (data.status === 'SUCCESS') {
            // OTP Verified! Now call /user/change-password
            const userId = localStorage.getItem('jj_userId');
            const pwResponse = await fetch(AUTH_API_BASE + '/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    userId: userId,
                    currentPassword: pendingPasswordChange.currentPw,
                    newPassword: pendingPasswordChange.newPw
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            const pwResult = await pwResponse.json();

            closeProfileOTPModal();

            if (pwResult.status === 'success') {
                formSucEl.textContent = '✅ ' + pwResult.message;
                document.getElementById('change-password-form').reset();
            } else {
                formErrEl.textContent = '❌ ' + pwResult.message;
            }
        } else {
            errorEl.textContent = data.message || 'Invalid code. Please try again.';
        }
    } catch (error) {
        errorEl.textContent = 'Verification failed. Please try again.';
    } finally {
        btn.querySelector('.btn-text').style.display = 'inline';
        btn.querySelector('.btn-loader').style.display = 'none';
        btn.disabled = false;
    }
}

async function handleProfileResendOTP() {
    const errorEl = document.getElementById('profile-otp-error');
    const resendBtn = document.getElementById('profile-otp-resend-btn');

    if (!pendingPasswordChange) {
        errorEl.textContent = 'Session lost. Please try again.';
        return;
    }

    resendBtn.textContent = 'Sending...';
    resendBtn.disabled = true;
    errorEl.textContent = '';

    try {
        const otpResponse = await fetch(OTP_API_BASE + '/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: pendingPasswordChange.email })
        });

        const otpData = await otpResponse.json();

        if (otpData.status === 'SUCCESS') {
            await emailjs.send("service_uug1k5r", "template_abzvhmj", {
                to_email: pendingPasswordChange.email,
                otp_code: otpData.otp
            });

            errorEl.textContent = '✅ New OTP sent! Check your inbox.';
            errorEl.style.color = '#2ecc71';
            setTimeout(() => {
                errorEl.textContent = '';
                errorEl.style.color = '#e74c3c'; // reset to default error color
            }, 3000);
        } else {
            errorEl.textContent = 'Failed to resend OTP.';
        }
    } catch (error) {
        errorEl.textContent = 'Connection error. Please try again.';
    } finally {
        resendBtn.textContent = "Didn't receive it? Resend OTP";
        resendBtn.disabled = false;
    }
}

// ========================
// Timeline Modal
// ========================
function openTimeline(encodedHistory, currentStatus) {
    const historyJson = decodeURIComponent(encodedHistory);
    let history = [];
    try {
        history = JSON.parse(historyJson);
    } catch (e) {
        history = [];
    }

    const allStatuses = [
        "Pending",
        "Confirm order",
        "Ordered",
        "In China",
        "Arrived Khmer",
        "Will be send to you"
    ];

    let stepperHtml = '';
    let hasReachedCurrent = false;

    allStatuses.forEach((status, index) => {
        let historyEntry = history.find(h => h.status === status);
        let isCurrent = (status === currentStatus);

        let stepClass = '';
        if (isCurrent) {
            stepClass = 'current';
            hasReachedCurrent = true;
        } else if (!hasReachedCurrent) {
            stepClass = 'completed';
        } else {
            stepClass = '';
        }

        let timeStr = historyEntry ? historyEntry.date : 'Not yet reached';

        if (stepClass === 'completed' && !historyEntry) {
            timeStr = 'Skipped / Unknown time';
        } else if (stepClass === 'current' && !historyEntry) {
            timeStr = 'Unknown time';
        }

        stepperHtml += `
            <div class="step ${stepClass}">
                <div class="step-icon">${stepClass === 'completed' ? '✓' : (index + 1)}</div>
                <div class="step-content">
                    <div class="step-title">${status}</div>
                    <div class="step-time">${timeStr}</div>
                </div>
            </div>
        `;
    });

    document.getElementById('timeline-stepper').innerHTML = stepperHtml;
    const modal = document.getElementById('timeline-modal');
    modal.style.display = 'flex';
    modal.style.opacity = '0';
    setTimeout(() => { modal.style.transition = 'opacity 0.3s'; modal.style.opacity = '1'; }, 10);
}

function closeTimeline() {
    const modal = document.getElementById('timeline-modal');
    modal.style.opacity = '0';
    setTimeout(() => { modal.style.display = 'none'; }, 300);
}

// Close profile when clicking outside
document.addEventListener('click', function (event) {
    const modal = document.getElementById('profile-modal');
    if (modal && event.target === modal) {
        closeProfile();
    }
});

// ========================
// Filter Orders (Search & Status)
// ========================
let currentOrderFilter = 'all';

function filterByStatus(status) {
    currentOrderFilter = status;

    // Update active UI classes
    document.getElementById('card-all').classList.remove('active-filter');
    document.getElementById('card-pending').classList.remove('active-filter');
    document.getElementById('card-completed').classList.remove('active-filter');

    if (status === 'all') document.getElementById('card-all').classList.add('active-filter');
    if (status === 'pending') document.getElementById('card-pending').classList.add('active-filter');
    if (status === 'completed') document.getElementById('card-completed').classList.add('active-filter');

    filterProfileOrders();
}

function filterProfileOrders() {
    const searchBox = document.getElementById('profile-order-search');
    if (!searchBox) return;

    const query = searchBox.value.toLowerCase().trim();
    const orderCards = document.querySelectorAll('#profile-order-list .order-card');

    orderCards.forEach(card => {
        let matchText = true;
        if (query) {
            const orderIdEl = card.querySelector('.order-id-label');
            if (orderIdEl) {
                const orderIdText = orderIdEl.textContent.toLowerCase();
                if (!orderIdText.includes(query)) {
                    matchText = false;
                }
            }
        }

        let matchStatus = true;
        if (currentOrderFilter !== 'all') {
            const pill = card.querySelector('.order-status-pill');
            if (pill) {
                const s = pill.textContent.trim().toLowerCase();
                const isCompleted = s === 'arrived khmer' || s === 'will be send to you' || s === 'success' || s === 'completed';
                if (currentOrderFilter === 'completed' && !isCompleted) matchStatus = false;
                if (currentOrderFilter === 'pending' && isCompleted) matchStatus = false;
            }
        }

        if (matchText && matchStatus) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}
