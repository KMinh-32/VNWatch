// Render SVG kỹ thuật thành PNG, kiểm tra chữ có nằm ngoài canvas hay không.
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('D:/VNWatch/outputs/vnwatch-frontend/node_modules/@playwright/test');
const stems = [
  'VNWatch-ChatbotAI-VOPC',
  'VNWatch-ChatbotAI-VOPC-nen-toi',
  'VNWatch-ChatbotAI-Sequence-01-MoPhien',
  'VNWatch-ChatbotAI-Sequence-02-TuVan',
  'VNWatch-ChatbotAI-Sequence-03-LuuKetQua',
];
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const checks = [];
  try {
    for (const stem of stems) {
      const svg = await fs.readFile(path.join(__dirname, stem + '.svg'), 'utf8');
      const [, ws, hs] = svg.match(/width="(\d+)" height="(\d+)"/);
      const width = Number(ws), height = Number(hs);
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
      await page.setContent('<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0}svg{display:block}</style>' + svg);
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(({ width, height }) => [...document.querySelectorAll('svg text')].flatMap(el => {
        const b = el.getBBox();
        return b.x < 0 || b.y < 0 || b.x + b.width > width || b.y + b.height > height
          ? [{ text: el.textContent, x: b.x, y: b.y, width: b.width, height: b.height }] : [];
      }), { width, height });
      checks.push({ stem, width, height, overflow });
      await page.locator('svg').screenshot({ path: path.join(__dirname, stem + '.png') });
      await page.locator('svg').screenshot({ path: path.join(__dirname, stem + '-preview.png'), scale: 'css' });
      console.log(stem + ': ' + width*2 + ' x ' + height*2 + '; text overflow = ' + overflow.length);
      await page.close();
    }
  } finally { await browser.close(); }
  await fs.writeFile(path.join(__dirname, 'render-checks.json'), JSON.stringify(checks, null, 2));
  if (checks.some(c => c.overflow.length)) throw new Error('Text outside SVG canvas: inspect render-checks.json');
})().catch(error => { console.error(error); process.exitCode = 1; });
