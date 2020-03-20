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
};

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

// Get route-handler of Polly for different HTTP methods
// @param {string} method HTTP request methods(e.g., 'GET', 'POST')
// @param {string|array} oneOrMoreUrls URL or array of URLs
// @param {string} baseUrl hostURL
module.exports.getRouteHandler = function(server, method, oneOrMoreUrls, baseUrl) {

  oneOrMoreUrls = appendBaseUrl(baseUrl, oneOrMoreUrls);
  method = method.toLowerCase();

  if (httpMethods.includes(method)) {
    return server[method](oneOrMoreUrls);
  }
  return server.any(oneOrMoreUrls);
}

