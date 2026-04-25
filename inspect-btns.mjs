import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:5400/blockit/', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
const btns = await p.evaluate(() =>
  Array.from(document.querySelectorAll('button')).map((b) => ({
    text: (b.textContent || '').trim().slice(0, 40),
    aria: b.getAttribute('aria-label'),
    cls: b.className.slice(0, 60),
  })),
);
console.log(JSON.stringify(btns, null, 2));
await b.close();
