import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:5400/blockit/', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
// Hard reload to defeat any cache.
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(500);
const info = await p.evaluate(() => {
  const m = document.querySelector('.title__monogram');
  if (!m) return { error: 'no monogram' };
  const cs = getComputedStyle(m);
  return {
    display: cs.display,
    width: cs.width,
    height: cs.height,
    vwMatch: matchMedia('(orientation: portrait) and (max-width: 380px)').matches,
    widthMatch: matchMedia('(max-width: 380px)').matches,
    portraitMatch: matchMedia('(orientation: portrait)').matches,
    vw: window.innerWidth,
    docWidth: document.documentElement.clientWidth,
  };
});
console.log(JSON.stringify(info, null, 2));
await b.close();
