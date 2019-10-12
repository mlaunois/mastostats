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
// This is the cron job that runs every three hours.
// It should unblock spammers and send messages to followers

// Load Mastostats
let bot = require(__dirname + '/../bot.js');
let mentionCount = {};

// Fetch followers
bot.mastodon.self().then((account) => {
  return bot.mastodon.followers(account.id);
}).then((result) => {
  for (let follower of result) {
    if (!follower) {
      continue;
    }

    // We suppose that account format is username@hostname
    let [ _, instanceName ] = follower.acct.split('@');

    // Give followers information about their home instance
    bot.mastodon.processCommand(`#info ${instanceName}`, follower);
  }
  return Promise.resolve();
}).then(() => {
  for (let account of bot.data.blockedAccounts) {
    if (!account) {
      continue;
    }

    bot.mastodon.unblock(account);
  }
  return Promise.resolve();
}).catch((err) => {
  // A fatal error occurred; log to stderr
  if (bot.logger) {
    bot.logger.error(err);
  } else {
    console.log(err);
  }
}).finally(() => {
  bot.data.commit();
});
