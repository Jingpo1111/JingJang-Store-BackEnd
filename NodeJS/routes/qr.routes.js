const express = require('express');
const router = express.Router();
const { createPayment, DEFAULT_CONFIG } = require('../lib/khqr');

/**
 * POST /api/qr
 * Generates the ABA KHQR code with image and payload
 */
router.post('/', async (req, res) => {
  try {
    const { amount, currency, bill_number, billNumber } = req.body;

    const numAmount = Number(amount);
    if (amount === undefined || amount === null || isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const payment = await createPayment({
      amount: numAmount,
      currency: currency || 'USD',
      billNumber: bill_number || billNumber || `ORDER-${Date.now().toString().slice(-6)}`
    });

    res.json(payment);
  } catch (err) {
    console.error('KHQR Generation Error:', err);
    res.status(400).json({ error: err.message || 'Failed to generate KHQR payment' });
  }
});

/**
 * GET /api/qr/config
 * Return public store payment configuration info
 */
router.get('/config', (req, res) => {
  res.json({
    status: 'ok',
    store: DEFAULT_CONFIG.storeName,
    city: DEFAULT_CONFIG.merchantCity,
    banks: ['ABA Bank']
  });
});

module.exports = router;
