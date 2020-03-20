const pollyWebDriver = require('../scripts/clientSide');
const { output } = codeceptjs;

class WebDriverConnector {

  constructor(WebDriver, options) {
    this.WebDriver = WebDriver;
    this.options = options;
  }

  async connect(title) {
    const { browser } = this.WebDriver;
    await browser.execute(pollyWebDriver.setup, title);
    await new Promise(res => setTimeout(res, 1000));
    this.browser = browser;
  }

  async isConnected() {
    return (this.browser && this.browser.execute(pollyWebDriver.isPollyObjectInitialized))
  }

  async checkConnection() {
    if (!await this.isConnected()) return this.connect();
  }

  async mockRequest(method, oneOrMoreUrls, dataOrStatusCode, additionalData) {
    const webDriverIOConfigUrl = this.WebDriver && this.WebDriver.options.url;
    await this.browser.execute(
      pollyWebDriver.mockRequest,
      method,
      oneOrMoreUrls,
      dataOrStatusCode,
      additionalData || undefined,
      this.options.url || webDriverIOConfigUrl,
    );
  }

  async flush() {
    await this.browser.execute(pollyWebDriver.flush);
  }

  async record() {
    await this.browser.execute(pollyWebDriver.record);
  }

  async passthrough() {
    await this.browser.execute(pollyWebDriver.passthrough);
  }  

  async replay() {
    await this.browser.execute(pollyWebDriver.replay);
  }  

  async disconnect() {
    if (!this.browser) return; // already disconnected
    try {
      await this.browser.execute(pollyWebDriver.stopMocking);
    } catch (err) {
      output.log('Disconnected, cant clear');
    }
    delete this.browser;
  }
}

module.exports = WebDriverConnector;
