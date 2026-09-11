const express = require('express');
const router = express.Router();
const db = require('../db/database');
const https = require('https');

// ============================================================
// Helper: Send Telegram text messa
// ============================================================
function sendTelegramMessage(BOT_TOKEN, CHAT_ID, message) {
    return new Promise((resolve) => {
        try {
            const payload = JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'HTML' });
            const options = {
                hostname: 'api.telegram.org',
                path: `/bot${BOT_TOKEN}/sendMessage`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            };
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => {
                    const parsed = JSON.parse(body);
                    if (parsed.ok) console.log(`✅ Telegram: message sent (id=${parsed.result.message_id})`);
                    else console.error('❌ Telegram sendMessage error:', parsed.description);
                    resolve();
                });
            });
            req.on('error', (err) => { console.error('❌ Telegram message request failed:', err.message); resolve(); });
            req.write(payload);
            req.end();
        } catch (e) { console.error('❌ Telegram message error:', e.message); resolve(); }
    });
}

// ============================================================
// Helper: Send receipt image to Telegram via sendPhoto (multipart)
// ============================================================
function sendTelegramPhoto(BOT_TOKEN, CHAT_ID, imageBase64, caption) {
    return new Promise((resolve) => {
        try {
            // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
            const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            const imageBuffer = Buffer.from(base64Data, 'base64');

            // Detect image type from base64 header
            const mimeMatch = imageBase64.match(/data:(image\/\w+);base64/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const ext = mimeType.split('/')[1] || 'jpg';

            // Build multipart/form-data manually
            const boundary = '----TelegramBoundary' + Date.now();
            const CRLF = '\r\n';

            const partCaption =
                `--${boundary}${CRLF}` +
                `Content-Disposition: form-data; name="chat_id"${CRLF}${CRLF}` +
                `${CHAT_ID}${CRLF}` +
                `--${boundary}${CRLF}` +
                `Content-Disposition: form-data; name="parse_mode"${CRLF}${CRLF}` +
                `HTML${CRLF}` +
                `--${boundary}${CRLF}` +
                `Content-Disposition: form-data; name="caption"${CRLF}${CRLF}` +
                `${caption}${CRLF}` +
                `--${boundary}${CRLF}` +
                `Content-Disposition: form-data; name="photo"; filename="receipt.${ext}"${CRLF}` +
                `Content-Type: ${mimeType}${CRLF}${CRLF}`;

            const partEnd = `${CRLF}--${boundary}--${CRLF}`;

            const bodyBuffer = Buffer.concat([
                Buffer.from(partCaption, 'utf8'),
                imageBuffer,
                Buffer.from(partEnd, 'utf8')
            ]);

            const options = {
                hostname: 'api.telegram.org',
                path: `/bot${BOT_TOKEN}/sendPhoto`,
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': bodyBuffer.length
                }
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => {
                    const parsed = JSON.parse(body);
                    if (parsed.ok) console.log(`✅ Telegram: receipt photo sent (id=${parsed.result.message_id})`);
                    else console.error('❌ Telegram sendPhoto error:', parsed.description);
                    resolve();
                });
            });
            req.on('error', (err) => { console.error('❌ Telegram photo request failed:', err.message); resolve(); });
            req.write(bodyBuffer);
            req.end();
        } catch (e) { console.error('❌ Telegram photo error:', e.message); resolve(); }
    });
}

