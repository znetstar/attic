const path = require('path');
require('dotenv').config()

module.exports = {
  reactStrictMode: true,
  sassOptions: {
    includePaths: [
      path.join(__dirname, 'styles')
    ]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false
      }
      config.externals = {
        ...config.externals,
        'xxhash-addon': 'commonjs xxhash-addon',
        'bson-ext': 'commonjs bson-ext',
        'shelljs': 'commonjs shelljs',
        'lzma-native': 'commonjs lzma-native',
        'sharp': 'commonjs sharp'
      }
      config.plugins = [
        ...config.plugins,
        new (require('node-polyfill-webpack-plugin'))()
      ]
    }
    return config;
  }
}
