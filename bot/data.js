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
// Filesystem access
const fs = require('fs');

class BotData {
  /**
   * The constructor for the bot data.
   */
  constructor (parent) {
    this.parent = parent;
    this.__data = undefined;
  }

  /**
   * Gets list of blocked accounts.
   */
  get blockedAccounts() {
    this.load();
    return this.__data.blocked_accounts;
  }

  /**
   * Sets list of blocked accounts.
   */
  set blockedAccounts(newValue) {
    this.load();
    this.__data.blocked_accounts = newValue || [];
  }

  /**
   * Gets list of banned Mastodon instances.
   */
  get bannedInstances() {
    this.load();
    return this.__data.banned_instances;
  }

  /**
   * Sets list of banned Mastodon instances.
   */
  set bannedInstances(newValue) {
    this.load();
    this.__data.banned_instances = newValue || [];
  }

  /**
   * Gets list of processed mentions.
   */
  get processedMentions() {
    this.load();
    return this.__data.processed_mentions;
  }

  /**
   * Sets list of processed mentions.
   */
  set processedMentions(newValue) {
    this.load();
    this.__data.processed_mentions = newValue || [];
  }

  commit() {
    if (!this.__data) {
      // Bot data has not been loaded
      return;
    }

    // Ignore any write errors
    try {
      let contents = JSON.stringify(this.__data);
      fs.writeFileSync(__dirname + '/../.data/data.json', contents, 'utf-8');
    } catch (err) {}
  }

  /**
   * Loads the bot data from the associated files.
   * This method is intended to be called by property getters. So synchronous functions are used.
   * This is an exception to this bot, which almost uses everywhere else Promises.
   */
  load() {
    if (this.__data) {
      // Bot data has already been loaded
      return;
    }

    // On error, silently replace with empty data
    try {
      let contents = fs.readFileSync(__dirname + '/../.data/data.json', 'utf-8');
      this.__data = JSON.parse(contents);
    } catch (err) {
      // File access or malformed JSON error
      this.__data = {};
    }
  }
}

module.exports = BotData;
