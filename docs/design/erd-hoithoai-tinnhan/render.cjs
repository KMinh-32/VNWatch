const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('D:/VNWatch/outputs/vnwatch-frontend/node_modules/@playwright/test');
(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const stem = path.join(__dirname, 'VNWatch-ERD-HoiThoai-TinNhan');
    const page = await browser.newPage({viewport: {width:3270,height:1930}, deviceScaleFactor:2});
    await page.setContent('<meta charset="utf-8"><style>body{margin:0}svg{display:block}</style>' + await fs.readFile(stem+'.svg','utf8'));
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.locator('svg text').evaluateAll(nodes => nodes.filter(n => {const b=n.getBBox();return b.x < 0 || b.x+b.width > 3270 || b.y+b.height > 1930;}).map(n=>n.textContent));
    if(overflow.length) throw new Error('Text overflow: '+JSON.stringify(overflow));
    await page.locator('svg').screenshot({path:stem+'.png'});
    await page.locator('svg').screenshot({path:stem+'-preview.png',scale:'css'});
    console.log('Rendered 6540 × 3860 PNG; no text outside canvas.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
