import { readFileSync } from 'fs';

describe('Node can require bundle', () => {
  test('godirect object exists', async () => {
    const godirect = require('../dist/godirect.min.umd.js');
    expect(godirect).toMatchObject({
      createDevice: {},
      selectDevice: {}
    });
  });
});

describe('Uglify', () => {
  test('Uglify can run against umd bundle', async () => {
    const UglifyJS = require('uglify-js');
    const godirectMin = UglifyJS.minify(readFileSync('dist/godirect.min.umd.js', 'utf8'));
    if (godirectMin.error) throw godirectMin.error;

    expect(godirectMin).toBeDefined();
  });
});
