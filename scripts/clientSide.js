// @ts-nocheck

const pollyClientSide = {
  setup: (title) => {
    const fetchUrls = [
      'https://cdn.jsdelivr.net/npm/@pollyjs/core@4/dist/umd/pollyjs-core.min.js',
      'https://cdn.jsdelivr.net/npm/@pollyjs/adapter-fetch@4/dist/umd/pollyjs-adapter-fetch.min.js',
      'https://cdn.jsdelivr.net/npm/@pollyjs/adapter-xhr@4/dist/umd/pollyjs-adapter-xhr.min.js',

    ];

    for (const url of fetchUrls) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = url;
      document.getElementsByTagName('head')[0].appendChild(script);
    }    

  },
  mockRequest: (method, oneOrMoreUrls, dataOrStatusCode, additionalData, baseUrl) => {
    const httpMethods = [
      'get',
      'put',
      'post',
      'patch',
      'delete',
      'merge',
      'head',
      'options',
    ];

    if (!window.polly) {
      window.PollyJS = window['@pollyjs/core'];
      window.PollyJS.Polly.register(window['@pollyjs/adapter-fetch']);
      window.PollyJS.Polly.register(window['@pollyjs/adapter-xhr']);
      window.polly = new PollyJS.Polly('Test', {
        mode: 'passthrough',
        adapters: ['fetch', 'xhr'],
      });      
    }

    function getRouteHandler(method, urls, baseUrl) {
      if (!window.polly) {
        throw new Error('Polly was not initialized');
      }
      const { server } = window.polly;
      urls = appendBaseUrl(baseUrl, urls);
      method = method.toLowerCase();

      if (httpMethods.includes(method)) {
        return server[method](urls);
      }
      return server.any(urls);
    }

    function appendBaseUrl(baseUrl = '', oneOrMoreUrls) {
      if (typeof baseUrl !== 'string') {
        throw new Error(`Invalid value for baseUrl: ${baseUrl}`);
      }
      if (!(typeof oneOrMoreUrls === 'string' || Array.isArray(oneOrMoreUrls))) {
        throw new Error(`Expected type of Urls is 'string' or 'array', Found '${typeof oneOrMoreUrls}'.`);
      }
      // Remove '/' if it's at the end of baseUrl
      const lastChar = baseUrl.substr(-1);
      if (lastChar === '/') {
        baseUrl = baseUrl.slice(0, -1);
      }

      if (!Array.isArray(oneOrMoreUrls)) {
        return joinUrl(baseUrl, oneOrMoreUrls);
      }
      return oneOrMoreUrls.map(url => joinUrl(baseUrl, url));
    }

    function joinUrl(baseUrl, url) {
      return shouldAppendBaseUrl(url) ? `${baseUrl}/${trimUrl(url)}` : url;
    }

    function shouldAppendBaseUrl(url) {
      return !/^\w+\:\/\//.test(url);
    }

    function trimUrl(url) {
      const firstChar = url.substr(1);
      if (firstChar === '/') {
        url = url.slice(1);
      }
      return url;
    }

    const handler = getRouteHandler(
      method,
      oneOrMoreUrls,
      baseUrl,
    );
    if (typeof dataOrStatusCode === 'number') {
      const statusCode = dataOrStatusCode;
      if (additionalData) {
        return handler.intercept((_, res) => res.status(statusCode).send(additionalData));
      }
      return handler.intercept((_, res) => res.status(statusCode));
    }
    const data = dataOrStatusCode;
    return handler.intercept((_, res) => res.send(data));
  },

  isPollyObjectInitialized: () => window.polly && window.polly.server,  
  
  mockServer: (configFn) => {
 
    if (!window.polly) {
      window.PollyJS = window['@pollyjs/core'];
      window.PollyJS.Polly.register(window['@pollyjs/adapter-fetch']);
      window.PollyJS.Polly.register(window['@pollyjs/adapter-xhr']);
      window.polly = new PollyJS.Polly('Test', {
        mode: 'passthrough',
        adapters: ['fetch', 'xhr'],
      });      
    }
 
    eval(`(${configFn})(window.polly.server)`);
  },

  stopMocking: async () => {
    await window.polly.stop();
    delete window.polly;
  },
  flush: async() => {
    await polly.flush();
  },
  record: () => {    
    window.polly.record();
  },
  passthrough: () => {
    window.polly.passthrough();
  },  
  replay: () => {
    window.polly.replay();
  }    

};

module.exports = pollyClientSide;
