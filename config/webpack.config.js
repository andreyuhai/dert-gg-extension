'use strict';

const { merge } = require('webpack-merge');

const common = require('./webpack.common.js');
const PATHS = require('./paths');

// Merge webpack configuration files
const config = (env, argv) =>
  merge(common, {
    entry: {
      message_handler: PATHS.src + '/message_handler.js',
      contentScript: [
	PATHS.src + '/dert_gg_button.js',
	PATHS.src + '/socket.js'
      ],
      background: PATHS.src + '/background.js',
    },
    devtool: argv.mode === 'production' ? false : 'source-map',
  });

module.exports = config;
