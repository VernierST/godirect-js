const puppeteer = require('puppeteer');

describe('Browser can use UMD bundle', () => {
  test('godirect object exists', async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.addScriptTag({
      path: './dist/godirect.min.umd.js'
    });

    const result = await page.evaluate(() => {
      return window.godirect;
    });

    expect(result).toMatchObject({
      createDevice: {},
      selectDevice: {}
    });

    browser.close();
  }, 16000);
});
