import { terser } from 'rollup-plugin-terser';

export default [
{
  input: './src/godirect.js',
  output: {
    file: './dist/godirect.min.js',
    format: 'esm'
  },
  plugins: [terser({
    output: function(node, comment) {
      const { type } = comment;
      if (type === 'comment2') {
        // multiline comment
        return /@preserve|@license/;
      }
      return undefined;
    }
  })]
},
{
  input: './src/godirect.js',
  output: {
    file: './dist/godirect.min.cjs.js',
      format: 'cjs'
  },
  plugins: [terser({
    output: function(node, comment) {
      const { type } = comment;
      if (type === 'comment2') {
        // multiline comment
        return /@preserve|@license/;
      }
      return undefined;
    }
  })]
}
];
