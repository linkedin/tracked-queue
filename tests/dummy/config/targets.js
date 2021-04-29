'use strict';

const devBrowsers = ['last 1 Chrome versions'];

const prodBrowsers = [
  'last 2 Chrome versions',
  'last 2 Firefox versions',
  'last 2 Safari versions',
];

const isCI = Boolean(process.env.CI);
const isProduction = process.env.EMBER_ENV === 'production';

module.exports = {
  browsers: isCI || isProduction ? prodBrowsers : devBrowsers,
};
