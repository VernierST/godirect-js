import { terser } from 'rollup-plugin-terser';
import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';


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
    nodeResolve({
      browser: true
    }),
    babel({
      babelrc: false,
      presets: [
        ["@babel/env", {
	        "targets": {
	          "node": "8.0.0"
	        },
          "modules": false,
          "useBuiltIns": "usage",
          "forceAllTransforms": true
        }]
      ],
      exclude: 'node_modules/**',
    })
  ]
}
];
