# Project Overview: JingJng-store (Project Seller)

This document provides a comprehensive overview of the `Project Seller` codebase (also branded as **JingJng-store**). It explains the architecture, the technology stack, how the frontend and backend communicate, and the folder structure.

## 1. Architecture & Technology Stack

The project is built as a lightweight, custom **Single Page Application (SPA)** using purely vanilla web technologies without any heavy frontend frameworks (like React or Angular) or traditional backend servers (like Node.js or Python).

### **Frontend**
*   **HTML, CSS, JavaScript (Vanilla):** The core of the application.
*   **Component-Based SPA:** Instead of reloading the page for every navigation, `index.html` acts as an empty shell. It uses JavaScript (`fetch`) to dynamically load HTML components (like the header, footer, cart, checkout, profile) into specific `div` containers and caches them in the browser's `localStorage` for performance.
*   **EmailJS:** Integrated (via CDN) to handle sending contact or notification emails directly from the frontend (seen in `main.js`).
*   **Google Fonts:** Uses the "Inter" font family.

### **Backend & Database**
*   **Google Apps Script (Serverless API):** The project uses Google Apps Script (GAS) deployed as Web Apps to serve as backend REST APIs. 
*   **Google Sheets (Database):** The GAS scripts interact with Google Sheets, treating them as tables for a database (e.g., a "Users" sheet for authentication data).

---

## 2. Directory Structure

The project is structured into distinct, feature-based directories under `Website/`:

*   **`index.html`**: The main entry point. It contains empty containers (`<div id="header-container"></div>`, etc.) and the core JavaScript logic (`loadComponents()`) to fetch HTML files from subdirectories and inject them. It also handles page routing (showing/hiding containers like `main-container`, `about-container`).
*   **Component Directories (`header/`, `footer/`, `main/`, `about/`, `contact/`, `cart/`, `checkout/`, `login/`, `profile/`)**:
    *   Each of these directories represents a section of the application.
    *   They typically contain an `.html` file for the structure, a `.css` file for styling, and a `.js` file for specific logic (e.g., `cart.js` manages cart items, `main.js` handles the image sliders).
*   **`img/`**: Stores all the static image assets used across the website.
*   **`google-apps-scripts/`**: Contains the backend code (written in JavaScript for Google Apps Script).
    *   `AuthScript.gs`: Handles user registration, login, changing passwords, and storing user details in a Google Sheet. It encodes passwords in base64.
    *   `OTP.gs`: Likely handles generating and verifying One-Time Passwords for email verification or password resets.
    *   `OrderScript.gs`: Handles receiving cart/checkout data and saving the order information into a Google Sheet.

---

## 3. Data Flow & State Management

### **Component Loading & Caching**
1. When a user visits the site, `index.html` runs `loadComponents()`.
2. It fetches the HTML files from the component directories.
3. To speed up subsequent visits, the fetched HTML strings are saved in the browser's `localStorage` (e.g., `jj_html_header/header.html`). 
4. The system updates the UI instantly using the cache while silently fetching the latest version in the background to update the cache if changes occurred.

### **Authentication**
1. User state is managed via `localStorage`. When a user logs in successfully via the GAS API, flags like `jj_loggedIn`, `jj_userId`, and `jj_username` are saved to the browser.
2. `index.html` has a function `updateHeaderAuthUI()` that checks these `localStorage` variables to determine whether to show the "Login" button or the "Profile/Logout" buttons.
3. The logout process includes a security prompt requiring the user to re-enter their password, which is verified against the GAS backend before clearing the `localStorage` data.

### **API Communication**
Frontend JavaScript files use the native `fetch()` API to send `POST` requests containing JSON payloads (like `{action: "login", username: "...", password: "..."}`) to the URLs of the deployed Google Apps Scripts. The scripts process the data, read/write to Google Sheets, and return JSON responses indicating success or error.

---

## 4. Google Apps Script Endpoints (URLs)

The frontend relies on the following deployed Google Apps Script web app URLs to function:

1. **Authentication API** (`AUTH_URL` / `AUTH_API_URL`):
   - Used for login, registration, password changes, and fetching user info.
   - URL: `https://script.google.com/macros/s/AKfycbyY-fC1c85KIyE67-GjVnCCt6efWSE_UajqqyTcJgFyA81uxYyY5pxYKnqyQwFo9qoI/exec`
   - Found in: `index.html`, `login/login.js`

2. **Order API** (`ORDER_API_URL` / `GOOGLE_SCRIPT_URL`):
   - Used for placing orders during checkout and fetching user order history in the profile.
   - URL: `https://script.google.com/macros/s/AKfycbzJRRzQQosvMbRjzskIBCce2feA6kfSNBpWtWT5nstMLr903o3IEV21gIoOdvLof5S8-w/exec`
   - Found in: `profile/profile.js`, `checkout/checkout.js`

3. **Profile Auth API** (`AUTH_API_URL_PROFILE`):
   - A secondary auth endpoint used specifically within the profile section.
   - URL: `https://script.google.com/macros/s/AKfycbxnEx1_jwY9Brx0ybWziMZgsWui9C3mJK_hT9Oy35gOxGhQux1L1HKt9v9bipGwyjpi/exec`
   - Found in: `profile/profile.js`

4. **OTP API** (`OTP_SCRIPT_URL` / `SCRIPT_URL`):
   - Used for generating and sending One-Time Passwords (OTP).
   - Note: There appear to be two different URLs configured for OTPs depending on the file:
     - `https://script.google.com/macros/s/AKfycbwU4hROzM4HHOgaV7kH5N1Cv0Ai4jAWda291yjQvnyWOAMP9tn41uXuP1i8fmAeYS1Qyw/exec` (in `login.js`)
     - `https://script.google.com/macros/s/AKfycbwmfaNdQbbG-vtc7voYVP5gf6qiSMHTLmwO9bF2g9UIezdh0B7JMoEkIYsbEOWrfkYt6Q/exec` (in `login/OTP.html`)

---

## 5. Summary

This project is a very creative and cost-effective way to build a functional e-commerce site. By leveraging `localStorage` for dynamic component caching and Google Sheets/Apps Script for the backend, it achieves a full-stack SPA experience while being entirely hostable on simple static hosting platforms (like GitHub Pages, Vercel, or Netlify).
