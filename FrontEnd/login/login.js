// ============================================================
// 📌 login.js — Login/Register with OTP Email Verification
// ============================================================
// ✅ NodeJS Backend API (replaces Google Apps Script)
const API_BASE   = CONFIG.API_BASE;
const AUTH_BASE  = API_BASE + '/user';    // /user/login, /user/register, etc.
const OTP_BASE   = API_BASE + '/otp';     // /otp/generate, /otp/verify

// Temporary storage for registration data during OTP flow
let pendingRegistration = null;

// ========================
// Tab Switching
// ========================
function switchTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const otpStep = document.getElementById('otp-step');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const indicator = document.getElementById('tab-indicator');
    const subtitle = document.querySelector('.subtitle');

    // Clear errors
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
    document.getElementById('otp-error').textContent = '';

    // Hide OTP step when switching tabs
    otpStep.style.display = 'none';

    if (tab === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        indicator.classList.remove('right');
        subtitle.textContent = 'Welcome back! Please sign in to continue.';
    } else {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
        indicator.classList.add('right');
        subtitle.textContent = 'Create an account to start shopping!';
    }
}

// ========================
// Toggle Password Visibility
// ========================
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

// ========================
// Handle Login
// ========================
async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    errorEl.textContent = '';
    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.btn-loader').style.display = 'inline';
    btn.disabled = true;

    try {
        const response = await fetch(AUTH_BASE + '/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.status === 'success') {
            // Save session to localStorage
            localStorage.setItem('jj_userId', result.userId);
            localStorage.setItem('jj_username', result.username);
            localStorage.setItem('jj_loggedIn', 'true');
            localStorage.setItem('jj_email', result.email || '');
            localStorage.setItem('jj_regDate', result.registerDate || '');

            // Redirect to main store
            window.location.href = '../index.html';
        } else {
            errorEl.textContent = result.message;
            errorEl.classList.add('shake');
            setTimeout(() => errorEl.classList.remove('shake'), 500);
        }
    } catch (error) {
        errorEl.textContent = 'Connection error. Please try again.';
        errorEl.classList.add('shake');
        setTimeout(() => errorEl.classList.remove('shake'), 500);
    } finally {
        btn.querySelector('.btn-text').style.display = 'inline';
        btn.querySelector('.btn-loader').style.display = 'none';
        btn.disabled = false;
    }
}

