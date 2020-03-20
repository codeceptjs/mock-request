
module.exports.config = {
  tests: './*_test.js',
  timeout: 10000,
  output: './output',
  helpers: {
    Puppeteer: {
      url: 'http://localhost:8000',
      show: true,
      chrome: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      },
    },
    MockRequestHelper: {
      require: '../index.js'
    },
  },
  include: {},
  bootstrap: false,
  mocha: {},
  name: 'acceptance',
};