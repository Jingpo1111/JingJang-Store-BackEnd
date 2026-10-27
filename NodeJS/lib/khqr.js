/**
 * JingJangStore - KHQR Payment Integration Module
 * Handles EMVCo KHQR generation, CRC-16 checksums, and QR code rendering for ABA Bank.
 */

const QRCode = require('qrcode');

// Registered Bank Beneficiary Configuration
// 1. Tag 29 Bakong Account ID: MUST be 008473255 (so ACLEDA Mobile & other Bakong member banks can resolve the account)
// 2. Tag 40 ABA P2P Token (6C87B76C22F9): Requires Tag 59 to match "JINGPO PHAI" for ABA Mobile P2P scans
const DEFAULT_CONFIG = {
  storeName: 'JingJang Store',
  merchantCity: 'Phnom Penh',
  validityMinutes: 15, // Dynamic QR expiration window (15 minutes)
  aba: {
    bankId: 'abaakhppxxx@abaa',
    bakongAccountId: '008473255', // Bakong Account ID for Tag 29 (DO NOT CHANGE TO 011172997!)
    accountNumber: '010777270',   // KHR Account (for ABA P2P Tag 40)
    accountDual: '010777268',     // USD Account (for ABA P2P Tag 40)
    p2pToken: '6C87B76C22F9',     // ABA P2P Merchant Token
    beneficiaryName: 'JINGPO PHAI' // Exact name registered with ABA Bank (Tag 59)
  }
};

/**
 * Format string length with 2-digit padding (EMVCo requirement)
 */
const len = s => String(s.length).padStart(2, '0');

/**
 * Calculate CRC-16/CCITT (Poly: 0x1021, Initial: 0xFFFF)
 */