// ========================
// Handle Register (Step 1: Check Availability + Send OTP)
// ========================
async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const errorEl = document.getElementById('register-error');
    const btn = document.getElementById('register-btn');

    errorEl.textContent = '';

    // Validate email
    if (!email) {
        errorEl.textContent = 'Email is required for verification.';
        errorEl.classList.add('shake');
        setTimeout(() => errorEl.classList.remove('shake'), 500);
        return;
    }

    // Validate password match
    if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match!';
        errorEl.classList.add('shake');
        setTimeout(() => errorEl.classList.remove('shake'), 500);
        return;
    }

    // Validate minimum length
    if (password.length < 4) {
        errorEl.textContent = 'Password must be at least 4 characters.';
        errorEl.classList.add('shake');
        setTimeout(() => errorEl.classList.remove('shake'), 500);
        return;
    }

    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.btn-loader').style.display = 'inline';
    btn.disabled = true;

    try {
        // Step 1: Check if username and email are available
        const response = await fetch(AUTH_BASE + '/check-register', {
            method: 'POST',
            body: JSON.stringify({ username, email }),
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.status === 'success') {
            // Save registration data temporarily (Not registered yet!)
            pendingRegistration = {
                username: username,
                email: email,
                password: password
            };

            // Step 2: Generate OTP via NodeJS /otp/generate
            const otpResponse = await fetch(OTP_BASE + '/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });

            const otpData = await otpResponse.json();

            if (otpData.status === 'SUCCESS') {
                // Step 3: Send OTP via EmailJS
                await emailjs.send("service_uug1k5r", "template_abzvhmj", {
                    to_email: email,
                    otp_code: otpData.otp
                });

                // Show OTP step, hide register form and tabs
                document.getElementById('register-form').classList.remove('active');
                document.getElementById('tab-switcher').style.display = 'none';
                document.getElementById('otp-step').style.display = 'flex';
                document.getElementById('otp-email-display').textContent = email;
                document.querySelector('.subtitle').textContent = 'Almost there! Verify your email.';

                // Clear form
                document.getElementById('register-form').reset();
            } else {
                errorEl.textContent = 'Failed to send OTP: ' + (otpData.message || 'Unknown error');
                errorEl.classList.add('shake');
                setTimeout(() => errorEl.classList.remove('shake'), 500);
            }
        } else {
            errorEl.textContent = result.message;
            errorEl.classList.add('shake');
            setTimeout(() => errorEl.classList.remove('shake'), 500);
        }
    } catch (error) {
        errorEl.textContent = 'Connection error. Please try again.';
        errorEl.classList.add('shake');
        setTimeout(() => errorEl.classList.remove('shake'), 500);
    } finally {
        btn.querySelector('.btn-text').style.display = 'inline';
        btn.querySelector('.btn-loader').style.display = 'none';
        btn.disabled = false;
    }
}

// ========================
// Handle OTP Verification (Step 2: Verify OTP + Register Account)
// ========================
async function handleVerifyOTP() {
    const otpInput = document.getElementById('otp-input').value.trim();
    const errorEl = document.getElementById('otp-error');
    const btn = document.getElementById('otp-verify-btn');

    errorEl.textContent = '';

    if (!otpInput || otpInput.length !== 6) {
        errorEl.textContent = 'Please enter the 6-digit code.';
        errorEl.classList.add('shake');
        setTimeout(() => errorEl.classList.remove('shake'), 500);
        return;
    }

    if (!pendingRegistration) {
        errorEl.textContent = 'Registration data lost. Please try again.';
        return;
    }

    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.btn-loader').style.display = 'inline';
    btn.disabled = true;

    try {
        // First verify the OTP
        const response = await fetch(OTP_BASE + '/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: pendingRegistration.email,
                otp: otpInput
            })
        });

        const data = await response.json();

        if (data.status === 'SUCCESS') {
            // ✅ OTP verified! NOW we register the user in the database
            const regResponse = await fetch(AUTH_BASE + '/register', {
                method: 'POST',
                body: JSON.stringify({
                    username: pendingRegistration.username,
                    password: pendingRegistration.password,
                    email: pendingRegistration.email
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            const regResult = await regResponse.json();

            if (regResult.status === 'success') {
                // Auto-login the user
                localStorage.setItem('jj_userId', regResult.userId);
                localStorage.setItem('jj_username', regResult.username);
                localStorage.setItem('jj_loggedIn', 'true');
                localStorage.setItem('jj_email', regResult.email);
                localStorage.setItem('jj_regDate', regResult.registerDate);

                // Show success modal with User ID
                document.getElementById('new-user-id').textContent = regResult.userId;
                document.getElementById('otp-step').style.display = 'none';
                document.getElementById('success-modal').style.display = 'flex';
            } else {
                errorEl.textContent = 'Registration failed: ' + regResult.message;
                errorEl.classList.add('shake');
                setTimeout(() => errorEl.classList.remove('shake'), 500);
            }
        } else {
            errorEl.textContent = data.message || 'Invalid code. Please try again.';
            errorEl.classList.add('shake');
            setTimeout(() => errorEl.classList.remove('shake'), 500);
        }
    } catch (error) {
        errorEl.textContent = 'Verification failed. Please try again.';
        errorEl.classList.add('shake');
        setTimeout(() => errorEl.classList.remove('shake'), 500);
    } finally {
        btn.querySelector('.btn-text').style.display = 'inline';
        btn.querySelector('.btn-loader').style.display = 'none';
        btn.disabled = false;
    }
}

// ========================
// Resend OTP
// ========================
async function handleResendOTP() {
    const errorEl = document.getElementById('otp-error');
    const resendBtn = document.getElementById('otp-resend-btn');

    if (!pendingRegistration) {
        errorEl.textContent = 'Registration data lost. Please try again.';
        return;
    }

    resendBtn.textContent = 'Sending...';
    resendBtn.disabled = true;
    errorEl.textContent = '';

    try {
        // Generate new OTP
        const otpResponse = await fetch(OTP_BASE + '/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: pendingRegistration.email })
        });

        const otpData = await otpResponse.json();

        if (otpData.status === 'SUCCESS') {
            // Send via EmailJS
            await emailjs.send("service_uug1k5r", "template_abzvhmj", {
                to_email: pendingRegistration.email,
                otp_code: otpData.otp
            });

            errorEl.textContent = '✅ New OTP sent! Check your inbox.';
            errorEl.style.color = '#2ecc71';
            setTimeout(() => {
                errorEl.textContent = '';
                errorEl.style.color = '';
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
// Close Success Modal → Go to Store (Auto-Login)
// ========================
function closeSuccessModal() {
    document.getElementById('success-modal').style.display = 'none';
    pendingRegistration = null;
    // Already logged in via localStorage, redirect to store
    window.location.href = '../index.html';
}

// ========================
// Auth Check — Redirect if already logged in
// ========================
function checkAuth() {
    if (localStorage.getItem('jj_loggedIn') === 'true') {
        window.location.href = '../index.html';
    }
}

// ========================
// Logout function (used from header — defined here for login page context)
// ========================
function logout() {
    localStorage.removeItem('jj_userId');
    localStorage.removeItem('jj_username');
    localStorage.removeItem('jj_loggedIn');
    localStorage.removeItem('jj_email');
    localStorage.removeItem('jj_regDate');
    window.location.href = 'login/login.html';
}

// ============================================================
// 🔑 FORGOT PASSWORD FLOW
// ============================================================

// Email for the forgot password flow
let forgotEmail = '';

// Show Forgot Password Step 1
function showForgotPassword() {
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.remove('active');
    document.getElementById('tab-switcher').style.display = 'none';
    document.getElementById('otp-step').style.display = 'none';
    document.getElementById('forgot-step1').style.display = 'flex';
    document.getElementById('forgot-step2').style.display = 'none';
    document.getElementById('forgot-step3').style.display = 'none';
    document.querySelector('.subtitle').textContent = 'Reset your password.';
    document.getElementById('forgot-error').textContent = '';
}

// Back to Login
function backToLogin() {
    document.getElementById('forgot-step1').style.display = 'none';
    document.getElementById('forgot-step2').style.display = 'none';
    document.getElementById('forgot-step3').style.display = 'none';
    document.getElementById('tab-switcher').style.display = 'flex';
    document.getElementById('login-form').classList.add('active');
    document.querySelector('.subtitle').textContent = 'Welcome back! Please sign in to continue.';
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-register').classList.remove('active');
    document.getElementById('tab-indicator').classList.remove('right');
}

// Step 1: Send OTP to email
async function handleForgotSendOTP() {
    const email = document.getElementById('forgot-email').value.trim();
    const errorEl = document.getElementById('forgot-error');
    const btn = document.getElementById('forgot-send-btn');

    errorEl.textContent = '';

    if (!email) {
        errorEl.textContent = 'Please enter your email.';
        errorEl.classList.add('shake');
        setTimeout(() => errorEl.classList.remove('shake'), 500);
        return;
    }

    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.btn-loader').style.display = 'inline';
    btn.disabled = true;

    try {
        // --- Check if email is registered ---
        const checkResponse = await fetch(AUTH_BASE + '/check-email', {
            method: 'POST',
            body: JSON.stringify({ email: email }),
            headers: { 'Content-Type': 'application/json' }
        });
        const checkData = await checkResponse.json();

        if (checkData.status === 'error' && checkData.message === 'Email not found.') {
            // Reset button state
            btn.querySelector('.btn-text').style.display = 'inline';
            btn.querySelector('.btn-loader').style.display = 'none';
            btn.disabled = false;

            // Notification
            alert("This email is not registered. Please register first.");

            // Go back to register tab
            document.getElementById('forgot-step1').style.display = 'none';
            document.getElementById('tab-switcher').style.display = 'flex';
            switchTab('register');

            // Pre-fill email in register form
            document.getElementById('register-email').value = email;
            document.getElementById('forgot-email').value = '';
            return;
        }

        // Generate OTP
        const otpResponse = await fetch(OTP_BASE + '/generate', {
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

            forgotEmail = email;

            // Show Step 2
            document.getElementById('forgot-step1').style.display = 'none';
            document.getElementById('forgot-step2').style.display = 'flex';
            document.getElementById('forgot-email-display').textContent = email;
            document.querySelector('.subtitle').textContent = 'Check your email for the code.';
        } else {
            errorEl.textContent = 'Failed to send OTP: ' + (otpData.message || 'Unknown error');
        }
    } catch (error) {
        errorEl.textContent = 'Connection error. Please try again.';
    } finally {
        btn.querySelector('.btn-text').style.display = 'inline';
        btn.querySelector('.btn-loader').style.display = 'none';
        btn.disabled = false;
    }
}

// Step 2: Verify OTP
async function handleForgotVerifyOTP() {
    const otpInput = document.getElementById('forgot-otp-input').value.trim();
    const errorEl = document.getElementById('forgot-otp-error');
    const btn = document.getElementById('forgot-verify-btn');

    errorEl.textContent = '';

    if (!otpInput || otpInput.length !== 6) {
        errorEl.textContent = 'Please enter the 6-digit code.';
        errorEl.classList.add('shake');
        setTimeout(() => errorEl.classList.remove('shake'), 500);
        return;
    }

    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.btn-loader').style.display = 'inline';
    btn.disabled = true;

    try {
        const response = await fetch(OTP_BASE + '/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: forgotEmail,
                otp: otpInput
            })
        });

        const data = await response.json();

        if (data.status === 'SUCCESS') {
            // Show Step 3: New Password
            document.getElementById('forgot-step2').style.display = 'none';
            document.getElementById('forgot-step3').style.display = 'flex';
            document.querySelector('.subtitle').textContent = 'Create your new password.';
        } else {
            errorEl.textContent = data.message || 'Invalid code. Please try again.';
            errorEl.classList.add('shake');
            setTimeout(() => errorEl.classList.remove('shake'), 500);
        }
    } catch (error) {
        errorEl.textContent = 'Verification failed. Please try again.';
    } finally {
        btn.querySelector('.btn-text').style.display = 'inline';
        btn.querySelector('.btn-loader').style.display = 'none';
        btn.disabled = false;
    }
}

// Step 3: Set New Password
async function handleForgotResetPassword() {
    const newPassword = document.getElementById('forgot-new-password').value;
    const confirmPassword = document.getElementById('forgot-confirm-password').value;
    const errorEl = document.getElementById('forgot-pw-error');
    const btn = document.getElementById('forgot-reset-btn');

    errorEl.textContent = '';

    if (!newPassword || !confirmPassword) {
        errorEl.textContent = 'Please fill in both fields.';
        errorEl.classList.add('shake');
        setTimeout(() => errorEl.classList.remove('shake'), 500);
        return;
    }

    if (newPassword !== confirmPassword) {
        errorEl.textContent = 'Passwords do not match!';
        errorEl.classList.add('shake');
        setTimeout(() => errorEl.classList.remove('shake'), 500);
        return;
    }

    if (newPassword.length < 4) {
        errorEl.textContent = 'Password must be at least 4 characters.';
        errorEl.classList.add('shake');
        setTimeout(() => errorEl.classList.remove('shake'), 500);
        return;
    }

    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.btn-loader').style.display = 'inline';
    btn.disabled = true;

    try {
        const response = await fetch(AUTH_BASE + '/reset-password', {
            method: 'POST',
            body: JSON.stringify({
                email: forgotEmail,
                newPassword: newPassword
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.status === 'success') {
            // Show success modal
            document.getElementById('forgot-step3').style.display = 'none';
            document.getElementById('forgot-success-modal').style.display = 'flex';
            forgotEmail = '';
        } else {
            errorEl.textContent = result.message;
            errorEl.classList.add('shake');
            setTimeout(() => errorEl.classList.remove('shake'), 500);
        }
    } catch (error) {
        errorEl.textContent = 'Connection error. Please try again.';
    } finally {
        btn.querySelector('.btn-text').style.display = 'inline';
        btn.querySelector('.btn-loader').style.display = 'none';
        btn.disabled = false;
    }
}

// Resend OTP for Forgot Password
async function handleForgotResendOTP() {
    const errorEl = document.getElementById('forgot-otp-error');

    if (!forgotEmail) {
        errorEl.textContent = 'Email not found. Please go back and try again.';
        return;
    }

    errorEl.textContent = '⏳ Sending new code...';
    errorEl.style.color = '';

    try {
        const otpResponse = await fetch(OTP_BASE + '/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: forgotEmail })
        });

        const otpData = await otpResponse.json();

        if (otpData.status === 'SUCCESS') {
            await emailjs.send("service_uug1k5r", "template_abzvhmj", {
                to_email: forgotEmail,
                otp_code: otpData.otp
            });

            errorEl.textContent = '✅ New code sent! Check your inbox.';
            errorEl.style.color = '#2ecc71';
            setTimeout(() => {
                errorEl.textContent = '';
                errorEl.style.color = '';
            }, 3000);
        } else {
            errorEl.textContent = 'Failed to resend. Please try again.';
        }
    } catch (error) {
        errorEl.textContent = 'Connection error. Please try again.';
    }
}

// Close Forgot Success Modal → Go to Login
function closeForgotSuccessModal() {
    document.getElementById('forgot-success-modal').style.display = 'none';
    backToLogin();
}

// Run auth check on page load
checkAuth();

