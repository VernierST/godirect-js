import { terser } from 'rollup-plugin-terser';
import babel from 'rollup-plugin-babel';

const terserPlugin = terser({
  output: function(node, comment) {
    const { type } = comment;
    if (type === 'comment2') {
      // multiline comment
      return /@preserve|@license/;
    }
    return undefined;
  }
});

export default [
{
  input: './src/godirect.js',
  output: {
    file: './dist/godirect.min.js',
    format: 'esm'
  },
  plugins: [terserPlugin]
},
{
  input: './src/godirect.js',
  output: {
    file: './dist/godirect.min.umd.js',
    format: 'umd',
    name: 'godirect'
  },
  plugins: [
    terserPlugin,
    babel({
      babelrc: false,
      presets: ['@babel/env'],
      exclude: 'node_modules/**'
    })
  ]
}
];
