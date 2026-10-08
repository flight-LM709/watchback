// Renders design/B/*.html to PNG (390x844 @2x unless the page sets <meta name="mockup-size" content="WxH@scale">)
// and builds B-contact-full.png in story order (B/order.json).
// Usage: npm i && node render.js [B] [only-these-names...]   (needs Chrome at /usr/bin/google-chrome)
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const dir = path.resolve(__dirname, process.argv[2] || 'B');
const only = process.argv.slice(3);
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const order = JSON.parse(fs.readFileSync(path.join(dir, 'order.json'), 'utf8'));
  for (const [name] of order) {
    if (only.length && !only.includes(name)) continue;
    const html = fs.readFileSync(path.join(dir, name + '.html'), 'utf8');
    const m = html.match(/name="mockup-size" content="(\d+)x(\d+)@(\d+)"/);
    const [w, h, s] = m ? [+m[1], +m[2], +m[3]] : [390, 844, 2];
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: s });
    await page.goto('file://' + path.join(dir, name + '.html'), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const fonts = await page.evaluate(() => [...new Set([...document.fonts].filter(x => x.status === 'loaded').map(x => x.family))].join(', '));
    // flag elements that overflow their box (ignoring intentional clamps/ellipsis) or leave the viewport
    const issues = await page.evaluate(([W, H]) => {
      const out = [];
      document.querySelectorAll('.screen *').forEach(el => {
        const cs = getComputedStyle(el), tag = el.tagName.toLowerCase();
        if (['svg', 'path', 'circle', 'rect', 'script'].includes(tag) || el.closest('svg')) return;
        if (el.scrollWidth > el.clientWidth + 1 && cs.overflow === 'visible' && el.clientWidth > 0 && cs.display !== 'inline') out.push('wide:' + (el.className || tag));
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > W + 1 || r.bottom > H + 1 || r.left < -1) && !el.closest('.doodle') && !el.classList.contains('tape')) out.push('off:' + (el.className || tag));
      });
      return [...new Set(out)].slice(0, 12);
    }, [w, h]);
    await page.screenshot({ path: path.join(dir, name + '.png') });
    await page.close();
    console.log(name, `${w * s}x${h * s}`, '| fonts:', fonts || 'NONE', '| issues:', issues.join(' ') || 'none');
  }
  // contact sheet
  const perRow = 7, cw = 390, gap = 32, pad = 48;
  const cells = order.map(([n, label], i) => `<figure><img src="B/${n}.png" style="${/13-share-square/.test(n) ? 'width:390px;height:390px;border-radius:6px' : ''}"><figcaption><b>${String(i + 1).padStart(2, '0')}</b> ${label}<br><span>${n}</span></figcaption></figure>`).join('');
  const sheet = path.resolve(dir, '..', 'B-contact-full.html');
  fs.writeFileSync(sheet, `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:${pad}px;background:#e9e1d2;font-family:system-ui,sans-serif;color:#1c1a17}h1{margin:0 0 6px;font-size:30px}p{margin:0 0 30px;font-size:16px;opacity:.75}.grid{display:grid;grid-template-columns:repeat(${perRow},${cw}px);gap:44px ${gap}px;align-items:start}figure{margin:0}img{width:390px;height:844px;display:block;border-radius:28px;box-shadow:0 10px 40px rgba(0,0,0,.3)}figcaption{margin-top:12px;font-size:16px;font-weight:600;text-align:center}figcaption span{font:500 12px ui-monospace,monospace;opacity:.6}</style></head><body><h1>Watchback · Paper Mixtape (chosen direction) · full story</h1><p>Story order, left to right. Mobile 390×844 @2x; square share image 1080×1080. All data is fake example data.</p><div class="grid">${cells}</div></body></html>`);
  const p2 = await browser.newPage({ viewport: { width: pad * 2 + cw * perRow + gap * (perRow - 1), height: 1000 }, deviceScaleFactor: 1 });
  await p2.goto('file://' + sheet, { waitUntil: 'load' });
  await p2.screenshot({ path: sheet.replace('.html', '.png'), fullPage: true });
  console.log('contact:', sheet.replace('.html', '.png'));
  await browser.close();
})();
