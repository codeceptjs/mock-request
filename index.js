const { container } = codeceptjs;

/**
 * This helper allows to **mock requests while running tests in Puppeteer or WebDriver**.
 * For instance, you can block calls to 3rd-party services like Google Analytics, CDNs.
 * Another way of using is to emulate requests from server by passing prepared data.
 * 
 * MockRequest helper works in these [modes](https://netflix.github.io/pollyjs/#/configuration?id=mode):
 * 
 * * passthrough (default) - mock prefefined HTTP requests
 * * record - record all requests into a file
 * * replay - replay all recorded requests from a file
 * 
 * Combining record/replay modes allows testing websites with large datasets. 
 * 
 * To use in passthrough mode set rules to mock requests and they will be automatically intercepted and replaced:
 * 
 * ```js
 * // default mode
 * I.mockRequest('GET', '/api/users', '[]');
 * ```
 * 
 * In record-replay mode start mocking to make HTTP requests recorded/replayed, and stop when you don't need to block requests anymore:
 * 
 * ```js
 * // record or replay all XHR for /users page
 * I.startMocking();
 * I.amOnPage('/users');
 * I.stopMocking();
 * ```
 *
 * ### Installations
 *
 * ```
 * npm i @codeceptjs/mock-request --save-dev
 * ```
 *
 * Requires Puppeteer helper or WebDriver helper enabled
 *
 * ### Configuration
 * 
 * #### With Puppeteer
 *
 * Enable helper in config file:
 *
 * ```js
 * helpers: {
 *    Puppeteer: {
 *      // regular Puppeteer config here
 *    },
 *    MockRequestHelper: {
 *      require: '@codeceptjs/mock-request',
 *    }
 * }
 * ```
 *
 * [Polly config options](https://netflix.github.io/pollyjs/#/configuration?id=configuration) can be passed as well:
 * 
 * #### With Puppeteer for Record & Replay
 * 
 * Set mode via enironment variable, `replay` mode by default:
 *
 *
 * ```js
 * // enable replay mode
 * helpers: {
 *  Puppeteer: {
 *    // regular Puppeteer config here
 *  },
 *  MockRequest: {
 *     require: '@codeceptjs/mock-request',
 *     mode: process.env.MOCK_MODE || 'replay',
 *  },
 * }
 * ```
 * 
 * Toggle record/replay mode by passing `MOCK_MODE` environment variable when running.
 * 
 * Record HTTP interactions:
 * 
 * ```
 * MOCK_MODE=record npx codeceptjs run --debug
 * ```
 * 
 * Interactions between `I.startMocking()` and `I.stopMocking()` will be recorded and saved to `data/requests` directory.
 * To replay them launch tests without environment variable:
 * 
 * ```
 * npx codeceptjs run --debug
 * ```
 * 
 * #### With WebDriver
 * 
 * This helper partially works with WebDriver. It can intercept and mock requests **only on already loaded page**.
 * 
 * ```js
 * helpers: {
 *    WebDriver: {
 *      // regular WebDriver config here
 *    },
 *    MockRequestHelper: {
 *      require: '@codeceptjs/mock-request',
 *    }
 * }
 * ```
 * 
 * > Record/Replay mode is not tested in WebDriver but technically can work with [REST Persister](https://netflix.github.io/pollyjs/#/examples?id=rest-persister)
 *
 * ### Usage
 * 
 * Enable mocking requests with `I.startMocking()`, disable mocking with `I.stopMocking()`.
 * To set up custom rules to intercept requests use `I.mockRequest()`
 *
 *
 */
class MockRequest {
  constructor(config) {
    this.options = config;
    this.connector = null;
  }

  async _after() {
    try {
      await this.stopMocking();
    } catch (err) {
      
    }
    this.connector = null;
  }