function crc16(s) {
  let c = 0xFFFF;
  for (const ch of s) {
    c ^= ch.charCodeAt(0) << 8;
    for (let i = 0; i < 8; i++) {
      c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF;
    }
  }
  return c.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generate raw KHQR string for ABA Bank (with Dual P2P Tag 40 AND Bakong Tag 29/30)
 * 
 * Interoperability Rules for ACLEDA & other banks to scan 100%:
 * 1. Tag 29 (Personal): '29450016abaakhppxxx@abaa01090084732550208ABA Bank'
 *    (Or Tag 30 for PayWay Merchant QR: '30510016abaakhppxxx@abaa0115...0208ABA Bank')
 *    ABA Mobile reads Tag 40 (abaP2P), while ACLEDA Mobile reads Tag 29 via Bakong switch.
 * 2. Tag 99: Dynamic timestamps (Subtag 00: created, Subtag 01: expired in 13-digit ms).
 *    Mandatory for ACLEDA when point-of-initiation is 010212 with amount Tag 54.
 * 3. Tag 62: Omitted for P2P or kept strictly conforming to EMVCo standard.
 */
function buildABAPayload({ amount, currency = 'USD', config = DEFAULT_CONFIG }) {
  const isUSD = currency.toUpperCase() === 'USD';
  const cur = isUSD ? '840' : '116';
  const amt = isUSD ? Number(amount).toFixed(2) : String(Math.round(amount));

  const abaConf = (config && config.aba) ? config.aba : DEFAULT_CONFIG.aba;
  const {
    bankId = 'abaakhppxxx@abaa',
    bakongAccountId = '008473255',
    merchantId,
    accountNumber = '010777270',
    accountDual = '010777268',
    p2pToken = '6C87B76C22F9',
    beneficiaryName = 'JINGPO PHAI'
  } = abaConf;

  const cityName = config.merchantCity || 'Phnom Penh';

  // Tag 40: ABA P2P & Dual currency token (Read by ABA Mobile app)
  const tag40Data = '0006abaP2P0112' + p2pToken + '02' + len(accountNumber) + accountNumber + '03' + len(accountDual) + accountDual + '0404Dual';

  // Point of Initiation: 12 (Dynamic with amount) or 11 (Static if 0)
  const poi = Number(amount) > 0 ? '12' : '11';

  let s = '0002010102' + poi;

  // Rule 1: Tag 29 (Personal Bakong Account) or Tag 30 (Merchant PayWay)
  if (merchantId) {
    // PayWay Merchant QR format
    const tag30Data = '00' + len(bankId) + bankId + '01' + len(merchantId) + merchantId + '0208ABA Bank';
    s += '30' + len(tag30Data) + tag30Data;
  } else {
    // Bakong Personal Account format: 29450016abaakhppxxx@abaa01090084732550208ABA Bank
    const tag29Data = '00' + len(bankId) + bankId + '01' + len(bakongAccountId) + bakongAccountId + '0208ABA Bank';
    s += '29' + len(tag29Data) + tag29Data;
  }

  // Tag 40 ABA P2P
  s += '40' + len(tag40Data) + tag40Data
    + '52045999'
    + '5303' + cur;

  if (Number(amount) > 0) {
    s += '54' + len(amt) + amt;
  }

  s += '5802KH'
    + '59' + len(beneficiaryName) + beneficiaryName
    + '60' + len(cityName) + cityName;

  // Rule 2: Mandatory Tag 99 for Dynamic QR (010212) with 13-digit millisecond timestamps
  if (poi === '12') {
    const now = Date.now();
    const validityMs = (Number(config.validityMinutes) || 15) * 60 * 1000;
    const expiry = now + validityMs;
    const tag99Data = '0013' + String(now) + '0113' + String(expiry);
    s += '99' + len(tag99Data) + tag99Data;
  }

  // Tag 63: CRC16 Checksum (Always the final tag)
  s += '6304';

  return s + crc16(s);
}

/**
 * Generate complete payment object with the ABA KHQR text and QR image
 * @param {Object} params
 * @param {number} params.amount - Amount to charge (e.g. 5 or 5000)
 * @param {string} [params.currency='USD'] - 'USD' or 'KHR'
 * @param {string} [params.billNumber=''] - Invoice or order reference
 * @param {Object} [params.config] - Custom configuration override
 * @returns {Promise<Object>} Payment payload with images and raw texts
 */
async function createPayment({ amount, currency = 'USD', billNumber = '', config = DEFAULT_CONFIG }) {
  const cleanCurrency = currency.toUpperCase() === 'KHR' ? 'KHR' : 'USD';
  const cleanBill = String(billNumber || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25);

  const abaText = buildABAPayload({ amount, currency: cleanCurrency, config });

  // Rule 4: QR Code margin: 3 gives a clean Quiet Zone (>= 2 to 4 modules)
  // Error correction Level H (30%) preserves full data integrity even with centered store logo
  const qrOptions = {
    width: 480,
    margin: 3,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#ffffff' }
  };

  const abaImage = await QRCode.toDataURL(abaText, qrOptions);

  const abaAccountFormatted = cleanCurrency === 'USD' ? '010 777 268' : '010 777 270';

  return {
    store: config.storeName,
    display_name: 'JingJang Store',
    amount: Number(amount),
    currency: cleanCurrency,
    bill_number: cleanBill,
    formatted_amount: cleanCurrency === 'USD' ? `${Number(amount)} USD` : `${Math.round(amount).toLocaleString()} KHR`,
    formatted_amount_khmer: cleanCurrency === 'USD' ? `${Number(amount).toFixed(2)} ដុល្លារ` : `${Math.round(amount).toLocaleString()} រៀល`,
    aba: {
      bank: 'ABA Bank',
      beneficiary: (config.aba && config.aba.beneficiaryName) || DEFAULT_CONFIG.aba.beneficiaryName,
      display_name: 'JingJang Store',
      account: abaAccountFormatted,
      bakong_id: (config.aba && config.aba.bakongAccountId) || DEFAULT_CONFIG.aba.bakongAccountId,
      text: abaText,
      image: abaImage
    }
  };
}

module.exports = {
  createPayment,
  buildABAPayload,
  crc16,
  DEFAULT_CONFIG
};
