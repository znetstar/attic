const path = require('path');
module.exports = {
  reactStrictMode: true,
  sassOptions: {
    includePaths: [
      path.join(__dirname, 'styles')
    ]
  },
  externals: {
    'xxhash-addon': 'commonjs xxhash-addon',
    'bson-ext': 'commonjs bson-ext',
    'shelljs': 'commonjs shelljs',
    'lzma-native': 'commonjs lzma-native',
    'sharp': 'commonjs sharp',
    'cbor-extract': 'commonjs cbor-extract',
    '@thirdact/simple-mongoose-interface': 'commonjs @thirdact/simple-mongoose-interface'
  },
  resolve: {
    extensions: [ '.css', '.scss', '.html', '.ejs', '.ts', '.js' ],
    alias: {
      'cbor-x': path.resolve('./node_modules/cbor-x/index.js')
    }
  }
}