// ============================================================
// Main: Send order notification + receipt photo to Telegram
// ============================================================
function sendTelegramNotification(orderData, orderId) {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
        console.warn('⚠️  Telegram: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set in .env');
        return;
    }

    // Build items list
    let itemsText = '';
    try {
        const items = JSON.parse(orderData.Items || '[]');
        items.forEach(item => {
            const priceStr = item.price ? ` — $${parseFloat(item.price).toFixed(2)}` : '';
            itemsText += `\n• <b>${item.name}</b> <b>(x${item.quantity})</b>${priceStr}`;
        });
    } catch (e) {
        itemsText = '\n• ' + (orderData.Items || '');
    }

    const address = (orderData.Address || '');
    const addressLine = address.startsWith('http')
        ? `📍 អាសយដ្ឋាន: <a href='${address}'>🗺️ បើកមើលផែនទី (Google Maps)</a>`
        : `📍 អាសយដ្ឋាន: ${address}`;

    const message =
        `🔔 <b>មានការបញ្ជាទិញថ្មី (New Order)</b>\n\n` +
        `🆔 Order ID: <b>${orderId}</b>\n` +
        `👤 User ID: <b>${orderData.userid || 'GUEST'}</b>\n` +
        `👤 ឈ្មោះ: ${orderData.name || ''}\n` +
        `📞 ទូរស័ព្ទ: <code>${orderData.Phone || ''}</code>\n` +
        `${addressLine}\n` +
        `\n🛍️ <b>ទំនិញដែលបានកុម្ម៉ង់:</b>${itemsText}\n` +
        `\n💰 ទឹកប្រាក់សរុប: <b>$${orderData.Total}</b>\n` +
        `📝 ចំណាំពីភ្ញៀវ: <b>${orderData.Note || 'គ្មាន'}</b>\n`;

    const hasReceipt = orderData.Receipt && orderData.Receipt !== 'No Receipt' && orderData.Receipt.length > 100;

    // Send text first, then photo if receipt exists — all non-blocking
    (async () => {
        if (hasReceipt) {
            // Send receipt photo with message as caption (all in one Telegram message)
            await sendTelegramPhoto(BOT_TOKEN, CHAT_ID, orderData.Receipt, message);
        } else {
            // No receipt — send text only
            await sendTelegramMessage(BOT_TOKEN, CHAT_ID, message + '\n🧾 វិក្កយបត្រ: <i>គ្មានរូបភាព</i>');
        }
    })();
}

// ============================================================
// Order Routes — mirrors OrderScript.gs in Google Apps Script
// ============================================================

// ============================================================
// GET /order — Get all orders (Admin Dashboard)
// ============================================================
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM orders ORDER BY orderid DESC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });

        // Format to match Admin Dashboard response shape
        const formatted = results.map((o, idx) => {
            const d = o.order_date ? new Date(o.order_date) : null;
            const formattedDate = (d && !isNaN(d.getTime())) ? d.toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Phnom_Penh'
            }) : (o.order_date || '-');

            return {
                rowIndex: idx + 2,
                orderId: o.order_id_str || ('ORD-' + ('0000' + o.orderid).slice(-4)),
                userId: o.userid,
                date: formattedDate,
                name: o.name,
                phone: o.Phone,
                address: o.Address,
                total: o.Total,
                items: o.Items,
                receipt: o.Receipt || 'No Receipt',
                status: o.CurrentStatus || 'Pending',
                note: o.Note || 'គ្មាន',
                history: o.status_history || '[]'
            };
        });

        res.json(formatted);
    });
});

// ============================================================
// GET /order/user/:userId — Get orders by User ID string (e.g. JJ-0001)
// (mirrors ?action=searchByUser&userId=... in OrderScript.gs)
// ============================================================
router.get('/user/:userId', (req, res) => {
    const userId = req.params.userId;
    const sql = 'SELECT * FROM orders WHERE userid = ? ORDER BY orderid DESC';

    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });

        const formatted = results.map((o, idx) => ({
            rowIndex: idx + 2,
            orderId: o.order_id_str || ('ORD-' + ('0000' + o.orderid).slice(-4)),
            userId: o.userid,
            date: o.order_date,
            name: o.name,
            phone: o.Phone,
            address: o.Address,
            total: o.Total,
            items: o.Items,
            receipt: o.Receipt || 'No Receipt',
            status: o.CurrentStatus || 'Pending',
            note: o.Note || 'គ្មាន',
            history: o.status_history || '[]'
        }));

        res.json(formatted);
    });
});

