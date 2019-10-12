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
// DNS
const dns = require('dns');

class Utils {
  /**
   * Various useful utilities used throughout the bot code.
   */
  constructor (parent) {
    this.parent = parent;
  }

  /**
   * Resolves an IPv4 address for the specified hostname, through the DNS protocol.
   */
  dnsResolve4(hostname) {
    return new Promise((resolve, reject) => {
      dns.resolve4(hostname, (err, addresses) => {
        if (err) {
          reject(err);
        } else {
          resolve(addresses[0]);
        }
      });
    });
  }

  /**
   * Resolves an IPv6 address for the specified hostname, through the DNS protocol.
   */
  dnsResolve6(hostname) {
    return new Promise((resolve, reject) => {
      dns.resolve6(hostname, (err, addresses) => {
        if (err) {
          reject(err);
        } else {
          resolve(addresses[0]);
        }
      });
    });
  }

  /**
   * Parses key-value arguments in the form name=value.
   * For example,
   *   [ 'name=value', 'another=this' ]
   * yields
   *   { name: 'value'
   *     another: 'this' }
   */
  parseKeyValueArguments(args) {
    let argsObject = {};

    (args || []).forEach((element) => {
      element = element || '';
      let parts = element.split('=');

      argsObject[parts[0]] = parts.length > 1 ? parts.slice(1).join(' ') : true;
    });
    return argsObject;
  }

  /**
   * Returns a function that would be used by Array.sort().
   * This function executes a sort in reverse order of the one used by comparatorFunction.
   */
  reverseOrder(comparatorFunction) {
    return comparatorFunction ? (a, b) => comparatorFunction(b, a) : null;
  }

  /**
   * Sorts object's properties by key.
   */
  sortByKey(object) {
    let ordered = {};

    // Sort the keys and iterate over them
    Object.keys(object || {}).sort().forEach((key) => {
      ordered[key] = object[key];
    });
    return ordered;
  }
}

module.exports = Utils;
