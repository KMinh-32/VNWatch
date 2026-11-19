// Render sơ đồ phân tích theo mẫu thành ảnh PNG.
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('D:/VNWatch/outputs/vnwatch-frontend/node_modules/@playwright/test');
(async () => {
  const stem = 'VNWatch-ChatbotAI-Sequence-Entity';
  const svg = await fs.readFile(path.join(__dirname, stem + '.svg'), 'utf8');
  const [, width, height] = svg.match(/width="(\d+)" height="(\d+)"/);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) }, deviceScaleFactor: 2 });
    await page.setContent('<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0}svg{display:block}</style>' + svg);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('svg').screenshot({ path: path.join(__dirname, stem + '.png') });
    await page.locator('svg').screenshot({ path: path.join(__dirname, stem + '-preview.png'), scale: 'css' });
    console.log('PNG: ' + Number(width)*2 + ' x ' + Number(height)*2);
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
