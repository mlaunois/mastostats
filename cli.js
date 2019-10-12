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
const fs = require('fs'),
      fsPromises = fs.promises;

// Working with paths
const path = require('path');

// Utilities
const util = require('util');

// Mastostats bot
let bot = require(__dirname + '/bot/bot.js');
let waitForCommandExecution = false;

// Parse command-line arguments
const program = require('commander');
program
  .name('mastostats')
  .arguments('[file]')
  .action(function (file) {
    // Function called when a file is provided
    // The argument is the [file] optional argument
    if (!file || file == '-') {
      // Enter interactive mode when --eval flag is not specified
      program.interactive = program.interactive || !program.eval;
      return;
    }
    if (!path.isAbsolute(file)) {
      file = path.join(process.cwd(), file);
    }

    // File handle
    let fd;

    waitForCommandExecution = true;

    fsPromises.access(file, fs.constants.F_OK | fs.constants.R_OK).then(() => {
      // Attempt to read the file
      return fsPromises.open(file, 'r');
    }).then((handle) => {
      fd = handle;
      return handle.readFile('utf-8');
    }).then(async (contents) => {
      const commands = contents.split(/\r\n|\r|\n/);
      for (let c of commands) {
        // Execute every command
        if (c = c.trim()) {
          await evalCommandDirectly(c);
        }
      }
    }).catch((err) => {
      if (err.code == 'ENOENT' || err.code == 'EACCESS') {
        // File access error
        console.error(`error: ${file} is not a file or is not readable`);
      } else {
        console.error(`error:
${err}

This is an unexcepted error. Please report this issue at:

    https://github.com/mlaunois/mastostats/issues/new

by specifying exact steps and detailed information to reproduce the problem.`);
      }
    }).finally(() => {
      waitForCommandExecution = false;
      if (fd) {
        fd.close().catch(() => {});
      }
    });
  })
  .description('Invokes the Mastodon statistics CLI, by executing the commands specified in [file].\n'
             + 'When [file] is omitted or is -, enter interactive mode.')
  .option('-d, --debug',          'display debug information')
  .option('-e, --eval <command>', 'evaluate the specified command')
  .option('-i, --interactive',    'enter interactive mode')
  .version(`mastostats v${bot.version}`, '-v, --version')
  .parse(process.argv);

// Eval functions
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    let cmdName = (command || '').split(/\s/)[0];
    let result;
    switch (cmdName) {
      case '':
        reject('No command entered');
        return;
      case '#license':
        result = `Mastodon statistics bot
Copyright (c) 2019 Maxime Launois

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
        console.log(result);
        resolve(result);
        return;
      case '#reload':
        // Delete the module cache
        delete require.cache[require.resolve(__dirname + '/bot/bot.js')];
        delete require.cache[require.resolve(__dirname + '/bot/commands.js')];
        delete require.cache[require.resolve(__dirname + '/bot/env.js')];
        delete require.cache[require.resolve(__dirname + '/bot/http.js')];
        delete require.cache[require.resolve(__dirname + '/bot/instances.js')];
        delete require.cache[require.resolve(__dirname + '/bot/utils.js')];

        // Re-create the Mastostats bot
        let newBot = require('./bot/bot.js');
        newBot.data.__data = bot.data.__data;
        newBot.cache = bot.cache;
        bot = newBot;

        result = `Mastostats library reloaded`;
        console.log(result);
        resolve(result);
        return;
      default:
        bot.command.execute(command).then((result) => {
          // Print the result, if not empty
          if (result.trim()) {
            console.log(result);
          }
          resolve(result);
        }).catch((err) => {
          if (typeof err === "string") {
            // Error thrown from the command handler
            console.error(err);
            reject();
            return;
          } else {
            reject(err);
          }
        });
        return;
    }
  });
}
function evalCommand(readline) {
  readline.question('> ', (command) => {
    let cmdStart = process.hrtime();

    executeCommand(command).then((result) => {
      if (program.debug) {
        let cmdEnd = process.hrtime(cmdStart);
        console.debug(`Output length: ${result.length}`);
        console.debug(`Executed in ${ (cmdEnd[0] + (cmdEnd[1] / 1000000000)).toLocaleString('en-US') } seconds`);
      }
    }).catch((err) => {
      if (err) {
        console.error('An error occurred in the REPL:');
        console.error(err);
      }
    }).finally(() => {
      evalCommand(readline);
    });
  });
}
async function evalCommandDirectly(command) {
  return new Promise((resolve, reject) => {
    executeCommand(command).then(resolve).catch((err) => {
      if (err) {
        console.error(`error:
${err}

This is an unexcepted error. Please report this issue at:

    https://github.com/mlaunois/mastostats/issues/new

by specifying exact steps and detailed information to reproduce the problem.`);
        process.exit(-1);
      }
      resolve(); // Return value is ignored by callers
    });
  });
}

// Start the REPL
(async () => {
  if (program.eval) {
    await evalCommandDirectly(program.eval);
  }

  // Wait for execution of commands
  const startRepl = () => {
    if (!program.interactive) {
      return;
    }
    if (waitForCommandExecution) {
      setTimeout(startRepl, 50);
      return;
    }

    // Introduction message
    console.log(`
Mastodon statistics CLI version ${bot.version}
${bot.copyright}

This program is free software licensed under the MIT License;
see #license for details.`);

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const sigintHandler = () => {
      readline.close();
      process.exit(0);
    };

    // Workaround in https://stackoverflow.com/questions/10021373/what-is-the-windows-equivalent-of-process-onsigint-in-node-js
    process.on('SIGINT', sigintHandler);
    readline.on('SIGINT', sigintHandler);

    readline.on('close', () => {
      console.log('');
    });
    evalCommand(readline);
  };
  setTimeout(startRepl, 50);
})();
