# JingJang Store — Frontend Architecture & React Migration Guide (with Google Apps Script Integration)

> **Document Scope:** This documentation provides a comprehensive guide for the **JingJang Store** frontend and its migration to **React (Vite)**. It connects directly to your live **Google Apps Script backend endpoints** for Authentication, OTP Email verification, Order Processing, and Profile/Order Tracking.

---

## Table of Contents
1. [Google Apps Script Endpoints Configuration](#1-google-apps-script-endpoints-configuration)
2. [Existing Website Overview & Frontend Architecture](#2-existing-website-overview--frontend-architecture)
3. [Design System & CSS Styling Guide](#3-design-system--css-styling-guide)
4. [HTML, CSS & JavaScript Component Breakdown](#4-html-css--javascript-component-breakdown)
   - 4.1 [Header & Navigation](#41-header--navigation)
   - 4.2 [Home & Product Catalog](#42-home--product-catalog)
   - 4.3 [Product Card with Multi-Image Slider & Variant Swatches](#43-product-card-with-multi-image-slider--variant-swatches)
   - 4.4 [Cart Drawer System](#44-cart-drawer-system)
   - 4.5 [Checkout & Payment Modal (with Google Sheets Order API)](#45-checkout--payment-modal)
   - 4.6 [About Us & Pre-Order Policy](#46-about-us--pre-order-policy)
   - 4.7 [Contact Page & EmailJS Integration](#47-contact-page--emailjs-integration)
   - 4.8 [Authentication & OTP Verification (with Auth Apps Script)](#48-authentication--otp-verification)
   - 4.9 [User Profile & Live Order Timeline Tracker](#49-user-profile--live-order-timeline-tracker)
   - 4.10 [Password-Protected Logout Modal](#410-password-protected-logout-modal)
5. [React Architecture & Project Structure](#5-react-architecture--project-structure)
6. [Complete React Component Implementation](#6-complete-react-component-implementation)
   - 6.1 [Google Apps Script API Config (`src/config/api.js`)](#61-google-apps-script-api-config)
   - 6.2 [Product Catalog Data (`src/data/products.js`)](#62-product-catalog-data)
   - 6.3 [Cart Context (`src/context/CartContext.jsx`)](#63-cart-context)
   - 6.4 [Auth Context with Live Backend (`src/context/AuthContext.jsx`)](#64-auth-context-with-live-backend)
   - 6.5 [Header Component (`src/components/Header.jsx`)](#65-header-component)
   - 6.6 [Product Card & Slider (`src/components/ProductCard.jsx`)](#66-product-card--slider)
   - 6.7 [Cart Drawer (`src/components/CartDrawer.jsx`)](#67-cart-drawer)
   - 6.8 [Checkout Modal with Live Order Submission (`src/components/CheckoutModal.jsx`)](#68-checkout-modal-with-live-order-submission)
   - 6.9 [Profile Modal with Live Orders & Password Change (`src/components/ProfileModal.jsx`)](#69-profile-modal-with-live-orders--password-change)
   - 6.10 [Auth Modal with OTP & Tab Switcher (`src/components/AuthModal.jsx`)](#610-auth-modal-with-otp--tab-switcher)
   - 6.11 [Logout Security Modal with Backend Verification (`src/components/LogoutModal.jsx`)](#611-logout-security-modal-with-backend-verification)
   - 6.12 [About Page (`src/pages/AboutPage.jsx`)](#612-about-page)
   - 6.13 [Contact Page (`src/pages/ContactPage.jsx`)](#613-contact-page)
   - 6.14 [Main App Entry (`src/App.jsx`)](#614-main-app-entry)
7. [CORS & Google Apps Script Fetch Best Practices](#7-cors--google-apps-script-fetch-best-practices)

---

## 1. Google Apps Script Endpoints Configuration

The React application connects to the following deployed **Google Apps Script Web App URLs**:

| API Service | Endpoint URL | Supported Actions |
| :--- | :--- | :--- |
| **Authentication API** | `https://script.google.com/macros/s/AKfycbyY-fC1c85KIyE67-GjVnCCt6efWSE_UajqqyTcJgFyA81uxYyY5pxYKnqyQwFo9qoI/exec` | `login`, `register`, `verifyPassword`, `changePassword`, `getUserInfo` |
| **Order & History API** | `https://script.google.com/macros/s/AKfycbzJRRzQQosvMbRjzskIBCce2feA6kfSNBpWtWT5nstMLr903o3IEV21gIoOdvLof5S8-w/exec` | `POST` (Save order + Receipt image), `GET ?action=searchByUser&userId=...` |
| **OTP Verification API** | `https://script.google.com/macros/s/AKfycbwU4hROzM4HHOgaV7kH5N1Cv0Ai4jAWda291yjQvnyWOAMP9tn41uXuP1i8fmAeYS1Qyw/exec` | `generate` (Generate 6-digit OTP), `verify` (Validate code) |
| **EmailJS Service** | `https://cdn.jsdelivr.net/npm/@emailjs/browser@4` | Service: `service_jhndxtb`, Template: `template_gxxvf9e`, Key: `NFPYtavChA35rx-xd` |

---

## 2. Existing Website Overview & Frontend Architecture

The original website is structured as a **Vanilla Single-Page Application (SPA)**:

```
                  ┌─────────────────────────────────────────┐
                  │               index.html                │
                  │   - Main Shell & Dynamic Router         │
                  │   - localStorage Component Cache Engine │
                  └────────────────────┬────────────────────┘
                                       │
        ┌──────────────┬───────────────┼───────────────┬──────────────┐
        ▼              ▼               ▼               ▼              ▼
  ┌───────────┐  ┌───────────┐   ┌───────────┐   ┌───────────┐  ┌───────────┐
  │  header/  │  │   main/   │   │   cart/   │   │ checkout/ │  │ profile/  │
  │ HTML, CSS │  │ HTML, CSS │   │ HTML, CSS │   │ HTML, CSS │  │ HTML, CSS │
  │ Auth UI   │  │ JS Slider │   │ JS State  │   │ JS QR/GPS │  │ Live Track│
  └───────────┘  └───────────┘   └───────────┘   └───────────┘  └───────────┘
        │              │               │               │              │
        └──────────────┴───────┬───────┴───────────────┴──────────────┘
                               │
                               ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                 Google Apps Script APIs                     │
        │  • AUTH_API_URL  • ORDER_API_URL  • OTP_SCRIPT_URL          │
        └─────────────────────────────────────────────────────────────┘
```

### Key Frontend Mechanisms:
* **HTML Component Ingestion:** `index.html` uses `fetch()` and `innerHTML` to dynamically inject component templates into `<div id="*-container">` containers.
* **Smart LocalStorage Caching:** Injected HTML fragments are stored in `localStorage` under `jj_html_*` keys for instant loading upon subsequent visits.
* **Smooth Page Transitions:** Seamless switching between `home`, `about`, and `contact` views using CSS opacity and `translateY` animations.
* **Persistent Session:** Client-side credentials and status are maintained across browser reloads (`jj_loggedIn`, `jj_userId`, `jj_username`, `jj_email`, `jj_regDate`).

---

## 3. Design System & CSS Styling Guide

### 🎨 Color Palette
| Token Name | Hex Code | Usage |
| :--- | :--- | :--- |
| **Primary Green** | `#3b665b` / `#2c4d44` | Header accents, CTA buttons, active radio indicators |
| **Price & Alert Red** | `#e74c3c` / `#c0392b` | Product prices, logout confirmation button, error messages |
| **Soft Background** | `#f4f7f6` | Page background, product image container background |
| **Elevated Card** | `#ffffff` | Product cards, popups, dropdown panels |
| **Text Dark** | `#2c3e50` | Primary headings, product titles |
| **Text Muted** | `#7f8c8d` | Technical specifications, order dates |
| **ABA Bank Blue** | `#005bb5` | ABA deeplink anchor color |
| **ACLEDA Bank** | `#0d47a1` | ACLEDA deeplink anchor color |

### 🖋️ Typography & Visual Polish
* **Typography:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
* **Card Elevation:** `box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05)` (Hover: `0 20px 40px rgba(0, 0, 0, 0.12)`)
* **White Background Image Blending:** `mix-blend-mode: multiply` on product slides.
* **Spring Animation:** `cubic-bezier(0.175, 0.885, 0.32, 1.275)` for modal entrances.

---

## 4. HTML, CSS & JavaScript Component Breakdown

### 4.1 Header & Navigation
* **Files:** `header/header.html`, `header/header.css`
* **Features:** Responsive hamburger toggle for mobile devices, dynamic authentication status (Login button vs. Profile Avatar + Username + User ID + Logout), and cart counter badge.

### 4.2 Home & Product Catalog
* **Files:** `main/main.html`, `main/main.css`, `main/main.js`
* **Features:** Responsive CSS grid auto-fitting products with staggered `fadeInUp` animation delays.

### 4.3 Product Card with Multi-Image Slider & Variant Swatches
* **Interactive Image Carousel:** Left/Right navigation buttons driving `moveSlide()` to toggle active slides.
* **Color Swatches:** Custom styled radio buttons triggering real-time active rings.
* **Add to Cart:** Validates login status (`localStorage.getItem('jj_loggedIn')`) before appending the selected item with color variant into the cart array.

### 4.4 Cart Drawer System
* **Files:** `cart/cart.html`, `cart/cart.css`, `cart/cart.js`
* **Features:** Slide-out right sidebar drawer (`#cart-sidebar.open`), dynamic quantity controls (`+` / `-`), auto-removal at zero quantity, and real-time total USD computation.

### 4.5 Checkout & Payment Modal
* **Files:** `checkout/checkout.html`, `checkout/checkout.css`, `checkout/checkout.js`
* **Features:**
  * Custom bank switcher dropdown (ABA with `aba://pay` link & QR vs ACLEDA with deeplink & QR).
  * Geolocation API (`navigator.geolocation.getCurrentPosition()`) to attach GPS Google Maps URLs.
  * `FileReader` image upload preview for payment slip verification.
  * Sends order JSON payload with base64 receipt to `ORDER_API_URL`.

### 4.6 About Us & Pre-Order Policy
* **Files:** `about/about.html`, `about/about.css`
* **Features:** Full 9-point e-commerce policy (100% advance payment, 20-day transit from China to Cambodia, delay exceptions, refund rules, and local delivery fees).

### 4.7 Contact Page & EmailJS Integration
* **Files:** `contact/contact.html`, `contact/contact.css`
* **Features:** Name, email, phone, and message form dispatching emails via `emailjs.sendForm()`.

### 4.8 Authentication & OTP Verification
* **Files:** `login/login.html`, `login.css`, `login.js`, `OTP.html`
* **Features:** Tab switcher (Login / Register), eye icon password visibility toggle, 6-digit OTP verification via `OTP_SCRIPT_URL`, and authentication via `AUTH_API_URL`.

### 4.9 User Profile & Live Order Timeline Tracker
* **Files:** `profile/profile.html`, `profile.css`, `profile.js`
* **Features:**
  * Fetches orders live from `ORDER_API_URL?action=searchByUser&userId=...`.
  * Summary metric cards (Total, Pending, Completed) with interactive click filtering.
  * Live Order ID search filter.
  * 4-Stage visual timeline stepper (Placed → China Warehouse → Shipping to Cambodia → Delivered).
  * Password change form verified with OTP.

### 4.10 Password-Protected Logout Modal
* **Files:** `index.html` (lines 265–350)
* **Features:** Prompts for current password, sends verification payload to `AUTH_API_URL` (`action: 'verifyPassword'`), and clears browser storage upon success.

---

## 5. React Architecture & Project Structure

The project maps cleanly into a standard **Vite + React** architecture:

```
jingjang-store-react/
├── public/
│   └── img/                         # Product images, bank icons & QR codes
├── src/
│   ├── config/
│   │   └── api.js                   # Live Google Apps Script & EmailJS endpoints
│   ├── data/
│   │   └── products.js              # Complete catalog dataset (15 products)
│   ├── context/
│   │   ├── CartContext.jsx          # Shopping cart state & quantity actions
│   │   └── AuthContext.jsx          # Live login, register, logout & profile state
│   ├── components/
│   │   ├── Header.jsx               # Navigation bar & auth triggers
│   │   ├── Footer.jsx               # Footer & copyright
│   │   ├── ProductCard.jsx          # Single product card with image slider
│   │   ├── CartDrawer.jsx           # Slide-out shopping cart sidebar
│   │   ├── CheckoutModal.jsx        # Live order submission to Google Sheets
│   │   ├── ProfileModal.jsx         # Live order history & password management
│   │   ├── AuthModal.jsx            # Live Login, Register & OTP verification
│   │   └── LogoutModal.jsx          # Password-verified logout confirmation
│   ├── pages/
│   │   ├── HomePage.jsx             # Storefront product showcase
│   │   ├── AboutPage.jsx            # Store story & 9-point pre-order policy
│   │   └── ContactPage.jsx          # Contact info & EmailJS dispatch
│   ├── App.jsx                      # App root router & layout provider
│   ├── App.css                      # Unified styles & animations
│   └── main.jsx                     # React DOM entry point
├── package.json
└── vite.config.js
```

---

## 6. Complete React Component Implementation

### 6.1 Google Apps Script API Config
`src/config/api.js`

```javascript
// Google Apps Script & EmailJS Central Configuration
export const API_CONFIG = {
  AUTH_API_URL: 'https://script.google.com/macros/s/AKfycbyY-fC1c85KIyE67-GjVnCCt6efWSE_UajqqyTcJgFyA81uxYyY5pxYKnqyQwFo9qoI/exec',
  ORDER_API_URL: 'https://script.google.com/macros/s/AKfycbzJRRzQQosvMbRjzskIBCce2feA6kfSNBpWtWT5nstMLr903o3IEV21gIoOdvLof5S8-w/exec',
  OTP_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwU4hROzM4HHOgaV7kH5N1Cv0Ai4jAWda291yjQvnyWOAMP9tn41uXuP1i8fmAeYS1Qyw/exec',
  EMAILJS: {
    SERVICE_ID: 'service_jhndxtb',
    TEMPLATE_ID: 'template_gxxvf9e',
    PUBLIC_KEY: 'NFPYtavChA35rx-xd'
  }
};
```

---

### 6.2 Product Catalog Data
`src/data/products.js`

```javascript
export const PRODUCTS = [
  {
    id: "acer-omr228",
    name: "Acer OMR228 1000Hz",
    support: "Computer, android",
    connectivity: "Bluetooth, Type-C, USB-2.4G",
    price: 11.0,
    images: [
      "/img/Mouse aceromr228/1.jpg",
      "/img/Mouse aceromr228/2.jpg",
      "/img/Mouse aceromr228/3.jpg",
      "/img/Mouse aceromr228/4.jpg"
    ],
    colors: [
      { name: "Black", hex: "#2c2c2c" },
      { name: "White", hex: "#f9f9f9", border: true }
    ]
  },
  {
    id: "acer-omw030",
    name: "Acer OMW030 gaming RGB",
    support: "Computer gaming",
    connectivity: "USB wired 7200DPI",
    price: 11.5,
    images: [
      "/img/Mouse aceromw030/1.jpg",
      "/img/Mouse aceromw030/2.jpg",
      "/img/Mouse aceromw030/3.jpg"
    ],
    colors: [
      { name: "Black", hex: "#2c2c2c" },
      { name: "White", hex: "#f9f9f9", border: true }
    ]
  },
  {
    id: "acer-omw950",
    name: "Acer OMW950 gaming RGB",
    support: "Computer gaming",
    connectivity: "USB wired 7200DPI",
    price: 12.0,
    images: [
      "/img/Mouse aceromw950 wired/1.jpg",
      "/img/Mouse aceromw950 wired/2.jpg",
      "/img/Mouse aceromw950 wired/3.jpg",
      "/img/Mouse aceromw950 wired/4.jpg"
    ],
    colors: [
      { name: "Black", hex: "#2c2c2c" },
      { name: "White", hex: "#f9f9f9", border: true }
    ]
  },
  {
    id: "fmouse-m500se",
    name: "FMouse M500SE 4800DPI",
    support: "Computer, Android",
    connectivity: "Bluetooth, Type-C, USB-2.4G",
    price: 17.0,
    images: [
      "/img/Fmouse M500se/1.png",
      "/img/Fmouse M500se/2.jpg",
      "/img/Fmouse M500se/3.jpg",
      "/img/Fmouse M500se/4.jpg",
      "/img/Fmouse M500se/5.jpg"
    ],
    colors: [
      { name: "Black", hex: "#2c2c2c" },
      { name: "White", hex: "#f9f9f9", border: true }
    ]
  },
  {
    id: "fmouse-m233",
    name: "FMouse M233 1600DPI",
    support: "Computer, Android",
    connectivity: "Bluetooth, Type-C, USB-2.4G",
    price: 13.0,
    images: [
      "/img/Fmouse m233/1.jpg",
      "/img/Fmouse m233/2.jpg",
      "/img/Fmouse m233/3.jpg",
      "/img/Fmouse m233/4.jpg",
      "/img/Fmouse m233/5.jpg"
    ],
    colors: [
      { name: "Black", hex: "#2c2c2c" },
      { name: "Pink", hex: "pink" },
      { name: "Orange", hex: "orange" },
      { name: "Blue", hex: "blue" },
      { name: "White", hex: "#f9f9f9", border: true }
    ]
  },
  {
    id: "fmouse-m235pro",
    name: "FMouse M235Pro 4800DPI RGB",
    support: "Computer, Android, IOS",
    connectivity: "Bluetooth, Type-C, USB-2.4G",
    price: 16.0,
    images: [
      "/img/mouse m235 pro/1.jpg",
      "/img/mouse m235 pro/2.jpg",
      "/img/mouse m235 pro/3.jpg",
      "/img/mouse m235 pro/4.jpg",
      "/img/mouse m235 pro/5.jpg"
    ],
    colors: [
      { name: "Black", hex: "#2c2c2c" },
      { name: "Black+Green", hex: "rgb(53, 175, 132)" },
      { name: "White", hex: "#f9f9f9", border: true }
    ]
  },
  {
    id: "aula-sc650",
    name: "Mouse Aula SC650 12000 DPI",
    support: "Computer, Android, IOS",
    connectivity: "Bluetooth, Type-C, USB-2.4G",
    price: 20.0,
    images: [
      "/img/mouse aulaSC650/1.jpg",
      "/img/mouse aulaSC650/2.jpg",
      "/img/mouse aulaSC650/3.jpg",
      "/img/mouse aulaSC650/4.jpg",
      "/img/mouse aulaSC650/5.jpg"
    ],
    colors: [
      { name: "Black", hex: "#2c2c2c" },
      { name: "Pink", hex: "rgb(184, 45, 126)" },
      { name: "White", hex: "#f9f9f9", border: true }
    ]
  },
  {
    id: "gamesir-tegeniria",
    name: "Gamesir Tegeniria",
    support: "Computer",
    connectivity: "USB",
    price: 15.0,
    images: [
      "/img/Gamesir Tegeniria/1.jpg",
      "/img/Gamesir Tegeniria/2.jpg",
      "/img/Gamesir Tegeniria/3.jpg",
      "/img/Gamesir Tegeniria/4.jpg",
      "/img/Gamesir Tegeniria/5.jpg"
    ],
    colors: [
      { name: "Gray", hex: "gray" },
      { name: "White", hex: "#f9f9f9", border: true }
    ]
  },
  {
    id: "gamesir-nova2life",
    name: "Gamesir Nova2Life",
    support: "Computer, Android, IOS",
    connectivity: "Bluetooth, Type-C, USB-Reciver",
    price: 25.0,
    images: [
      "/img/Gamesir nova2life/1.jpg",
      "/img/Gamesir nova2life/2.jpg",
      "/img/Gamesir nova2life/3.jpg",
      "/img/Gamesir nova2life/4.jpg",
      "/img/Gamesir nova2life/5.jpg"
    ],
    colors: [
      { name: "Black", hex: "#2c2c2c" },
      { name: "White", hex: "#f9f9f9", border: true }
    ]
  },
  {
    id: "gamesir-x5life",
    name: "Gamesir X5Life (Type-C)",
    support: "Android & IOS",
    connectivity: "Game App: Gamesir, GameHub",
    price: 22.0,
    images: [
      "/img/Gamesir x5life/gamesir x5life 1.jpg",
      "/img/Gamesir x5life/gamesir x5life 2.jpg",
      "/img/Gamesir x5life/gamesir x5life 3.jpg",
      "/img/Gamesir x5life/gamesir x5life 4.jpg",
      "/img/Gamesir x5life/gamesir x5life 5.jpg"
    ],
    colors: [
      { name: "Pink", hex: "pink" },
      { name: "Black", hex: "#2c2c2c" },
      { name: "White", hex: "#f9f9f9", border: true }
    ]
  },
  {
    id: "mini-stand",
    name: "Mini Stand Computer(1Pair)",
    support: "14inch - 17inch Laptop",
    connectivity: "Flexible for use",
    price: 4.0,
    images: [
      "/img/MiniStandcomputer/1.jpg",
      "/img/MiniStandcomputer/2.jpg"
    ],
    colors: [
      { name: "Black", hex: "#2c2c2c" },
      { name: "White", hex: "#f9f9f9", border: true }
    ]
  },
  {
    id: "anker-cable-light",
    name: "Anker Cable Lightning 60W(0.9m)",
    support: "IOS (iPhone 8 to 14 Pro Max)",
    connectivity: "Lightning 60W Fast Charge",
    price: 12.0,
    images: [
      "/img/AnkerLihtning60w/1.png",
      "/img/AnkerLihtning60w/3.jpg",
      "/img/AnkerLihtning60w/4.jpg"
    ],
    colors: [
      { name: "Black", hex: "#2c2c2c" },
      { name: "White", hex: "#f9f9f9", border: true }
    ]
  },
  {
    id: "anker-cable-100w",
    name: "Anker Cable Type-c 100W(0.9m)",
    support: "Android & IOS (iPhone 15 up)",
    connectivity: "Type-C 100W Power Delivery",
    price: 8.0,
    images: [
      "/img/AnkerCable100W/1.jpg",
      "/img/AnkerCable100W/2.jpg",
      "/img/AnkerCable100W/3.jpg",
      "/img/AnkerCable100W/4.jpg",
      "/img/AnkerCable100W/5.jpg"
    ],
    colors: [
      { name: "Pink", hex: "pink" },
      { name: "Black", hex: "#2c2c2c" },
      { name: "Blue", hex: "#3498db" },
      { name: "White", hex: "#f9f9f9", border: true }
    ]
  },
  {
    id: "jbl-t310c",
    name: "JBL Earphone T310C (Type-C)",
    support: "Android & IOS",
    connectivity: "EQ: BASS, VOCAL, DEFAULT",
    price: 18.0,
    images: [
      "/img/JBL T310C/T310C1.png",
      "/img/JBL T310C/T310C2.jpg",
      "/img/JBL T310C/T310C3.jpg",
      "/img/JBL T310C/T310C4.jpg",
      "/img/JBL T310C/T310C5.jpg"
    ],
    colors: [
      { name: "Red", hex: "red" },
      { name: "Black", hex: "#2c2c2c" },
      { name: "Blue", hex: "#3498db" },
      { name: "White", hex: "#f9f9f9", border: true }
    ]
  },
  {
    id: "anker-zolo-30w",
    name: "Anker Zolo 30W (Type-C)",
    support: "Android & IOS (iPhone 12-16 Pro Max)",
    connectivity: "Fast Charging 30W",
    price: 12.0,
    images: [
      "/img/Anker30W/anker5.png",
      "/img/Anker30W/anker1.jpg",
      "/img/Anker30W/anker2.jpg",
      "/img/Anker30W/anker4.jpg"
    ],
    colors: [
      { name: "Pink", hex: "pink" },
      { name: "Black", hex: "#2c2c2c" },
      { name: "Blue", hex: "#3498db" },
      { name: "White", hex: "#f9f9f9", border: true }
    ]
  }
];
```

---

### 6.3 Cart Context
`src/context/CartContext.jsx`

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('jj_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('jj_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, selectedColor) => {
    const colorSuffix = selectedColor ? ` (ពណ៌: ${selectedColor})` : '';
    const finalName = `${product.name}${colorSuffix}`;

    setCart((prev) => {
      const existing = prev.find((item) => item.name === finalName);
      if (existing) {
        return prev.map((item) =>
          item.name === finalName ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { name: finalName, price: product.price, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (index, delta) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index].quantity += delta;
      if (updated[index].quantity <= 0) {
        updated.splice(index, 1);
      }
      return updated;
    });
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
```

---

### 6.4 Auth Context with Live Backend
`src/context/AuthContext.jsx`

```jsx
import React, { createContext, useContext, useState } from 'react';
import { API_CONFIG } from '../config/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const loggedIn = localStorage.getItem('jj_loggedIn') === 'true';
    if (loggedIn) {
      return {
        username: localStorage.getItem('jj_username') || '',
        userId: localStorage.getItem('jj_userId') || '',
        email: localStorage.getItem('jj_email') || '',
        regDate: localStorage.getItem('jj_regDate') || ''
      };
    }
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Live Login via Google Apps Script
  const login = async (username, password) => {
    const response = await fetch(API_CONFIG.AUTH_API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'login',
        username: username.trim(),
        password: password
      }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });

    const result = await response.json();
    if (result.status === 'success') {
      const userData = {
        username: result.username,
        userId: result.userId,
        email: result.email || '',
        regDate: result.registerDate || ''
      };

      setUser(userData);
      localStorage.setItem('jj_loggedIn', 'true');
      localStorage.setItem('jj_username', userData.username);
      localStorage.setItem('jj_userId', userData.userId);
      localStorage.setItem('jj_email', userData.email);
      localStorage.setItem('jj_regDate', userData.regDate);
      setIsAuthModalOpen(false);
      return { success: true };
    } else {
      return { success: false, message: result.message || 'Invalid username or password.' };
    }
  };

  // Perform Complete Logout
  const performLogout = () => {
    setUser(null);
    localStorage.removeItem('jj_userId');
    localStorage.removeItem('jj_username');
    localStorage.removeItem('jj_loggedIn');
    localStorage.removeItem('jj_email');
    localStorage.removeItem('jj_regDate');
    setIsLogoutModalOpen(false);
    setIsProfileOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        login,
        performLogout,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isProfileOpen,
        setIsProfileOpen,
        isLogoutModalOpen,
        setIsLogoutModalOpen
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

---

### 6.5 Header Component
`src/components/Header.jsx`

```jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Header({ activePage, setActivePage }) {
  const { user, isLoggedIn, setIsAuthModalOpen, setIsProfileOpen, setIsLogoutModalOpen } = useAuth();
  const { totalItems, setIsCartOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="logo" onClick={() => setActivePage('home')}>
        <img src="/img/IMG_3840.PNG" alt="Logo" width="70" height="70" className="logog" />
        <span className="brand-name">JingJang</span>
      </div>

      <span className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>☰</span>

      <nav className={`main-nav ${menuOpen ? 'show' : ''}`} id="nav-menu">
        <ul>
          <li>
            <button className={activePage === 'home' ? 'active-link' : ''} onClick={() => { setActivePage('home'); setMenuOpen(false); }}>
              Home
            </button>
          </li>
          <li>
            <button className={activePage === 'about' ? 'active-link' : ''} onClick={() => { setActivePage('about'); setMenuOpen(false); }}>
              About
            </button>
          </li>
          <li>
            <button className={activePage === 'contact' ? 'active-link' : ''} onClick={() => { setActivePage('contact'); setMenuOpen(false); }}>
              Contact
            </button>
          </li>
        </ul>
      </nav>

      <div className="cta-button">
        {!isLoggedIn ? (
          <button className="header-login-btn" onClick={() => setIsAuthModalOpen(true)}>
            Login
          </button>
        ) : (
          <>
            <div className="user-info" onClick={() => setIsProfileOpen(true)}>
              <span className="header-username">{user.username}</span>
              <span className="header-user-id">{user.userId}</span>
            </div>

            <div className="header-profile-btn" onClick={() => setIsProfileOpen(true)} title="View Profile">
              👤
            </div>

            <button className="logout-btn" onClick={() => setIsLogoutModalOpen(true)} title="Logout">
              <span className="logout-text">Logout</span>
              <img src="/img/logout.png" className="logout-icon" alt="Logout" />
            </button>
          </>
        )}

        <div className="cart-icon" onClick={() => setIsCartOpen(true)}>
          🛒 <span id="cart-count">{totalItems}</span>
        </div>
      </div>
    </header>
  );
}
```

---

### 6.6 Product Card & Slider
`src/components/ProductCard.jsx`

```jsx
import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function ProductCard({ product }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]?.name || '');
  const { addToCart } = useCart();
  const { isLoggedIn, setIsAuthModalOpen } = useAuth();

  const handlePrev = (e) => {
    e.stopPropagation();
    setSlideIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setSlideIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
  };

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      if (window.confirm("You need to login first to add items to cart.\n\nGo to Login page?")) {
        setIsAuthModalOpen(true);
      }
      return;
    }
    addToCart(product, selectedColor);
  };

  return (
    <div className="product-card">
      <div className="image-slider">
        {product.images.map((imgSrc, idx) => (
          <img
            key={idx}
            src={imgSrc}
            alt={product.name}
            className={`slide ${idx === slideIndex ? 'active' : ''}`}
            loading="lazy"
          />
        ))}

        {product.images.length > 1 && (
          <>
            <button className="slider-btn prev" onClick={handlePrev}>&#10094;</button>
            <button className="slider-btn next" onClick={handleNext}>&#10095;</button>
          </>
        )}
      </div>

      <div className="product-info">
        <h3>{product.name}</h3>
        <p className="specs">Suppor: <strong>{product.support}</strong></p>
        <p className="specs"><strong>Connectivity: {product.connectivity}</strong></p>
        <p className="price">${product.price.toFixed(2)}</p>

        {product.colors && product.colors.length > 0 && (
          <div className="color-selection">
            <div className="color-options">
              {product.colors.map((color) => (
                <label key={color.name} className="color-option-label">
                  <input
                    type="radio"
                    name={`color_${product.id}`}
                    value={color.name}
                    checked={selectedColor === color.name}
                    onChange={() => setSelectedColor(color.name)}
                  />
                  <span
                    className="color-swatch"
                    style={{
                      backgroundColor: color.hex,
                      border: color.border ? '1px solid #ddd' : 'none'
                    }}
                    title={color.name}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        <button className="add-to-cart" onClick={handleAddToCart}>
          Add to Cart
        </button>
      </div>
    </div>
  );
}
```

---

### 6.7 Cart Drawer
`src/components/CartDrawer.jsx`

```jsx
import React from 'react';
import { useCart } from '../context/CartContext';

export default function CartDrawer({ onCheckout }) {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, totalPrice } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className={`cart-sidebar ${isCartOpen ? 'open' : ''}`} id="cart-sidebar">
      <div className="cart-header">
        <h2>Your Cart</h2>
        <span className="close-cart" onClick={() => setIsCartOpen(false)}>✖</span>
      </div>

      <div className="cart-items" id="cart-items">
        {cart.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', marginTop: '40px' }}>Cart is empty</p>
        ) : (
          cart.map((item, index) => (
            <div className="cart-item" key={index}>
              <div className="item-info">
                <span className="item-name">{item.name}</span>
                <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
              <div className="qty-controls">
                <button className="qty-btn" onClick={() => updateQuantity(index, -1)}>-</button>
                <span className="qty-num">{item.quantity}</span>
                <button className="qty-btn" onClick={() => updateQuantity(index, 1)}>+</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="cart-footer">
        <h3>Total: $<span id="cart-total">{totalPrice.toFixed(2)}</span></h3>
        <button
          className="cart-checkout-btn"
          disabled={cart.length === 0}
          onClick={() => {
            setIsCartOpen(false);
            onCheckout();
          }}
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
```

---

### 6.8 Checkout Modal with Live Order Submission
`src/components/CheckoutModal.jsx`

```jsx
import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { API_CONFIG } from '../config/api';

export default function CheckoutModal({ isOpen, onClose, onOrderSuccess }) {
  const { cart, totalPrice, clearCart } = useCart();
  const { user } = useAuth();

  const [bankMethod, setBankMethod] = useState('aba'); // 'aba' | 'ac'
  const [bankMenuOpen, setBankMenuOpen] = useState(false);
  const [name, setName] = useState(user?.username || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [receiptBase64, setReceiptBase64] = useState('');
  const [receiptMimeType, setReceiptMimeType] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setReceiptMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const getRealLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setAddress(`https://www.google.com/maps?q=${lat},${lon}`);
          setIsLocating(false);
        },
        () => {
          alert('Location access denied. Please enter manually.');
          setIsLocating(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert("Your browser doesn't support Geolocation.");
    }
  };

  // Submit Order directly to Google Apps Script
  const submitOrder = async (e) => {
    e.preventDefault();

    if (!receiptBase64) {
      alert('Please upload your payment receipt slip.');
      return;
    }

    setIsSubmitting(true);

    const orderData = {
      userId: user?.userId || 'GUEST',
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      note: note.trim() || 'គ្មានចំណាំ',
      total: totalPrice.toFixed(2),
      items: JSON.stringify(cart),
      image: receiptBase64,
      mimeType: receiptMimeType
    };

    try {
      await fetch(API_CONFIG.ORDER_API_URL, {
        method: 'POST',
        body: JSON.stringify(orderData),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });

      alert('Payment Successful! We have received your order.');
      clearCart();
      setReceiptBase64('');
      setReceiptMimeType('');
      onClose();
      if (onOrderSuccess) onOrderSuccess();
    } catch (error) {
      alert('Error sending order. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content">
        <span className="close-modal" onClick={onClose}>✖</span>
        <h2>Checkout & Payment</h2>

        <div className="payment-info">
          <p>Total to Pay: <strong style={{ color: '#e74c3c' }}>${totalPrice.toFixed(2)}</strong></p>

          <div style={{ margin: '15px 0', fontSize: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p style={{ marginBottom: '8px' }}>Method:</p>

            <div className="custom-select-box" onClick={() => setBankMenuOpen(!bankMenuOpen)}>
              <div id="selected-bank">
                <img src={bankMethod === 'aba' ? '/img/ABA.png' : '/img/AC.png'} className="bank-icon" alt="Bank" />
                {bankMethod === 'aba' ? ' ABA' : ' ACLEDA'}
              </div>
              {bankMenuOpen && (
                <div className="bank-options">
                  <div onClick={() => { setBankMethod('aba'); setBankMenuOpen(false); }}>
                    <img src="/img/ABA.png" className="bank-icon" alt="ABA" /> ABA
                  </div>
                  <div onClick={() => { setBankMethod('ac'); setBankMenuOpen(false); }}>
                    <img src="/img/AC.png" className="bank-icon" alt="ACLEDA" /> ACLEDA
                  </div>
                </div>
              )}
            </div>

            <a
              id="payment-link"
              href={bankMethod === 'aba' ? 'https://pay.ababank.com/oRF8/4y0ur1w1' : 'https://acledabank.com.kh/acleda?payment_data=qWY5B2SAUfIhLblxzOtfu5ckLzMHjaSki6Ru0bsOyNK+ylPBgZ0sHH6BeGUscKoE58OqGYCB+0+/7oWYyz8zgsTJ6N1UFR6fIgKzYTC4dNBSP571ZBhr8NiW1VOcGNIzwp6mftkf9IzguusEGUFd8ONloxLNNAw/BQNxsYnPnySIPbhS8RMpf0EpteXXX9HIojN3S+eHDxcvzAKL/su/VQV2g35MTN2izKPWyPmhi4yiRBRS0zBA4p3xcAqn+NjU&key=khqr'}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-block', marginTop: '10px', color: '#005bb5', fontWeight: 'bold', textDecoration: 'none' }}
            >
              {bankMethod === 'aba' ? '🔗 Open ABA Link' : '🔗 Open ACLEDA Link'}
            </a>
          </div>

          <div className="qr-code-section">
            <p>Scan QR to Pay:</p>
            <img
              src={bankMethod === 'aba' ? '/img/abaqr.jpg' : '/img/acqr.JPG'}
              alt="QR Code"
              className="qr-img"
            />
          </div>
        </div>

        <form onSubmit={submitOrder}>
          <div className="input-group">
            <label>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Enter your name" />
          </div>
          <div className="input-group">
            <label>Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="Enter your phone number" />
          </div>
          <div className="input-group">
            <label>Delivery Address</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="Enter your full address" style={{ flex: 1 }} />
              <button
                type="button"
                onClick={getRealLocation}
                disabled={isLocating}
                style={{ padding: '10px 15px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', height: 'fit-content' }}
              >
                {isLocating ? '⏳ Finding...' : '📍 Location'}
              </button>
            </div>
          </div>
          <div className="input-group">
            <label>Note (Optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Example: Please deliver in the afternoon..." />
          </div>
          <div className="input-group">
            <label>Upload Payment Receipt</label>
            <input type="file" accept="image/*" required onChange={handleReceiptUpload} />
            {receiptBase64 && (
              <img src={receiptBase64} alt="Receipt Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', marginTop: '10px', borderRadius: '5px', border: '1px solid #ddd' }} />
            )}
          </div>
          <button type="submit" className="btn submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Processing... Please wait' : 'Confirm Order'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

### 6.9 Profile Modal with Live Orders & Password Change
`src/components/ProfileModal.jsx`

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_CONFIG } from '../config/api';

export default function ProfileModal() {
  const { user, isProfileOpen, setIsProfileOpen } = useAuth();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'settings'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimelineOrder, setSelectedTimelineOrder] = useState(null);

  // Settings State
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });
  const [updatingPw, setUpdatingPw] = useState(false);

  // Live order fetch from Google Apps Script
  const fetchLiveOrders = useCallback(async () => {
    if (!user?.userId) return;
    setLoadingOrders(true);
    try {
      const res = await fetch(`${API_CONFIG.ORDER_API_URL}?action=searchByUser&userId=${encodeURIComponent(user.userId)}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch orders from Google Apps Script:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    if (isProfileOpen && user?.userId) {
      fetchLiveOrders();
    }
  }, [isProfileOpen, user?.userId, fetchLiveOrders]);

  if (!isProfileOpen || !user) return null;

  // Filter logic
  const filteredOrders = orders.filter((o) => {
    const rawStatus = (o.status || '').toLowerCase();
    const isPending = ['pending', 'confirm order', 'ordered', 'in china'].includes(rawStatus);
    const isSuccess = ['arrived khmer', 'will be send to you', 'success', 'completed'].includes(rawStatus);

    if (statusFilter === 'pending' && !isPending) return false;
    if (statusFilter === 'completed' && !isSuccess) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = (o.orderId || o.id || '').toLowerCase().includes(q);
      const matchItems = (o.items || '').toLowerCase().includes(q);
      return matchId || matchItems;
    }
    return true;
  });

  // Convert status string to timeline step number (1 to 4)
  const getTimelineStep = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'arrived khmer' || s === 'completed' || s === 'success') return 4;
    if (s === 'will be send to you' || s === 'shipping') return 3;
    if (s === 'in china' || s === 'ordered') return 2;
    return 1;
  };

  // Change Password via Google Apps Script
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ type: '', text: '' });

    if (newPw.length < 4) {
      setPwMsg({ type: 'error', text: '❌ Password must be at least 4 characters long.' });
      return;
    }

    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: '❌ New passwords do not match.' });
      return;
    }

    setUpdatingPw(true);

    try {
      const response = await fetch(API_CONFIG.AUTH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'changePassword',
          userId: user.userId,
          currentPassword: currentPw,
          newPassword: newPw
        })
      });

      const res = await response.json();
      if (res.status === 'success') {
        setPwMsg({ type: 'success', text: '✅ Password changed successfully!' });
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
      } else {
        setPwMsg({ type: 'error', text: `❌ ${res.message || 'Failed to update password.'}` });
      }
    } catch {
      setPwMsg({ type: 'error', text: '❌ Connection error. Please try again.' });
    } finally {
      setUpdatingPw(false);
    }
  };

  return (
    <div className="profile-overlay" style={{ display: 'flex' }}>
      <div className="profile-panel">
        <button className="profile-close" onClick={() => setIsProfileOpen(false)}>✖</button>

        <div className="profile-header">
          <div className="profile-avatar">{user.username.substring(0, 2).toUpperCase()}</div>
          <h2>{user.username}</h2>
          <span className="profile-badge">{user.userId}</span>
          <p className="profile-joined">Member since: {user.regDate || '—'}</p>
        </div>

        <div className="profile-tabs">
          <button className={`profile-tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            📦 My Orders
          </button>
          <button className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            ⚙️ Settings
          </button>
        </div>

        {activeTab === 'orders' && (
          <div className="profile-tab-content active">
            <div className="orders-summary">
              <div className={`summary-card ${statusFilter === 'all' ? 'active-filter' : ''}`} onClick={() => setStatusFilter('all')}>
                <span className="summary-num">{orders.length}</span>
                <span className="summary-label">Total Orders</span>
              </div>
              <div className={`summary-card ${statusFilter === 'pending' ? 'active-filter' : ''}`} onClick={() => setStatusFilter('pending')}>
                <span className="summary-num">
                  {orders.filter((o) => ['pending', 'confirm order', 'ordered', 'in china'].includes((o.status || '').toLowerCase())).length}
                </span>
                <span className="summary-label">Pending</span>
              </div>
              <div className={`summary-card success-card ${statusFilter === 'completed' ? 'active-filter' : ''}`} onClick={() => setStatusFilter('completed')}>
                <span className="summary-num">
                  {orders.filter((o) => ['arrived khmer', 'will be send to you', 'success', 'completed'].includes((o.status || '').toLowerCase())).length}
                </span>
                <span className="summary-label">Completed</span>
              </div>
            </div>

            <div className="profile-search-container" style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="🔍 Search your Order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '10px 15px', border: '1px solid #e0e0e0', borderRadius: '8px', outline: 'none' }}
              />
            </div>

            <div className="profile-order-list">
              {loadingOrders ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '30px 0' }}>⏳ Loading live orders from Google Sheets...</p>
              ) : filteredOrders.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '30px 0' }}>No orders found.</p>
              ) : (
                filteredOrders.map((ord, idx) => (
                  <div
                    key={ord.orderId || idx}
                    className="order-item-card"
                    onClick={() => setSelectedTimelineOrder(ord)}
                    style={{ cursor: 'pointer', padding: '15px', border: '1px solid #eee', borderRadius: '10px', marginBottom: '10px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <strong>{ord.orderId || `Order #${idx + 1}`}</strong>
                      <span className={`status-tag ${(ord.status || 'pending').toLowerCase()}`}>{ord.status || 'Pending'}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#666' }}>{ord.items}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '14px' }}>
                      <span>Date: {ord.date || ord.timestamp || 'Recent'}</span>
                      <strong style={{ color: '#e74c3c' }}>${ord.total}</strong>
                    </div>
                    <span style={{ fontSize: '12px', color: '#3b665b', display: 'inline-block', marginTop: '5px' }}>
                      🔍 Click to view delivery timeline
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="profile-tab-content active">
            <div className="settings-card">
              <h3>👤 Account Information</h3>
              <div className="info-row"><span className="info-label">Username:</span><span className="info-value">{user.username}</span></div>
              <div className="info-row"><span className="info-label">User ID:</span><span className="info-value">{user.userId}</span></div>
              <div className="info-row"><span className="info-label">Email:</span><span className="info-value">{user.email || '—'}</span></div>
              <div className="info-row"><span className="info-label">Registered:</span><span className="info-value">{user.regDate || '—'}</span></div>
            </div>

            <div className="settings-card" style={{ marginTop: '20px' }}>
              <h3>🔒 Change Password</h3>
              <form onSubmit={handleChangePassword}>
                <div className="settings-input-group">
                  <label>Current Password</label>
                  <input type="password" required value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Enter current password" />
                </div>
                <div className="settings-input-group">
                  <label>New Password</label>
                  <input type="password" required value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Enter new password (min 4 chars)" />
                </div>
                <div className="settings-input-group">
                  <label>Confirm New Password</label>
                  <input type="password" required value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Confirm new password" />
                </div>
                {pwMsg.text && (
                  <div style={{ color: pwMsg.type === 'error' ? '#e74c3c' : '#27ae60', fontSize: '13px', margin: '10px 0' }}>
                    {pwMsg.text}
                  </div>
                )}
                <button type="submit" className="change-pw-btn" disabled={updatingPw}>
                  {updatingPw ? '⏳ Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* 4-Stage Timeline Stepper Popup */}
      {selectedTimelineOrder && (
        <div className="timeline-modal" style={{ display: 'flex' }}>
          <div className="timeline-content">
            <button className="timeline-close" onClick={() => setSelectedTimelineOrder(null)}>✖</button>
            <h3 className="timeline-title">Order Status: {selectedTimelineOrder.orderId || 'Current Order'}</h3>
            <div className="stepper">
              {['Order Placed', 'Processing in China', 'Shipping to Cambodia', 'Delivered'].map((step, idx) => (
                <div key={idx} className={`step-item ${idx + 1 <= getTimelineStep(selectedTimelineOrder.status) ? 'completed' : ''}`}>
                  <div className="step-circle">{idx + 1}</div>
                  <div className="step-label">{step}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 6.10 Auth Modal with OTP & Tab Switcher
`src/components/AuthModal.jsx`

```jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_CONFIG } from '../config/api';

export default function AuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen, login } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  // OTP State
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingRegData, setPendingRegData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isAuthModalOpen) return null;

  // Handle Login via Google Apps Script
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const result = await login(loginUsername, loginPassword);
    if (!result.success) {
      setErrorMsg(result.message);
    }
    setLoading(false);
  };

  // Step 1 of Register: Request OTP via Google Apps Script
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (regPassword !== regConfirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_CONFIG.OTP_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'generate', email: regEmail.trim() })
      });

      const data = await response.json();
      if (data.status === 'SUCCESS' || data.status === 'success') {
        setPendingRegData({
          username: regUsername.trim(),
          email: regEmail.trim(),
          password: regPassword
        });
        setOtpStep(true);
      } else {
        setErrorMsg(data.message || 'Failed to send OTP code.');
      }
    } catch {
      setErrorMsg('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 of Register: Verify OTP & Save Account to Google Sheets
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      // 1. Verify OTP
      const otpRes = await fetch(API_CONFIG.OTP_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'verify',
          email: pendingRegData.email,
          otp: otpCode.trim()
        })
      });

      const otpResult = await otpRes.json();

      if (otpResult.status === 'SUCCESS' || otpResult.status === 'success') {
        // 2. Register user into Auth Google Sheet
        const regRes = await fetch(API_CONFIG.AUTH_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'register',
            username: pendingRegData.username,
            email: pendingRegData.email,
            password: pendingRegData.password
          })
        });

        const regResult = await regRes.json();
        if (regResult.status === 'success') {
          alert('Registration successful! Logging you in...');
          await login(pendingRegData.username, pendingRegData.password);
        } else {
          setErrorMsg(regResult.message || 'Failed to create user account.');
        }
      } else {
        setErrorMsg('Invalid OTP code. Please re-check your email.');
      }
    } catch {
      setErrorMsg('Error verifying OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="login-container" style={{ position: 'relative' }}>
        <button className="profile-close" onClick={() => setIsAuthModalOpen(false)}>✖</button>

        <div className="logo-section">
          <img src="/img/IMG_3840.PNG" alt="Logo" className="login-logo" />
          <h1>JingJang Store</h1>
          <p className="subtitle">
            {otpStep ? 'Verify Your Email' : tab === 'login' ? 'Welcome back! Please sign in.' : 'Create an account to track orders.'}
          </p>
        </div>

        {!otpStep && (
          <div className="tab-switcher">
            <button className={`tab-btn ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setErrorMsg(''); }}>
              Login
            </button>
            <button className={`tab-btn ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setErrorMsg(''); }}>
              Register
            </button>
          </div>
        )}

        {errorMsg && <div className="error-message" style={{ color: '#e74c3c', marginBottom: '10px', fontSize: '13px' }}>{errorMsg}</div>}

        {otpStep ? (
          <form onSubmit={handleVerifyOtp} className="auth-form active">
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
              We sent a 6-digit verification code to <strong>{pendingRegData?.email}</strong>
            </p>
            <div className="input-wrapper">
              <span className="input-icon">🔑</span>
              <input
                type="text"
                placeholder="Enter 6-digit OTP code"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? '⏳ Verifying...' : 'Verify & Create Account'}
            </button>
            <button type="button" className="forgot-password-link" onClick={() => setOtpStep(false)}>
              ⬅ Back to Registration
            </button>
          </form>
        ) : tab === 'login' ? (
          <form className="auth-form active" onSubmit={handleLogin}>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                type="text"
                placeholder="Username or Email"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
              />
            </div>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
              <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? '⏳ Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form className="auth-form active" onSubmit={handleRegister}>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                type="text"
                placeholder="Choose Username"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                required
              />
            </div>
            <div className="input-wrapper">
              <span className="input-icon">📧</span>
              <input
                type="email"
                placeholder="Your Email (for OTP)"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create Password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </div>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="auth-btn register-btn" disabled={loading}>
              {loading ? '⏳ Sending OTP...' : 'Continue to Email Verification'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

---

### 6.11 Logout Security Modal with Backend Verification
`src/components/LogoutModal.jsx`

```jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_CONFIG } from '../config/api';

export default function LogoutModal() {
  const { user, isLogoutModalOpen, setIsLogoutModalOpen, performLogout } = useAuth();
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isLogoutModalOpen) return null;

  const handleConfirmLogout = async () => {
    setErrorMsg('');

    if (!password) {
      setErrorMsg('❌ Please enter your password.');
      return;
    }

    if (!user?.userId) {
      performLogout();
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch(API_CONFIG.AUTH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'verifyPassword',
          userId: user.userId,
          password: password
        })
      });

      const result = await response.json();
      if (result.status === 'success') {
        performLogout();
      } else {
        setErrorMsg('❌ ' + (result.message || 'Incorrect password.'));
      }
    } catch {
      setErrorMsg('❌ Connection error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      id="logout-modal"
      style={{
        display: 'flex',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '35px 30px',
          textAlign: 'center',
          maxWidth: '380px',
          width: '90%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
        }}
      >
        <div style={{ fontSize: '50px', marginBottom: '10px' }}>🔒</div>
        <h2 style={{ color: '#2c3e50', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Confirm Logout</h2>
        <p style={{ color: '#7f8c8d', fontSize: '13px', marginBottom: '20px' }}>Enter your password to confirm logout.</p>

        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConfirmLogout()}
          style={{
            width: '100%',
            padding: '14px 16px',
            border: '2px solid #e0e0e0',
            borderRadius: '12px',
            fontSize: '15px',
            outline: 'none',
            marginBottom: '10px'
          }}
        />

        {errorMsg && <div style={{ color: '#e74c3c', fontSize: '13px', marginBottom: '10px' }}>{errorMsg}</div>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(false)}
            style={{ flex: 1, padding: '13px', border: '2px solid #e0e0e0', borderRadius: '12px', background: '#fff', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmLogout}
            disabled={isVerifying}
            style={{
              flex: 1,
              padding: '13px',
              border: 'none',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isVerifying ? '⏳ Verifying...' : '🔓 Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 6.12 About Page
`src/pages/AboutPage.jsx`

```jsx
import React from 'react';

export default function AboutPage() {
  return (
    <div className="about-container page-active">
      <div className="about-header">
        <h1>About Us</h1>
        <p>ស្វែងយល់បន្ថែមអំពីយើង និងបេសកកម្មរបស់យើង</p>
      </div>

      <div className="about-content">
        <div className="about-card">
          <h2>ប្រវត្តិរបស់យើង (Our Story)</h2>
          <p>យើងផ្តល់ជូននូវផលិតផលដែលមានគុណភាពខ្ពស់ ព្រមទាំងសេវាកម្មដ៏ល្អឥតខ្ចោះដល់អតិថិជន។</p>

          <h2>📦 លក្ខខណ្ឌកម្មង់ទំនិញពីប្រទេសចិន 🇨🇳</h2>
          <p><strong>💳 1. បង់ប្រាក់មុន</strong><br />• អតិថិជនត្រូវបង់ប្រាក់ 100% មុនពេលហាងដាក់កម្មង់។</p>
          <p><strong>🛍️ 2. ទំនិញជាប្រភេទ Pre-Order</strong><br />• ទំនិញត្រូវកម្មង់ផ្ទាល់ពីប្រទេសចិន តាមការកម្មង់របស់អតិថិជន។</p>
          <p><strong>🚚 3. រយៈពេលរង់ចាំ</strong><br />• ទំនិញនឹងមកដល់ក្នុងរយៈពេលប្រហែល 20 ថ្ងៃ (អាចលឿន ឬយឺតជាងនេះបន្តិច)។</p>
          <p><strong>⚠️ 4. ករណីអាចពន្យារពេល</strong><br />ការដឹកជញ្ជូនអាចយឺតដោយសារតែ៖ ថ្ងៃបុណ្យនៅប្រទេសចិន, អាកាសធាតុមិនល្អ, ការត្រួតពិនិត្យគយ, ការពន្យារពេលពីក្រុមហ៊ុនដឹកជញ្ជូន។</p>
          <p><strong>❌ 5. មិនអាចលុប ឬប្ដូរកម្មង់បាន</strong><br />• បន្ទាប់ពីហាងបានដាក់កម្មង់រួច មិនអាចលុប ឬប្ដូរពណ៌ ម៉ូដែល ឬទំហំបានទេ។</p>
          <p><strong>💰 6. គោលការណ៍សងប្រាក់</strong><br />ហាងនឹងសងប្រាក់វិញ តែក្នុងករណីអ្នកផ្គត់ផ្គង់មិនអាចផ្ញើទំនិញបាន ឬទំនិញបាត់បង់ក្នុងការដឹកជញ្ជូន។</p>
          <p><strong>📦 7. ទំនិញខូច ឬខុស</strong><br />• សូមជូនដំណឹងក្នុងរយៈពេល 24 ម៉ោង បន្ទាប់ពីទទួលទំនិញ ព្រមទាំងភ្ជាប់រូបភាព និងវីដេអូជាភស្តុតាង។</p>
          <p><strong>🚚 8. ថ្លៃដឹកជញ្ជូនក្នុងស្រុក</strong><br />• ថ្លៃដឹកជញ្ជូននៅកម្ពុជាគិតតាមតម្លៃរបស់ក្រុមហ៊ុនដឹកជញ្ជូន ឬតាមការជូនដំណឹងរបស់ហាង (2$)។</p>
          <p><strong>🤝 9. ការយល់ព្រម</strong><br />ការធ្វើកម្មង់មានន័យថា អតិថិជនបានអាន និងយល់ព្រមលើលក្ខខណ្ឌទាំងអស់របស់ហាង។</p>
          <p><strong>💖 សូមអរគុណចំពោះការជឿទុកចិត្ត និងគាំទ្រហាងរបស់យើង! 🙏🇰🇭</strong></p>
        </div>

        <div className="about-card">
          <h2>ទំនាក់ទំនង (Contact Us)</h2>
          <p>📍 ទីតាំង: រាជធានីភ្នំពេញ, កម្ពុជា (នៅជិតសាលា តិចណូ)</p>
          <p>📞 ទូរស័ព្ទ: 016 44 16 53</p>
        </div>
      </div>
    </div>
  );
}
```

---

### 6.13 Contact Page
`src/pages/ContactPage.jsx`

```jsx
import React, { useState } from 'react';
import emailjs from '@emailjs/browser';
import { API_CONFIG } from '../config/api';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSending(true);

    emailjs
      .send(
        API_CONFIG.EMAILJS.SERVICE_ID,
        API_CONFIG.EMAILJS.TEMPLATE_ID,
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          title: 'New Contact Form Message',
          message: formData.message
        },
        API_CONFIG.EMAILJS.PUBLIC_KEY
      )
      .then(() => {
        alert('សាររបស់អ្នកត្រូវបានផ្ញើ! (Your message has been sent)');
        setFormData({ name: '', email: '', phone: '', message: '' });
        setSending(false);
      })
      .catch(() => {
        alert('មានបញ្ហា សូមព្យាយាមម្តងទៀត! (Failed to send message)');
        setSending(false);
      });
  };

  return (
    <div className="contact-container page-active">
      <div className="contact-header">
        <h1>Contact Us</h1>
        <p>ទាក់ទងមកយើងខ្ញុំសម្រាប់ព័ត៌មានបន្ថែម ឬសួរសំណួរផ្សេងៗ</p>
      </div>

      <div className="contact-content">
        <form className="contact-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="ឈ្មោះរបស់អ្នក (Name)"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <input
            type="email"
            placeholder="អ៊ីមែល (Email)"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <input
            type="tel"
            placeholder="លេខទូរស័ព្ទ (Phone Number)"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <textarea
            placeholder="សាររបស់អ្នក (Message)"
            rows="5"
            required
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          />
          <button type="submit" disabled={sending}>
            {sending ? 'កំពុងផ្ញើ...' : 'ផ្ញើសារ (Send Message)'}
          </button>
        </form>

        <div className="contact-info">
          <h2>ព័ត៌មានលម្អិត</h2>
          <p>📍 ទីតាំង: រាជធានីភ្នំពេញ, កម្ពុជា</p>
          <p>📞 ទូរស័ព្ទ: 016 44 16 53</p>
          <p>📧 អ៊ីមែល: <a href="mailto:phaijingpo016441653@gmail.com" target="_blank" rel="noreferrer">support@jingjang.com</a></p>
          <p>✈️ Telegram: <a href="https://t.me/Jingpophai" target="_blank" rel="noreferrer">PHAI JINGPO</a></p>
        </div>
      </div>
    </div>
  );
}
```

---

### 6.14 Main App Entry
`src/App.jsx`

```jsx
import React, { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ProductCard from './components/ProductCard';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import ProfileModal from './components/ProfileModal';
import AuthModal from './components/AuthModal';
import LogoutModal from './components/LogoutModal';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';

import { PRODUCTS } from './data/products';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function MainAppContent() {
  const [activePage, setActivePage] = useState('home');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  return (
    <div className="app-layout">
      <Header activePage={activePage} setActivePage={setActivePage} />

      <main className="main-viewport">
        {activePage === 'home' && (
          <div className="main-content page-active">
            <section className="product-grid">
              {PRODUCTS.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </section>
          </div>
        )}

        {activePage === 'about' && <AboutPage />}
        {activePage === 'contact' && <ContactPage />}
      </main>

      <Footer onNavigate={setActivePage} />

      {/* Drawers & Popups */}
      <CartDrawer onCheckout={() => setIsCheckoutOpen(true)} />
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
      <ProfileModal />
      <AuthModal />
      <LogoutModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainAppContent />
      </CartProvider>
    </AuthProvider>
  );
}
```

---

## 7. CORS & Google Apps Script Fetch Best Practices

When fetching from Google Apps Script in React:
1. **Always use `headers: { 'Content-Type': 'text/plain;charset=utf-8' }`:**
   Google Apps Script triggers CORS preflight errors if you pass `application/json`. Passing `text/plain` bypasses the preflight while allowing `JSON.parse(e.postData.contents)` to successfully parse JSON on the server.
2. **Follow 302 Redirects:** The browser `fetch()` API automatically handles the Google Apps Script redirection transparently.
3. **Response format:** Ensure your backend responds with `ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON)`.

---
*Created for JingJang Store Front-end & Google Apps Script React Architecture Documentation.*
