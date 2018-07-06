const nodeExternals = require('webpack-node-externals')
const path = require('path')
// const glob = require('glob')

let entry = path.resolve('./src/index.js')
// if (process.env.NODE_ENV === 'test') {
//   entry = glob.sync('./test/**/*.js')
// }

module.exports = {
  entry,
  output: {
    filename: 'bundle.js'
  },
  target: 'node',
  // Generate sourcemaps for proper error messages
  devtool: 'source-map',
  watch: false,
  // Since 'aws-sdk' is not compatible with webpack,
  // we exclude all node dependencies
  externals: [nodeExternals()],
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  optimization: {
    // We no not want to minimize our code.
    minimize: false,
  },
  performance: {
    // Turn off size warnings for entry points
    hints: false,
  },
  // Run babel on all .js files and skip those in node_modules
  module: {
    rules: [{
      test: /\.js$/,
      loader: 'babel-loader',
      options: {
        presets: ['env']
      },
      include: __dirname,
      exclude: /node_modules/,
    }, {
      test: /\.json$/,
      loader: "json",
    },
  ],
  },
  resolve: {
    alias: {
      models: path.join(__dirname, '/src/models'),
      libs: path.join(__dirname, '/src/libs'),
      controllers: path.resolve(__dirname, 'src/controllers'),
      managers: path.resolve(__dirname, 'src/managers'),
      middlewares: path.resolve(__dirname, 'src/middlewares'),
      utils: path.resolve(__dirname, 'src/utils'),
      helpers: path.resolve(__dirname, 'src/helpers'),
    },
  },
}
