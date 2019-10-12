#! /usr/bin/env node
/**
 * Mastodon statistics bot
 * Copyright (c) 2019 Maxime Launois
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
const http = require('http'),
      https = require('https');

const querystring = require('querystring');

class HttpRequest {
  /**
   * Creates a HTTP request.
   *
   * Along with the standard options provided by Node.js, the following values are also accepted:
   * - options.autoRedirect: whether to automatically redirect users
   * - options.postData: specify key-value data for POST requests. Parsed to JSON before sending request.
   * - options.queryData: specify query URL data for GET requests. Parsed to URL query string.
   */
  constructor (options) {
    if (!options) {
      this.__options = {};
      return;
    }
    if ('autoRedirect' in options) {
      // There is a specific option for POST data
      this.__autoRedirect = options.autoRedirect == true;

      delete options.autoRedirect;
    }
    if ('postData' in options && typeof options.postData === "object") {
      // There is a specific option for POST data
      this.__postData = querystring.stringify(options.postData);

      delete options.postData;
      options.headers = options.headers || {};
      //options.headers['Content-Type'] = 'application/json';
      //options.headers['Transfer-Encoding'] = 'chunked';
      options.headers['Content-Length'] = Buffer.byteLength(this.__postData);
    }
    if ('queryData' in options && typeof options.queryData === "object") {
      // There is a specific option for query string data
      options.path = (options.path || '/') + '?' + querystring.stringify(options.queryData);

      delete options.queryData;
    }

    this.__options = options;
  }

  /**
   * Creates and sends immediately a HTTP GET request with the given options.
   * options.method and options.autoRedirect are automatically set, to 'GET' and true respectively.
   *
   * Returns a Promise where:
   * .then(result => ...): result holds an Http.IncomingMessage object, which contains a special value: 'body' (the content body)
   * .catch(err => ...): error holds an Error object
   */
  static get(options, queryData) {
    if (!options) {
      options = {};
    }

    options.method = options.method || 'GET';
    options.autoRedirect = true;
    options.queryData = queryData;
    return new HttpRequest(options).send();
  }


  /**
   * Creates and sends immediately a HTTP POST request with the given options.
   * options.method and options.autoRedirect are automatically set, to 'POST' and true respectively.
   *
   * Returns a Promise where:
   * .then(result => ...): result holds an Http.IncomingMessage object, which contains a special value: 'body' (the content body)
   * .catch(err => ...): error holds an Error object
   */
  static post(options, postData) {
    if (!options) {
      options = {};
    }

    options.method = options.method || 'POST';
    options.autoRedirect = true;
    options.postData = postData;
    return new HttpRequest(options).send();
  }

  /**
   * Creates asynchronously a HTTP request.
   * This function returns an Http.IncomingMessage object, which
   * contains a special value: 'body' (the body contents).
   */
  send() {
    return new Promise((resolve, reject) => {
      const req = (this.__options.protocol == 'https:' ? https : http).request(this.__options, (res) => {
        res.body = '';
        res.setEncoding('utf-8');

        res.on('data', (chunk) => {
          res.body += chunk;
        });
        res.on('end', () => {
          if (!this.__autoRedirect || !res.headers.location) {
            resolve(res);
          } else {
            // Automatic redirect has been enabled
            const location = res.headers.location;
            let urlObject = url.parse(location, true, true);

            this.__options.protocol = urlObject.protocol;
            this.__options.port = urlObject.port;
            this.__options.hostname = urlObject.hostname;
            this.__options.pathname = urlObject.path + urlObject.search;

            // Send a new request
            this.send().then(result => {
              resolve(result);
            }).catch(err => {
              reject(err);
            });
            return;
          }
        });
      });
      req.on('error', (err) => {
        reject(err);
      });
      req.end(this.__postData || '');
    });
  }
}

module.exports = HttpRequest;
