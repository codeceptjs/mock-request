module.exports.config = {
  tests: './*_test.js',
  timeout: 10000,
  output: './output',
  helpers: {
    WebDriver: {
      url: 'http://127.0.0.1:8000',
      browser: 'chrome',
      // host: TestHelper.seleniumHost(),
      // port: TestHelper.seleniumPort(),
      // disableScreenshots: true,
      // desiredCapabilities: {
      //   chromeOptions: {
      //     args: ['--headless', '--disable-gpu', '--window-size=1280,1024'],
      //   },
      // },
    },
    MockRequestHelper: {
      require: '../index.js'
    },
  },
  include: {},
  mocha: {},
  name: 'acceptance',
};
