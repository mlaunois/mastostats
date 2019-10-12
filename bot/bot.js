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
// Load environment settings
require(__dirname + '/env.js');

// instances.social API
const MastodonInstances = require(__dirname + '/instances.js');

// Mastodon API
const MastodonApi = require(__dirname + '/mastodon.js');

// Utilities
const Utils = require(__dirname + '/utils.js');

// Bot data
const BotData = require(__dirname + '/data.js');

// Command handler
const CommandHandler = require(__dirname + '/commands.js');

class StatsBot {
  /**
   * The constructor for the official Mastodon statistics class.
   */
  constructor () {
    this.instances = new MastodonInstances(this);
    this.utils = new Utils(this);
    this.mastodon = new MastodonApi(this);
    this.data = new BotData(this);
    this.command = new CommandHandler(this);

    this.cache = {};

    // Bot info
    this.versionCode = 1;
    this.version = '1.0.0';
    this.site = 'https://mastostats.ftp.sh';
    this.bugTracker = 'https://github.com/mlaunois/mastostats/issues';
    this.copyright = 'Copyright (c) 2019 Maxime Launois';
  }

  /**
   * All runtime errors go to this function.
   */
  handleError(err) {

  }
}

module.exports = new StatsBot();
