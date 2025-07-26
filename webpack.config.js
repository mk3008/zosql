import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'development',
  entry: './src/browser/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist-browser'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      // Node.js modules that need browser alternatives
      'fs': false,
      'path': false,
      'crypto': false,
      'stream': false,
      'util': false,
      'buffer': false,
      'process': false,
    },
    fallback: {
      // Provide empty modules for Node.js built-ins
      "fs": false,
      "path": false,
      "crypto": false,
      "stream": false,
      "util": false,
      "buffer": false,
      "process": false,
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/browser/index.html',
      filename: 'index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: 'src/web-ui/static', 
          to: 'static',
          noErrorOnMissing: true 
        },
      ],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist-browser'),
    },
    compress: true,
    port: 9000,
    hot: true,
    open: true,
  },
};