const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://next-portfolio-lime-one.vercel.app/test-map', {waitUntil: 'networkidle0'});
  const html = await page.content();
  
  // check if there is an iframe
  const hasIframe = html.includes('iframe');
  console.log('Has iframe?', hasIframe);
  
  if (hasIframe) {
    const iframeSrc = await page.evaluate(() => document.querySelector('iframe').src);
    console.log('Iframe src:', iframeSrc);
  } else {
    const errorText = await page.evaluate(() => document.body.innerText);
    console.log('Page text:', errorText);
  }
  
  await browser.close();
})();
