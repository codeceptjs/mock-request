const { Polly } = require('@pollyjs/core');
const FSPersister = require('@pollyjs/persister-fs');
const adapter = require('@pollyjs/adapter-puppeteer');
const { output } = codeceptjs;
const { getRouteHandler } = require('../scripts/mock');

class PuppeteerConnector {

  constructor(Puppeteer, options) {
    if (!Puppeteer.page) {
      throw new Error('Puppeteer page must be opened');
    }
    this.Puppeteer = Puppeteer;
    this.page = Puppeteer.page;
    this.options = options;

    Polly.register(FSPersister);
    Polly.register(adapter);    
  }

  async connect(title) {
    
    await this.page.setRequestInterception(true);

    const defaultConfig = {
      mode: 'passthrough',
      adapters: ['puppeteer'],
      adapterOptions: {
        puppeteer: { page: this.page },
      },
      persister: 'fs',
      persisterOptions: {
        fs: {
          recordingsDir: './data/requests'
        }
      }      
    };
    
    this.page.on('close', () => this.polly.stop());
    this.polly = new Polly(title, { ...defaultConfig, ...this.options });
    this.polly.server
      .any()
      .on('error', (request, error) => output.debug(`Errored ➞ ${request.method} ${request.url}: ${error}`))
      .on('response', (request) => {
        output.debug(`Request ${request.action} ➞ ${request.method} ${request.url} ${request.response.statusCode} • ${request.responseTime}ms`);        
      });
    return this.polly;
  }

  async isConnected() {
    return this.polly && this.polly.server;
  }

  async checkConnection() {
    if (!await this.isConnected()) return this.connect('Test');
  }

  async mockRequest(method, oneOrMoreUrls, dataOrStatusCode, additionalData = null) {
    const puppeteerConfigUrl = this.Puppeteer && this.Puppeteer.options.url;

    const handler = getRouteHandler(
      this.polly.server,
      method,
      oneOrMoreUrls,
      this.config.url || puppeteerConfigUrl,
    );

    if (typeof dataOrStatusCode === 'number') {
      const statusCode = dataOrStatusCode;
      if (additionalData) {
        return handler.intercept((_, res) => res.status(statusCode).send(additionalData));
      }
      return handler.intercept((_, res) => res.sendStatus(statusCode));
    }
    const data = dataOrStatusCode;
    return handler.intercept((_, res) => res.send(data));    
  }

  async record() {
    this.polly.record();
  }

  async replay() {
    this.polly.replay();
  }

  async passthrough() {
    this.polly.passthrough();
  }

  async flush() {
    this.polly.flush();
  }
 
  async disconnect() {
    try {
      await this.polly.stop();
      await this.page.setRequestInterception(false);
    } catch (err) {
      output.log('Polly was not disconnected, Puppeteer is already closed');
    }
  }

}

module.exports = PuppeteerConnector;
