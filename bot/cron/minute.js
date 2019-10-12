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
// This is the cron job that runs every minute.
// It should reply to every mention to @mastostats that includes a command

// Load Mastostats
let bot = require(__dirname + '/../bot.js');
let mentionCount = {};

// Fetch mentions
bot.mastodon.mentions().then((result) => {
  for (let mention of result) {
    if (mention) {
      let ignore = false;

      // Did we already process this mention?
      for (let processed of bot.data.processedMentions) {
        if (processed == mention.id) {
          ignore = true;
          break; // already processed!
        }
      }
      if (mention.account.bot) {
        // No processing from bots! Prevent result scraping
        // This block is definitive and cannot be reverted.
        bot.mastodon.block(mention.account.id);
        continue;
      } else if (!mention.status || ignore) {
        // Mention to ignore or with no status
        continue;
      }

      // Log that an user mentioned @mastostats
      let commands = bot.mastodon.sanitizeMention(mention.status.content);

      mentionCount[mention.account.acct] = (mentionCount[mention.account.acct] || 0) + commands.length;
      if (mentionCount[mention.account.acct] > 5) {
        // 5 requests within one minute: probably an attempt to flood the server
        // Block temporary, lasts three hours and is removed by bot/cron/3hours.js

        // Note: only (at most) the first four requests are answered
        bot.mastodon.block(mention.account.id);
        bot.data.blockedAccounts.push(mention.account.id);
        continue;
      }

      // Process each command in the list
      for (let cmd of commands) {
        console.log(`Processing mention ${mention.id}...`);
        bot.mastodon.processCommand(cmd, mention.account, mention.status);
      }
    }
  }
}).catch((err) => {
  // A fatal error occurred; log to stderr
  console.error(err);
});
