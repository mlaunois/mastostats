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
// Express
const express = require('express'),
      helmet = require('helmet');
const app = express();
const http = require('http').createServer(app);
const port = process.env.PORT || 3000;

// Node modules
const fs = require('fs').promises;

// Strip tags
const striptags = require('striptags');

// Socket.IO
const io = require('socket.io')(http);

// Load environment variables
require(__dirname + '/bot/env.js');

// Logger
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;
const loggerFormat = printf(({ level, message, timestamp }) => {
  if (global.req) {
    return `${timestamp} (${global.req.ip} at ${global.req.originalUrl}) [${level}]: ${message}`;
  } else {
    return `${timestamp} [${level}]: ${message}`;
  }
});
const loggerGlobal = createLogger({
  format: combine(
    timestamp(),
    loggerFormat
  ),
  transports: [
    new transports.File({
      filename: __dirname + '/.data/access.log'
    })
  ]
});

// Bot handler
const bot = require('./bot/bot.js');
bot.logger = loggerGlobal;

// Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      fontSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "code.jquery.com", "use.fontawesome.com"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  noCache: true,
  referrerPolicy: {
    policy: 'no-referrer'
  }
}));
app.use('/assets', express.static(__dirname + '/server/assets'));
app.use((req, res, next) => {
  // Global variables for Winston logging
  global.req = req;
  bot.logger.info('Queried path');

  // Recommended headers
  res.set('X-Frame-Options', 'DENY');
  next();
});

// HTML pages
app.get(`/docs/commands/:cmdName`, (req, res, next) => {
  var split = unescape(req.params.cmdName).split('/');
  var commandName = split.length ? split[0] : req.params.cmdName;
  fs.readFile(__dirname + `/server/pages/command-help/${commandName}.html`, 'utf8').then((data) => {
    res.send(Function('req', 'bot', 'head', 'return `' + data + '`')(req, bot, (title, description, canonical, additionalStylesheets) => {
      return `<meta charset="utf-8" />
              <title>${ striptags(title) }</title>
              <link rel="stylesheet" href="/assets/common.css" />
              ${ (function () {
                let string = '';
                for (let style of additionalStylesheets) {
                  string += `<link rel="stylesheet" href="/assets/${ escape(striptags(style)) }.css" />\n`;
                }
                return string;
              })() }
              <link rel="canonical" href="${canonical}" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <meta name="description" content="${description}" />
              <meta name="author" content="Maxime Launois" />
              <meta name="copyright" content="Copyright 2019 Maxime Launois, under MIT License" />
              <meta property="og:type" content="article" />
              <meta property="og:title" content="${title}" />
              <meta property="og:image" content="/assets/official-logo.png" />
              <meta property="og:url" content="${canonical}" />
              <meta property="og:description" content="${description}" />`;
    }));
    res.end();
  }).catch((err) => {
    next(err);
  });
});

// Admin control panel
app.get(`/${process.env.ADMIN_ENDPOINT}/banned-instances`, (req, res, next) => {
  fs.readFile(__dirname + '/server/pages/banned-instances.html', 'utf8').then((data) => {
    res.send(Function('req', 'bot', 'return `' + data + '`')(req, bot));
    res.end();
  }).catch((err) => {
    next(err);
  });
});

// Socket connections
io.on('connection', (socket) => {
  socket.on('get-banned-instance-list', () => {
    io.emit('result-banned-instance-list', {
      items: bot.data.bannedInstances
    });
  });
  socket.on('add-banned-instance-list', (instanceName) => {
    bot.data.bannedInstances.push(instanceName);
    io.emit('result-banned-instance-list', {
      items: bot.data.bannedInstances
    });
  });
  socket.on('remove-banned-instance-list', (instanceName) => {
    bot.data.bannedInstances = bot.data.bannedInstances.filter((element) => element != instanceName);
    io.emit('result-banned-instance-list', {
      items: bot.data.bannedInstances
    });
  });
});

// Error pages
app.use(function (req, res) {
  res.status(404);
  fs.readFile(__dirname + '/server/pages/errors/404.html', 'utf8').then((data) => {
    res.send(data);
    res.end();
  }).catch((err) => {
    res.sendStatus(500);
  });
});

// Listen on port in .env file, or 3000 if omitted
http.listen(port, () => {
  console.log(`Mastostats is listening on port ${port}...`)
});
