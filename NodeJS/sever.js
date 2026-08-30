const express = require('express');
const cors = require('cors');
const app = express();

require('./db/database');

app.use(cors());
app.use(express.json({ limit: '10mb' }));      // allow large base64 receipt images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// Routes
// ============================================================
const userRouter    = require('./routes/user.js');
const orderRouter   = require('./routes/order.js');
const otpRouter     = require('./routes/otp.js');
const categaryRouter = require('./routes/Categary.js');

app.use('/user',     userRouter);
app.use('/order',    orderRouter);
app.use('/otp',      otpRouter);
app.use('/categary', categaryRouter);

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'JingJang Store API is running.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