// ============================================================
// POST /order — Create a new order
// (mirrors the main POST in OrderScript.gs — no Google Drive upload,
//  receipt is stored as base64 string or URL in MySQL)
// ============================================================
router.post('/', (req, res) => {
    const { userid, name, Phone, Address, Total, Items, Receipt, Note } = req.body;

    if (!Phone || !Total) {
        return res.status(400).json({ status: 'error', message: 'Phone and Total are required.' });
    }

    const safeUserId = userid || 'GUEST';
    const safeNote = Note || 'គ្មាន';
    const safeReceipt = Receipt || 'No Receipt';

    // Generate ORD-XXXX style order ID
    db.query('SELECT COUNT(*) AS cnt FROM orders', (err, countResult) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });

        const newNum = (countResult[0].cnt || 0) + 1;
        const orderId = 'ORD-' + ('0000' + newNum).slice(-4);

        // Initial status history JSON
        const now = new Date();
        const formattedDate = now.toLocaleString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Phnom_Penh'
        });
        const initialHistory = JSON.stringify([{ status: 'Pending', date: formattedDate }]);

        const sql = `
            INSERT INTO orders 
            (order_id_str, userid, name, Phone, Address, Total, Items, Receipt, CurrentStatus, Note, status_history)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)
        `;

        db.query(sql, [orderId, safeUserId, name || '', Phone, Address || '', Total, Items || '', safeReceipt, safeNote, initialHistory], (err2, result) => {
            if (err2) return res.status(500).json({ status: 'error', message: err2.message });

            // 🚀 Send Telegram notification + receipt photo (non-blocking)
            sendTelegramNotification({
                userid: safeUserId,
                name,
                Phone,
                Address,
                Total,
                Items,
                Note: safeNote,
                Receipt: safeReceipt   // ← pass receipt base64 so Telegram can send it as photo
            }, orderId);

            res.status(201).json({
                status: 'success',
                orderId: orderId,
                message: 'Order created successfully'
            });
        });
    });
});

// ============================================================
// PUT /order/:orderid/status — Update order status + append history
// (mirrors action: "updateStatus" in OrderScript.gs)
// ============================================================
router.put('/:orderid/status', (req, res) => {
    const orderid = req.params.orderid;
    const { CurrentStatus } = req.body;

    if (!CurrentStatus) {
        return res.status(400).json({ status: 'error', message: 'CurrentStatus is required.' });
    }

    const isStrId = orderid.startsWith('ORD-');
    const getSql = isStrId
        ? 'SELECT status_history FROM orders WHERE order_id_str = ?'
        : 'SELECT status_history FROM orders WHERE orderid = ?';
    const queryParam = isStrId ? orderid : (parseInt(orderid, 10) || 0);

    // First get current history
    db.query(getSql, [queryParam], (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });
        if (results.length === 0) return res.status(404).json({ status: 'error', message: 'Order not found.' });

        let history = [];
        try { history = JSON.parse(results[0].status_history || '[]'); } catch (e) { history = []; }

        const now = new Date();
        const formattedDate = now.toLocaleString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Phnom_Penh'
        });
        history.push({ status: CurrentStatus, date: formattedDate });

        const updateSql = isStrId
            ? 'UPDATE orders SET CurrentStatus = ?, status_history = ? WHERE order_id_str = ?'
            : 'UPDATE orders SET CurrentStatus = ?, status_history = ? WHERE orderid = ?';

        db.query(updateSql, [CurrentStatus, JSON.stringify(history), queryParam], (err2, result) => {
            if (err2) return res.status(500).json({ status: 'error', message: err2.message });
            if (result.affectedRows === 0) return res.status(404).json({ status: 'error', message: 'Order not found.' });

            res.json({ status: 'success', message: 'Order status updated successfully', CurrentStatus });
        });
    });
});

// ============================================================
// DELETE /order/:orderid — Delete an order
// (mirrors action: "deleteOrder" in OrderScript.gs)
// ============================================================
router.delete('/:orderid', (req, res) => {
    const orderid = req.params.orderid;
    const isStrId = orderid.startsWith('ORD-');
    const sql = isStrId
        ? 'DELETE FROM orders WHERE order_id_str = ?'
        : 'DELETE FROM orders WHERE orderid = ?';
    const queryParam = isStrId ? orderid : (parseInt(orderid, 10) || 0);

    db.query(sql, [queryParam], (err, result) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ status: 'error', message: 'Order not found.' });
        res.json({ status: 'success', message: 'Order deleted successfully.' });
    });
});

module.exports = router;
