const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const dirs = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  for (const d of dirs) {
    const files = fs.readdirSync(d).filter(f => /^0\d-.*\.html$/.test(f)).sort();
    for (const f of files) {
      await page.goto('file://' + path.resolve(d, f), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const fontInfo = await page.evaluate(() => [...document.fonts].filter(x => x.status === 'loaded').map(x => x.family + ' ' + x.weight).filter((v,i,a)=>a.indexOf(v)===i).join(', '));
      const overflow = await page.evaluate(() => { const out=[]; document.querySelectorAll('.screen *').forEach(el=>{ if(el.scrollWidth>el.clientWidth+1 && getComputedStyle(el).overflow==='visible' && el.clientWidth>0 && !['svg','path','circle','rect'].includes(el.tagName.toLowerCase())) out.push(el.className||el.tagName); const r=el.getBoundingClientRect(); if(r.width>0&&(r.right>391||r.bottom>845)&&!el.classList.contains('blob')&&!el.classList.contains('ring')) out.push('OFF:'+(el.className||el.tagName)); }); return [...new Set(out)].slice(0,10); });
      const out = path.resolve(d, f.replace('.html', '.png'));
      await page.screenshot({ path: out });
      console.log(out, '| fonts:', fontInfo || 'NONE', '| overflow:', overflow.join(' ') || 'none');
    }
    // contact sheet
    const name = path.basename(path.resolve(d));
    const title = { A: 'Direction A — Neon Rewind', B: 'Direction B — Paper Mixtape' }[name] || name;
    const dark = name === 'A';
    const cells = files.map(f => `<figure><img src="${name}/${f.replace('.html','.png')}"><figcaption>${f.replace('.html','').replace(/^0(\d)-/,'$1 · ').replace(/-/g,' ')}</figcaption></figure>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:40px 48px 44px;background:${dark?'#1b1b22':'#e9e1d2'};font-family:system-ui,sans-serif;color:${dark?'#eee':'#1c1a17'}}h1{margin:0 0 6px;font-size:28px}p{margin:0 0 28px;font-size:15px;opacity:.75}.row{display:flex;gap:32px}figure{margin:0}img{width:390px;height:844px;display:block;border-radius:28px;box-shadow:0 10px 40px rgba(0,0,0,.35)}figcaption{margin-top:14px;font-size:16px;font-weight:600;text-transform:capitalize;text-align:center}</style></head><body><h1>Watchback (working name) · ${title}</h1><p>Mobile mockups · 390×844 · all data is fake example data</p><div class="row">${cells}</div></body></html>`;
    const sheet = path.resolve(d, '..', `${name}-contact.html`);
    fs.writeFileSync(sheet, html);
    const w = 48*2 + 390*5 + 32*4;
    const p2 = await browser.newPage({ viewport: { width: w, height: 1100 }, deviceScaleFactor: 1 });
    await p2.goto('file://' + sheet, { waitUntil: 'load' });
    await p2.screenshot({ path: sheet.replace('.html', '.png'), fullPage: true });
    await p2.close();
    console.log('contact:', sheet.replace('.html', '.png'));
  }
  await browser.close();
})();
