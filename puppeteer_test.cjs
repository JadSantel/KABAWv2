const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:5174');
  await new Promise(r => setTimeout(r, 2000));
  
  // Click the True Color dropdown button
  const btns = await page.$$('button');
  for (let btn of btns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('True Color')) {
      await btn.click();
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 500));
  
  // Click the Live Weather Radar button
  const btns2 = await page.$$('button');
  for (let btn of btns2) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Live Weather Radar')) {
      await btn.click();
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
