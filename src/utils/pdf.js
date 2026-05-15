const puppeteer = require('puppeteer');
const { puppeteerExecutablePath } = require('../config/dotenv');

const generatePdfBuffer = async (html) => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: puppeteerExecutablePath || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '16px',
        right: '16px',
        bottom: '16px',
        left: '16px'
      }
    });
  } finally {
    await browser.close();
  }
};

module.exports = {
  generatePdfBuffer
};
