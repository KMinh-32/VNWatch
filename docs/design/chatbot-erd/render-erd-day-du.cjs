// Xuất PNG từ SVG của sơ đồ gộp; không thay đổi website hoặc cơ sở dữ liệu.
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('D:/VNWatch/outputs/vnwatch-frontend/node_modules/@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const stem = 'VNWatch-ERD-day-du';
    const page = await browser.newPage({ viewport: { width: 3270, height: 1930 }, deviceScaleFactor: 2 });
    const svg = await fs.readFile(path.join(__dirname, stem + '.svg'), 'utf8');
    await page.setContent('<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0}svg{display:block}</style>' + svg);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('svg').screenshot({ path: path.join(__dirname, stem + '.png') });
    await page.locator('svg').screenshot({ path: path.join(__dirname, stem + '-preview.png'), scale: 'css' });
    console.log('Created PNG: 6540 x 3860; preview: 3270 x 1930');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
