const path = require("path");
const HtmlWebapckPlugin = require("html-webpack-plugin");
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');
const notifier = require('node-notifier');
const resolve = (dir) => path.join(__dirname, dir)

module.exports = {
  devtool: 'cheap-module-eval-source-map',
  devServer: {
    disableHostCheck: true,
    quiet: true,
  },
  entry: {
    main: './'
  },
  output: {
    path: resolve('dist'),
    filename: '[name].bundle.js'
  },
  plugins: [
    new HtmlWebapckPlugin({
      template: resolve('index.html'),
      filename: 'index.html',
      inject: true,
    }),
    new FriendlyErrorsWebpackPlugin({
      clearConsole: true,
      onErrors: (severity, errors) => {
        if (severity !== 'error') {
          return;
        }
        const error = errors[0];
        notifier.notify({
          title: 'Webpack error',
          message: `${severity}: ${error.name}`,
          subtitle: error.file || '',
        });
      },
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js/,
        use: {
          loader: 'babel-loader',
          options: {
            extends: resolve('babelrc.js')
          }
        },
        exclude: /node_modules/
      }
    ]
  },
};
