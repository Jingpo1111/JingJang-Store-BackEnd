/**
 * JingJangStore - KHQR Payment Integration Module
 * Handles EMVCo KHQR generation, CRC-16 checksums, and QR code rendering for ABA Bank & ACLEDA Bank.
 */

const QRCode = require('qrcode');

// Registered Bank Beneficiary Configuration
// NOTE: ABA P2P Token (6C87B76C22F9) requires Tag 59 to match the official account holder "JINGPO PHAI".
// If Tag 59 is changed in the payload, the ABA Mobile app rejects the QR code with scan error.
const DEFAULT_CONFIG = {
  storeName: 'JingJang Store',
  merchantCity: 'Phnom Penh',
  aba: {
    bankId: 'abaakhppxxx@abaa',
    accountNumber: '010777270', // KHR Account
    accountDual: '010777268',   // USD Account
    p2pToken: '6C87B76C22F9',
    beneficiaryName: 'JINGPO PHAI' // Exact name registered with ABA Bank
  },
  acleda: {
    bankId: 'khqr@aclb',
    accountNumber: '011185517829743',
    beneficiaryName: 'PHAI JINGPO', // Exact name registered with ACLEDA Bank
    serviceTag: '016441653'
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
 * Generate raw KHQR string for ABA Bank (with Dual P2P Tag 40)
 * Note: Tag 62 is omitted for ABA P2P to ensure 100% compatibility with ABA Mobile app scanner.
 */
function buildABAPayload({ amount, currency = 'USD', config = DEFAULT_CONFIG }) {
  const isUSD = currency.toUpperCase() === 'USD';
  const cur = isUSD ? '840' : '116';
  const amt = isUSD ? Number(amount).toFixed(2) : String(Math.round(amount));

  const { bankId, accountNumber, accountDual, p2pToken, beneficiaryName } = config.aba;

  // Tag 29: Merchant Account Info
  const tag29Data = '00' + len(bankId) + bankId + '01' + len(accountNumber) + accountNumber + '0208ABA Bank';
  
  // Tag 40: ABA P2P & Dual currency token
  const tag40Data = '0006abaP2P0112' + p2pToken + '02' + len(accountNumber) + accountNumber + '03' + len(accountDual) + accountDual + '0404Dual';

  // Point of Initiation: 12 (Dynamic with amount) or 11 (Static if 0)
  const poi = Number(amount) > 0 ? '12' : '11';

  let s = '0002010102' + poi
    + '29' + len(tag29Data) + tag29Data
    + '40' + len(tag40Data) + tag40Data
    + '52045999'
    + '5303' + cur;

  if (Number(amount) > 0) {
    s += '54' + len(amt) + amt;
  }

  s += '5802KH'
    + '59' + len(beneficiaryName) + beneficiaryName
    + '6010' + config.merchantCity
    + '6304';

  return s + crc16(s);
}

/**
 * Generate raw KHQR string for ACLEDA Bank
 */
function buildACLEDAPayload({ amount, currency = 'USD', billNumber = '', config = DEFAULT_CONFIG }) {
  const isUSD = currency.toUpperCase() === 'USD';
  const cur = isUSD ? '840' : '116';
  const amt = isUSD ? Number(amount).toFixed(2) : String(Math.round(amount));
  const sanitizedBill = String(billNumber || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25);
  const extra = (sanitizedBill ? '01' + len(sanitizedBill) + sanitizedBill : '') + '0209' + config.acleda.serviceTag;

  const { bankId, accountNumber, beneficiaryName } = config.acleda;

  // Tag 29: ACLEDA Merchant
  const tag29Data = '00' + len(bankId) + bankId + '01' + len(accountNumber) + accountNumber + '0206ACLEDA';

  const poi = Number(amount) > 0 ? '12' : '11';

  let s = '0002010102' + poi
    + '29' + len(tag29Data) + tag29Data
    + '391300042CCY01014'
    + '52045999'
    + '5303' + cur;

  if (Number(amount) > 0) {
    s += '54' + len(amt) + amt;
  }

  s += '5802KH'
    + '59' + len(beneficiaryName) + beneficiaryName
    + '6010' + config.merchantCity
    + '62' + len(extra) + extra
    + '6304';

  return s + crc16(s);
}

/**
 * Generate complete payment object with both banks and QR image URLs
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
  const acledaText = buildACLEDAPayload({ amount, currency: cleanCurrency, billNumber: cleanBill, config });

  // Generate high-density black QR code images with High error correction (Level H: 30%)
  const qrOptions = {
    width: 480,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#ffffff' }
  };

  const [abaImage, acledaImage] = await Promise.all([
    QRCode.toDataURL(abaText, qrOptions),
    QRCode.toDataURL(acledaText, qrOptions)
  ]);

  const abaAccountFormatted = cleanCurrency === 'USD' ? '010 777 268' : '010 777 270';
  const acledaAccountFormatted = '011 185 517 829 743';

  return {
    store: config.storeName,
    display_name: 'JingJang Store',
    amount: Number(amount),
    currency: cleanCurrency,
    bill_number: cleanBill,
    formatted_amount: cleanCurrency === 'USD' ? `${Number(amount).toFixed(2)} USD` : `${Math.round(amount).toLocaleString()} KHR`,
    formatted_amount_khmer: cleanCurrency === 'USD' ? `${Number(amount).toFixed(2)} ដុល្លារ` : `${Math.round(amount).toLocaleString()} រៀល`,
    aba: {
      bank: 'ABA Bank',
      beneficiary: config.aba.beneficiaryName, // JINGPO PHAI (ensures ABA app scan works)
      display_name: 'JingJang Store',
      account: abaAccountFormatted,
      text: abaText,
      image: abaImage
    },
    acleda: {
      bank: 'ACLEDA Bank',
      beneficiary: config.acleda.beneficiaryName, // PHAI JINGPO
      display_name: 'JingJang Store',
      account: acledaAccountFormatted,
      text: acledaText,
      image: acledaImage
    }
  };
}

module.exports = {
  createPayment,
  buildABAPayload,
  buildACLEDAPayload,
  crc16,
  DEFAULT_CONFIG
};
