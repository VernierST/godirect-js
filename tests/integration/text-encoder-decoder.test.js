import { defaultPageSetup } from '../puppeteer/utils';

const puppeteer = require('puppeteer');


describe('TextEncoder/Decoder', () => {
  test('encodes and decodes correctly', async () => {
    const browser = await puppeteer.launch({
      headless: true
    });
    const page = await browser.newPage();

    page.emulate(defaultPageSetup);

    const result = await page.evaluate(() => {
      const uint8array = new TextEncoder().encode('hello world!');
      return new TextDecoder('utf-8').decode(uint8array);
    });

    expect(result).toBe('hello world!');

    browser.close();
  }, 16000);
});
