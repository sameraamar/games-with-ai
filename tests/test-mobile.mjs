import { chromium, devices } from 'playwright';

const browser = await chromium.launch();
const galaxy = devices['Galaxy S20 Ultra'];
// Landscape: swap width/height, keep touch
const context = await browser.newContext({
  ...galaxy,
  viewport: { width: 915, height: 412 },
  screen: { width: 915, height: 412 },
});
const page = await context.newPage();
await page.goto('http://127.0.0.1:8123/Pong/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

// Click Arena tab if visible
const arenaBtn = page.locator('[data-mobile-page-button="arena"]');
if (await arenaBtn.isVisible()) {
  await arenaBtn.click();
  await page.waitForTimeout(500);
}

await page.screenshot({ path: '../temp/pong-mobile-arena.png' });
console.log('Saved temp/pong-mobile-arena.png');

// Also click Play to start match and screenshot
const playBtn = page.locator('#btnPlay');
if (await playBtn.isVisible()) {
  await playBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '../temp/pong-mobile-playing.png' });
  console.log('Saved temp/pong-mobile-playing.png');
}

await browser.close();
