// Drive the tutorial step 1 to its solved overlay, then inject an extra
// wide action button to simulate the puzzle-solved panel ("New puzzle" +
// "Replay" + full-row "Challenge a friend"). This lets us measure the
// true post-solve chrome height without having to programmatically solve
// a randomised puzzle.

import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:5400/blockit/';

async function measure(page, name) {
  const m = await page.evaluate(() => ({
    doc: document.documentElement.scrollHeight,
    vh: window.innerHeight,
    board: document.querySelector('.board')?.getBoundingClientRect().width ?? null,
    panel: document.querySelector('.game-over-panel')?.getBoundingClientRect().height ?? null,
    tray: document.querySelector('.piece-tray')?.getBoundingClientRect().height ?? null,
    over: document.documentElement.scrollHeight - window.innerHeight,
  }));
  console.log(
    `${name.padEnd(28)} doc=${m.doc} vh=${m.vh} over=${m.over}  board=${m.board?.toFixed(0)}  tray=${m.tray?.toFixed(0) ?? '-'}  panel=${m.panel?.toFixed(0) ?? '-'}`,
  );
  return m;
}

async function solveStep1(page) {
  await page.locator('button:text-is("Tutorial")').click();
  await page.waitForTimeout(400);

  const pieceBox = await page.locator('.piece-slot').first().boundingBox();
  const boardBox = await page.locator('.board').boundingBox();
  const cell = boardBox.width / 8;

  const SCALE = 1.38;
  const OFFX = -8;
  const OFFY = -104;

  const startX = pieceBox.x + pieceBox.width / 2;
  const startY = pieceBox.y + pieceBox.height / 2;

  // Origin target (row=4, col=2), pieceW=3, pieceH=1.
  const targetEx = boardBox.x + 3.5 * cell - OFFX;
  const targetEy = boardBox.y + 4.5 * cell - OFFY;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 12, startY);
  await page.waitForTimeout(30);

  const anchorX = startX + 12;
  const anchorY = startY;

  const targetClientX = anchorX + (targetEx - anchorX) / SCALE;
  const targetClientY = anchorY + (targetEy - anchorY) / SCALE;

  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(
      anchorX + (targetClientX - anchorX) * t,
      anchorY + (targetClientY - anchorY) * t,
    );
    await page.waitForTimeout(12);
  }
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(800);
}

/**
 * Simulate the puzzle-solved overlay by mutating the DOM of the tutorial
 * overlay to match what the React component would render in puzzle mode:
 *   - Hide the tutorial banner (puzzle mode has no banner).
 *   - Rewrite the two primary buttons to "New puzzle" + "Replay".
 *   - Inject a full-width "Challenge a friend" button on its own row.
 *   - Shorten the subline to "Nicely done." to match puzzle copy.
 * Height of the resulting panel is a faithful stand-in for the real puzzle
 * panel (same component, same tokens, same CSS rules) and the resulting
 * `over` measurement tells us how much the board has to shrink.
 */
async function simulatePuzzleSolved(page) {
  await page.evaluate(() => {
    const banner = document.querySelector('.tutorial-banner');
    if (banner) banner.style.display = 'none';

    const panel = document.querySelector('.game-over-panel');
    if (!panel) return;

    const title = panel.querySelector('.game-over-panel__title');
    if (title) title.textContent = 'Pattern matched!';
    const meta = panel.querySelector('.game-over-panel__meta');
    if (meta) meta.textContent = 'Puzzle \u00B7 Easy';
    const sub = panel.querySelector('.game-over-panel__sub');
    if (sub) sub.textContent = 'Nicely done.';

    const actions = panel.querySelector('.game-over-panel__actions');
    if (!actions) return;
    actions.innerHTML = '';

    const primary = document.createElement('button');
    primary.className = 'game-over-panel__btn game-over-panel__btn--primary';
    primary.textContent = 'New puzzle';
    actions.appendChild(primary);

    const secondary = document.createElement('button');
    secondary.className = 'game-over-panel__btn';
    secondary.textContent = 'Replay';
    actions.appendChild(secondary);

    const share = document.createElement('button');
    share.className = 'game-over-panel__btn game-over-panel__btn--wide';
    share.innerHTML = '<span aria-hidden>\u{1F3AF}</span> Challenge a friend';
    actions.appendChild(share);
  });
  await page.waitForTimeout(100);
}

async function run() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 664 },
    deviceScaleFactor: 2,
  });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(500);

  await p.locator('button:text-is("Easy")').click();
  await p.waitForTimeout(300);
  await measure(p, 'puzzle-easy-play');

  await solveStep1(p);
  await measure(p, 'tutorial-1-post (raw)');
  await p.screenshot({ path: 'screens/m-tut1-post.png' });

  await simulatePuzzleSolved(p);
  await measure(p, 'puzzle-solved (simulated)');
  await p.screenshot({ path: 'screens/m-puzzle-solved.png' });

  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