  async _initializeConnector() {
    const helpers = container.helpers();
    if (helpers.Puppeteer) {
      // recreate if page changed
      if (this.connector 
        && this.connector.page 
        && this.connector.page === helpers.Puppeteer.page) {
          return;
      }

      const PuppeteerConnector = require('./connector/Puppeteer');
      this.connector = new PuppeteerConnector(helpers.Puppeteer, this.options);
    }
    if (!this.connector && helpers.WebDriver) {
      const WebDriverConnector = require('./connector/WebDriver');
      this.connector = new WebDriverConnector(helpers.WebDriver, this.options);
    }
    if (!this.connector) {
      throw new Error('Puppeteer or WebDriver helper required to mock requests')
    }
  }

  /**
   * Starts mocking of http requests.
   * In record mode starts recording of all requests.
   * In replay mode blocks all requests and replaces them with saved.
   * 
   * If inside one test you plan to record/replay requests in several places, provide title as the parameter: 
   * 
   * ```
   * // start mocking requests for a test
   * I.startMocking(); 
   * 
   * // start mocking requests for main page
   * I.startMocking('main-page');
   * I.stopMocking();
   * I.startMocking('login-page');
   * ``` 
   *
   * @param {*} title
   */
  async startMocking(title = 'Test') {
    this._initializeConnector();
    await this.connector.connect(title);
  }   

  /**
  * Forces record mode for mocking.
  * Requires mocking to be started.
  * 
  * ```js
  * I.recordMocking();
  * ``` 
  * 
  */
  async recordMocking() {    
    assertMockingStarted(this.connector);
    await this.connector.record();
  }

  /**
  * Forces replay mode for mocking.
  * Requires mocking to be started.
  * 
  * ```js
  * I.replayMocking();
  * ``` 
  * 
  */  
  async replayMocking() {
    assertMockingStarted(this.connector);
    await this.connector.replay();
  }

  /**
  * Forces passthrough mode for mocking.
  * Requires mocking to be started.
  * 
  * ```js
  * I.passthroughMocking();
  * ``` 
  * 
  */  
  async passthroughMocking() {
    assertMockingStarted(this.connector);
    await this.connector.passthrough();
  }  

  /**
  * Waits for all requests handled by MockRequests to be resolved:
  * 
  * ```js
  * I.flushMocking();
  * ```
  */
  async flushMocking() {
    assertMockingStarted(this.connector);
    await this.connector.flush();
  }
  
  /**
   * Stops mocking requests.
   * Must be called to save recorded requests into faile.
   * 
   * ```js
   * I.stopMocking();
   * ```
   */
  async stopMocking() {
    if (this.connector) this.connector.disconnect();
  }

  async after() {
    if (this.connector) this.connector.disconnect();
  }

  /**
   * Mock response status
   *
   * ```js
   * I.mockRequest('GET', '/api/users', 200);
   * I.mockRequest('ANY', '/secretsRoutes/*', 403);
   * I.mockRequest('POST', '/secrets', { secrets: 'fakeSecrets' });
   * I.mockRequest('GET', '/api/users/1', 404, 'User not found');
   * ```
   *
   * Multiple requests
   *
   * ```js
   * I.mockRequest('GET', ['/secrets', '/v2/secrets'], 403);
   * ```
   * @param {string} method request method. Can be `GET`, `POST`, `PUT`, etc or `ANY`.
   * @param {string|string[]} oneOrMoreUrls url(s) to mock. Can be exact URL, a pattern, or an array of URLs.
   * @param {number|string|object} dataOrStatusCode status code when number provided. A response body otherwise
   * @param {string|object} additionalData response body when a status code is set by previous parameter.
   *
   */
  async mockRequest(method, oneOrMoreUrls, dataOrStatusCode, additionalData = null) {
    this._initializeConnector();
    await this.connector.checkConnection();
    await this.connector.mockRequest(...arguments)
  }
}

module.exports = MockRequest;

function assertMockingStarted(connector) {
  if (!connector) throw new Error('Mocking should be started. Call startMocking() before');
}