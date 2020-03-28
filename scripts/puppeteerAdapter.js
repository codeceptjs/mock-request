const { URL } = require('@pollyjs/utils');
const Adapter = require('@pollyjs/adapter');
const PuppeteerAdapter = require('@pollyjs/adapter-puppeteer');

const PASSTHROUGH_PROMISES = Symbol();
const PASSTHROUGH_REQ_ID_QP = 'pollyjs_passthrough_req_id';
const LISTENERS = Symbol();


module.exports = class PuppeteerCodeceptJSAdapter extends PuppeteerAdapter {
  static get name() {
    return 'puppeteer';
  }
  async onRecord(pollyRequest) {
    const { request } = pollyRequest.requestArguments;
    request.continue();
    await this.onPassthrough(pollyRequest);
    await this.persister.recordRequest(pollyRequest);
  }

  async respondToRequest(pollyRequest, error) {
    const { request } = pollyRequest.requestArguments;
    const { response } = pollyRequest;

    if (error) {
      if (error.toString().includes('already handled')) {
        return;
      }
      if (request._interceptionHandled) return;
      // If an error was returned then we force puppeteer to abort the current
      // request. This will emit the `requestfailed` page event and allow the end
      // user to handle the error.
      try {
        await request.abort();
      } catch (err) {
        if (err.toString().includes('already handled')) {
          return;
        }        
      }
    } else {
      await request.respond({
        status: response.statusCode,
        headers: response.headers,
        body: response.body
      });
    }
  }

}
