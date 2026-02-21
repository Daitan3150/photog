const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
      console.log(`[Browser] ${msg.type()}: ${msg.text()}`);
  });
  
  console.log("Navigating to admin/photos...");
  try {
    await page.goto('http://localhost:3000/admin/photos', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(15000);
  } catch(e) {
    console.log("Nav error:", e.message);
  }

  await browser.close();
})();
