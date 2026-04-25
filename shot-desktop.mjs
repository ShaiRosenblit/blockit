import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:5400/blockit/';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await p.screenshot({ path: process.argv[2] || 'screens/x.png' });
await b.close();
