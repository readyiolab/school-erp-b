const QRCode = require('qrcode');

/**
 * Generate a QR code as a data URL (base64 PNG).
 * @param {string} data - The data to encode in the QR code
 * @returns {Promise<string>} Base64 data URL
 */
const generateQRDataURL = async (data) => {
  return QRCode.toDataURL(String(data), {
    width: 200,
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
};

/**
 * Generate a QR code as a Buffer (PNG).
 * @param {string} data - The data to encode
 * @returns {Promise<Buffer>}
 */
const generateQRBuffer = async (data) => {
  return QRCode.toBuffer(String(data), {
    width: 200,
    margin: 1,
    type: 'png'
  });
};

module.exports = { generateQRDataURL, generateQRBuffer };
