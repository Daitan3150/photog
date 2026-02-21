const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });
  
  console.log("Navigating to admin/photos...");
  try {
    await page.goto('http://localhost:3000/admin/photos', { waitUntil: 'load', timeout: 8000 });
    // wait a bit for react to do its loops
    await page.waitForTimeout(3000);
  } catch(e) {
    console.log("Nav error:", e.message);
  }

  await browser.close();
})();
