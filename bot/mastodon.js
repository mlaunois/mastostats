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

// To strip HTML tags
const striptags = require('striptags');

class MastodonApi {
  /**
   * Accesses the Mastodon server API.
   */
  constructor (parent) {
    this.parent = parent;
  }

  /**
   * Blocks an account.
   */
  block(accountId) {
    return new Promise((resolve, reject) => {
      // Protection against self-inserted values
      if (!Number.parseInt(accountId)) {
        reject(new Error(`${accountId} is not a valid account ID`));
      }

      // Send the block request
      this.post(`accounts/${accountId}/block`).then(() => {
        this.parent.data.blockedAccounts.push(accountId);
        resolve();
      }).catch((err) => {
        // Propagate the error
        reject(err);
      });
    });
  }

  /**
   * Returns a list of blocked accounts.
   */
  async blockedAccounts() {
    return await this.get('blocks', {
      limit: 100000
    });
  }

  /**
   * Returns the array of accounts which are followers of the given account ID.
   */
  async followers(accountId) {
    return await this.get(`accounts/${accountId}/followers`, {
      limit: 100000
    });
  }

  /**
   * Shortcut function to GET a Mastodon API endpoint.
   */
  async get(endpoint, queryData) {
    let result = await HttpRequest.get({
      protocol: 'https:',
      hostname: 'mastodon.xyz',
      path: `/api/v1/${endpoint}`,
      headers: {
        'Authorization': `Bearer ${process.env.MASTODON_API_TOKEN}`
      }
    }, queryData);
    let jsonParsed = JSON.parse(result.body);

    if (jsonParsed.error) {
      throw new Error(jsonParsed.error);
    } else {
      return jsonParsed;
    }
  }

  /**
   * Fetches mentions from the Mastodon server.
   */
  async mentions() {
    let notifications = await this.get('notifications', {});
    return notifications.filter(i => i.type == 'mention');
  }

  /**
   * Creates a new status on Mastodon.
   */
  async newStatus(statusText, options) {
    options.status = statusText || '';
    return await this.post('statuses', options);
  }

  /**
   * Shortcut function to POST a Mastodon API endpoint.
   */
  async post(endpoint, postData) {
    let result = await HttpRequest.post({
      protocol: 'https:',
      hostname: 'mastodon.xyz',
      method: 'POST',
      path: `/api/v1/${endpoint}`,
      headers: {
        'Accept': '*/*', /**/
        'Authorization': `Bearer ${process.env.MASTODON_API_TOKEN}`,
        'User-Agent': `Mastostats ${this.parent.version}`
      }
    }, postData);
    let jsonParsed = JSON.parse(result.body);

    if (jsonParsed.error) {
      throw new Error(jsonParsed.error);
    } else {
      return jsonParsed;
    }
  }

  /**
   * Processes a command and replies to an account.
   */
  processCommand(command, account, status) {
    this.parent.command.execute(command).then((result) => {
      if (result.length > 500) {
        // Max status text length is 500 in Mastodon
        result = result.substr(0, 497) + '...';
      }
      return this.newStatus(`${account ? `@${account.acct} ` : ''}${ result.trim() }`, {
        in_reply_to_id: status ? status.id : undefined,
        visibility: status ? 'direct' : 'public'
      });
    }).catch((err) => {
      if (typeof err === "string") {
        this.newStatus(`${account ? `@${account.acct} ` : ''}${err}`);
      } else {
        console.error(err);
        this.newStatus(`${account ? `@${account.acct} ` : ''}A fatal error occurred:
${ err.code ? err.code + ': ' : '' }${err.message}

https://mastostats.ftp.sh/docs/errors/fatal`);
      }
    }).finally(() => {
      if (!status || !account) {
        return;
      }

      this.parent.data.processedMentions.push({
        id: status.id,
        account: account.acct
      });
      this.parent.data.commit();
    });
  }

  /**
   * Sanitizes the mention text by removing all HTML tags.
   * Returns a newline-separated array of Mastostats commands.
   */
  sanitizeMention(mentionText) {
    mentionText = striptags(mentionText || '', [ 'br' ]);

    // Remove @username mentions
    mentionText = mentionText.replace('@mastostats', '');
    mentionText = mentionText.replace('@mastostats@mastodon.xyz', '');

    // Handle multiple commands
    let commands = mentionText.split('<br>');
    for (let i in commands) {
      commands[i] = commands[i].trim();
    }

    return commands;
  }

  /**
   * Returns user's own account.
   */
  async self() {
    return this.get('accounts/verify_credentials');
  }

  /**
   * Removes a block applied on an account.
   */
  unblock(accountId) {
    return new Promise((resolve, reject) => {
      // Protection against self-inserted values
      if (!Number.parseInt(accountId)) {
        reject(new Error(`${accountId} is not a valid account ID`));
      }

      // Send the block request
      this.post(`accounts/${accountId}/unblock`).then(() => {
        this.parent.data.blockedAccounts = this.parent.data.blockedAccounts.filter((value) => value !== accountId);
        resolve();
      }).catch((err) => {
        // Propagate the error
        reject(err);
      });
    });
  }
}

module.exports = MastodonApi;
