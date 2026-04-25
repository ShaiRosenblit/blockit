// Quick layout check after "Challenge a friend on own row + shrink board".
// Measures iPhone 13 Safari (short portrait) for gameplay overflow in each
// difficulty, plus a desktop+laptop screenshot for regression visual check.

import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = 'http://127.0.0.1:5400/blockit/';

async function measure(page, name) {
  const m = await page.evaluate(() => ({
    doc: document.documentElement.scrollHeight,
    vh: window.innerHeight,
    vw: window.innerWidth,
    board: document.querySelector('.board')?.getBoundingClientRect().width ?? null,
    tray: document.querySelector('.piece-tray')?.getBoundingClientRect().height ?? null,
    panel: document.querySelector('.game-over-panel')?.getBoundingClientRect().height ?? null,
  }));
  const over = m.doc - m.vh;
  const tag = over > 0 ? `overflow ${over}` : `fits (${-over} spare)`;
  console.log(
    `${name.padEnd(28)} vw=${m.vw} vh=${m.vh} doc=${m.doc} ${tag}  board=${m.board?.toFixed(0) ?? '-'}  tray=${m.tray?.toFixed(0) ?? '-'}  panel=${m.panel?.toFixed(0) ?? '-'}`,
  );
  return m;
}

async function clickText(page, text) {
  await page.locator(`button:text-is("${text}")`).first().click();
  await page.waitForTimeout(180);
}

async function run() {
  const browser = await chromium.launch();

  // iPhone 13 Safari portrait
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 664 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mp = await mobile.newPage();
  await mp.goto(URL, { waitUntil: 'networkidle' });
  await mp.waitForTimeout(600);

  console.log('=== iPhone 13 Safari (390×664) — PUZZLE gameplay ===');
  await clickText(mp, 'Puzzle');
  for (const diff of ['Easy', 'Normal', 'Hard', 'Expert']) {
    await clickText(mp, diff);
    await measure(mp, `puzzle-${diff.toLowerCase()}`);
  }

  console.log('\n=== iPhone 13 Safari (390×664) — CLASSIC gameplay ===');
  await clickText(mp, 'Classic');
  await mp.waitForTimeout(300);
  for (const diff of ['Zen', 'Easy', 'Normal', 'Hard']) {
    try {
      await mp.locator(`.difficulty-btn:text-is("${diff}")`).first().click({ timeout: 3000 });
      await mp.waitForTimeout(180);
      await measure(mp, `classic-${diff.toLowerCase()}`);
    } catch (e) {
      console.log(`classic-${diff.toLowerCase()}           (skipped: ${e.message.slice(0, 40)})`);
    }
  }

  await clickText(mp, 'Puzzle');
  await mp.waitForTimeout(200);
  await clickText(mp, 'Expert');
  await mp.screenshot({ path: 'screens/m-puzzle-expert.png' });
  await clickText(mp, 'Hard');
  await mp.screenshot({ path: 'screens/m-puzzle-hard.png' });
  await clickText(mp, 'Normal');
  await mp.screenshot({ path: 'screens/m-puzzle-normal.png' });

  await mobile.close();

  console.log('\n=== Desktop (1440×900) ===');
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dp = await desktop.newPage();
  await dp.goto(URL, { waitUntil: 'networkidle' });
  await dp.waitForTimeout(500);
  await measure(dp, 'desktop-default');
  await dp.screenshot({ path: 'screens/d-default.png' });
  await clickText(dp, 'Classic');
  await measure(dp, 'desktop-classic');
  await dp.screenshot({ path: 'screens/d-classic.png' });
  await clickText(dp, 'Puzzle');
  await clickText(dp, 'Expert');
  await measure(dp, 'desktop-puzzle-expert');
  await dp.screenshot({ path: 'screens/d-puzzle-expert.png' });
  await desktop.close();

  console.log('\n=== Laptop (1280×800) ===');
  const laptop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const lp = await laptop.newPage();
  await lp.goto(URL, { waitUntil: 'networkidle' });
  await lp.waitForTimeout(500);
  await measure(lp, 'laptop-default');
  await lp.screenshot({ path: 'screens/l-default.png' });
  await laptop.close();

  console.log('\n=== Narrow desktop (900×900) ===');
  const narrow = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const np = await narrow.newPage();
  await np.goto(URL, { waitUntil: 'networkidle' });
  await np.waitForTimeout(500);
  await measure(np, 'narrow-default');
  await np.screenshot({ path: 'screens/n-default.png' });
  await narrow.close();

  await browser.close();
}

fs.mkdirSync('screens', { recursive: true });
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
