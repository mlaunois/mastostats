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
// HTTP request library
const HttpRequest = require(__dirname + '/http.js');

// Semantic versioning
const semver = require('semver');

class MastodonInstances {
  /**
   * Accesses the Mastodon instances (instances.social) API.
   */
  constructor (parent) {
    this.parent = parent;
  }

  /**
   * Cache global values from the JSON returned by the https://instances.social/api/x.y/instances/show endpoint.
   *
   * NOT TO BE USED IN USER CODE!
   */
  cacheGlobalValues(instances) {
    if (typeof this.parent.cache === "object") {
      // Instance count
      // Instances object
      this.parent.cache.instances = instances = instances.filter((i) => {
        // Process banned instances
        let bannedInstances = this.parent.data.bannedInstances;
        for (let banned of bannedInstances) {
          if (banned == i.name) {
            // This instance has been banned!
            return false;
          }
        }

        return true;
      });
      this.parent.cache.totalInstances = instances.length;

      // User count
      // Status count
      // Domain connections count
      let totalUsers = 0,
          totalStatuses = 0,
          totalConnections = 0;

      for (let i of instances) {
        totalUsers += Number.parseInt(i.users) || 0;
        totalStatuses += Number.parseInt(i.statuses) || 0;
        totalConnections += Number.parseInt(i.connections) || 0;
     }

      this.parent.cache.totalUsers = totalUsers;
      this.parent.cache.totalStatuses = totalStatuses;
      this.parent.cache.totalConnections = totalConnections;
    }
  }

  /**
   * Returns a function which is designed to be passed to Array's filter().
   * It checks whether there are more users in the instances than specified.
   */
  filterMinimalUsers(minUsers) {
    minUsers = Number.parseInt(minUsers);
    if (!minUsers) {
      return () => true;
    }

    return (i) => {
      return i.users >= minUsers;
    };
  }

  /**
   * Returns a function which is designed to be passed to Array's filter().
   * It checks whether there are less users in the instances than specified.
   */
  filterMaximalUsers(maxUsers) {
    maxUsers = Number.parseInt(maxUsers);
    if (!maxUsers) {
      return () => true;
    }

    return (i) => {
      return i.users <= maxUsers;
    };
  }

  /**
   * Returns a function which is designed to be passed to Array's filter().
   * It checks whether there are more posted statuses on the instances than specified.
   */
  filterMinimalStatuses(minStatuses) {
    minStatuses = Number.parseInt(minStatuses);
    if (!minStatuses) {
      return () => true;
    }

    return (i) => {
      return i.statuses >= minStatuses;
    };
  }

  /**
   * Returns a function which is designed to be passed to Array's filter().
   * It checks whether there are less posted statuses on the instances than specified.
   */
  filterMaximalStatuses(maxStatuses) {
    maxStatuses = Number.parseInt(maxStatuses);
    if (!maxStatuses) {
      return () => true;
    }

    return (i) => {
      return i.statuses <= maxStatuses;
    };
  }

  /**
   * Returns a function which is designed to be passed to Array's filter().
   * It checks whether an instance's version satisfies the specified SemVer range.
   */
  filterVersion(range) {
    range = semver.validRange(range);
    if (!range) {
      return () => true;
    }

    return (i) => {
      // i.version is the version to check
      let instanceVersion = i.version;

      return semver.satisfies(instanceVersion, range);
    };
  }

  /**
   * Shortcut function to GET an instances.social endpoint.
   */
  get(endpoint, queryData) {
    return HttpRequest.get({
      protocol: 'https:',
      hostname: 'instances.social',
      path: `/api/1.0/${endpoint}`,
      headers: {
        'Authorization': `Bearer ${process.env.INSTANCES_API_TOKEN}`
      }
    }, queryData);
  }

  /**
   * This function returns information about a particular instance.
   * The return value is cached for the duration of the Node.js session.
   */
  async instanceInfo(hostname) {
    // Replace undefined and nulls with empty strings
    hostname = hostname || '';

    // Remove optional http: or https: part
    hostname = hostname.substr(hostname.startsWith('http://')
                                 ? 7 :
                                   (hostname.startsWith('https://')
                                      ? 8 :
                                        0));

    // Retrieve all instances
    await this.instanceObject();

    let instanceInfo = this.parent.cache.instances.filter((i) => {
      return i.name == hostname;
    });
    return instanceInfo ? instanceInfo[0] : null;
  }

  /**
   * Gets an array containing all known Mastodon instances.
   * The return value is cached for the duration of the Node.js session.
   */
  instanceObject() {
    return new Promise((resolve, reject) => {
      if (this.parent.cache && this.parent.cache.instances) {
        // Get value from the cache
        resolve(this.parent.cache.instances);
        return;
      }

      // Retrieve the value from instances.social
      this.get('instances/list', {
        count: 0
      }).then((result) => {
        // Manipulate the JSON body
        try {
          const { instances } = JSON.parse(result.body);
          this.cacheGlobalValues(instances);

          resolve(this.parent.cache.instances);
        } catch (err) {
          // We got here because the JSON was malformed
          reject(err);
        }
      }).catch((err) => {
        // Propagate the error
        reject(err);
      });
    });
  }

  /**
   * A function designed to be passed to Array's sort().
   * If so, the instances object is sorted by instance name.
   */
  sortByInstanceName(a, b) {
    return !a || !a.name
             ? -1
             : (!b || !b.name
                  ? 1
                  : a.name.localeCompare(b.name));
  }

  /**
   * A function designed to be passed to Array's sort().
   * If so, the instances object is sorted by number of statuses posted on instances.
   */
  sortByInstanceStatuses(a, b) {
    return !a
             ? -1
             : (!b
                  ? 1
                  : a.statuses - b.statuses);
  }

  /**
   * A function designed to be passed to Array's sort().
   * If so, the instances object is sorted by instance users.
   */
  sortByInstanceUsers(a, b) {
    return !a
             ? -1
             : (!b
                  ? 1
                  : a.users - b.users);
  }

  /**
   * A function designed to be passed to Array's sort().
   * If so, the instances object is sorted by version string.
   */
  sortByVersion(a, b) {
    return !a || !a.version
             ? -1
             : (!b || !b.version
                  ? 1
                  : a.version.localeCompare(b.version));
  }

  /**
   * This function returns the total number of domain connections across the Fediverse.
   * The return value is cached for the duration of the Node.js session.
   */
  async totalConnections() {
    // Retrieve all instances
    await this.instanceObject();

    return this.parent.cache.totalConnections;
  }

  /**
   * This function returns the total number of Mastodon instances across the Fediverse.
   * The return value is cached for the duration of the Node.js session.
   */
  async totalInstances() {
    // Retrieve all instances
    await this.instanceObject();

    return this.parent.cache.totalInstances;
  }

  /**
   * This function returns the total number of statuses across all known Mastodon instances.
   * The return value is cached for the duration of the Node.js session.
   */
  async totalStatuses() {
    // Retrieve all instances
    await this.instanceObject();

    return this.parent.cache.totalStatuses;
  }

  /**
   * This function returns the total number of Mastodon users across the Fediverse.
   * The return value is cached for the duration of the Node.js session.
   */
  async totalUsers() {
    // Retrieve all instances
    await this.instanceObject();

    return this.parent.cache.totalUsers;
  }
}

module.exports = MastodonInstances;
