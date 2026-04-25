import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:5400/blockit/', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
const info = await p.evaluate(() => {
  const t = document.querySelector('.title');
  const w = document.querySelector('.title__wordmark');
  const m = document.querySelector('.title__monogram');
  const get = (el) => el && {
    tag: el.tagName,
    cls: el.className.baseVal ?? el.className,
    display: getComputedStyle(el).display,
    visibility: getComputedStyle(el).visibility,
    rect: el.getBoundingClientRect(),
  };
  return {
    title: get(t),
    wordmark: get(w),
    monogram: get(m),
  };
});
console.log(JSON.stringify(info, null, 2));
await b.close();
