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
// Module for Semantic Versioning
const semver = require('semver');

class CommandHandler {
  /**
   * Command handler for the Mastodon statistics bot.
   */
  constructor (parent) {
    this.parent = parent;
  }

  /**
   * Executes the given command and returns its results.
   */
  async execute (command) {
    let parts = (command || '').split(/\s+/),
        cmdName = parts[0],
        args = parts.slice(1);

    // Check for a comment (starting with @)
    if (cmdName.startsWith('@')) {
      return '';
    }

    // Sanitize arguments
    for (let i in args) {
      args[i] = (args[i] || '').trim();
    }

    // Fetch the command function
    if (!cmdName.startsWith('#')) {
      throw `Command must start with a hash character: ${command}`;
    } else if (cmdName == '#execute') {
      throw `Are you trying to use me to execute recursively a function? This bot does not allow this behavior ;(`;
    }

    let cmdFunction = this[cmdName.substr(1)];
    if (cmdFunction) {
      try {
        return await cmdFunction.call(this.parent, command, args);
      } catch (err) {
        if (typeof err === "string") {
          // Error from the command
          throw `An error occurred when executing ${command}:

${err}`;
        } else {
          // Another error
          throw err;
        }
      }
    } else {
      throw `Command not recognized: ${command}`;
    }
  }

  /**
   * #about command handler
   */
  async about(command, args) {
    return `Mastostats ${this.parent.version}, by Maxime Launois

Copyright (C) 2019 Maxime Launois, licensed under the MIT License.
`;
  }

  /**
   * #desc command handler
   */
  async desc(command, args) {
    if (!args || args.length == 0) {
      throw `No instance name provided`;
    }

    // Check first if the designated instance has been banned
    let instanceName = args[0];
    for (let banned of this.data.bannedInstances) {
      if (instanceName == banned) {
        throw `The instance ${instanceName} has been banned.`;
      }
    }

    // Check instance information
    let instanceInfo = await this.instances.instanceInfo(instanceName);
    if (!instanceInfo) {
      throw `No Mastodon instance named ${instanceName} exists`;
    }
    let descType = args.length == 1 ? 'short' : args[1];

    // Check description type
    let description = descType == 'short'
                        ? instanceInfo.info.short_description
                        : (descType == 'full'
                             ? instanceInfo.info.full_description
                             : null);
    if (!description) {
      throw `Description type ${descType} does not exist`;
    }
    return description;
  }

  /**
   * #help command handler
   */
  async help(command, args) {
    if (!args || args.length == 0 || !args[0].trim()) {
      args = args || [];
      args[0] = 'help';
    }

    // Fetch the command name
    let cmdName = args[0];
    switch (cmdName) {
      case 'about':
        return `Usage: #about

Returns information about the Mastostats software.
`;
      case 'desc':
        return `Usage: #desc [instance-name] [description-type]

Outputs an instance's description.
[instance-name] is the instance name, without the http:// part.

[description-type] is the description type of the instance, either "full"
for the long description or "short" for the short description. It can be
omitted; the default for this option is "short".
`;
      case 'help':
        return `Mastodon statistics (aka the Mastostats) bot
These commands are supported:

#about - output about information
#desc - displays instance description
#help - output usage information
#info - output information about an instance
#instances - returns list of instances based on filters

Use #help [command] to output usage information for a specific command.
If #help is used without any argument, the help for the #help command
is displayed.
`;
      case 'info':
        return `Usage: #info [instance-name]

Outputs information about a Mastodon instance.
[instance-name] is the instance name, without the http:// part.

If [instance-name] is omitted or set to the special keyword 'global',
global statistics about the Fediverse are displayed.`;
      case 'desc':
        return `Usage: #desc [instance-name] [description-type]

Outputs the description of a Mastodon instance. Use [description-type]
to specify the description type, either 'short' for the short description
or 'full' for the full description. Any other value will be denied.`;
      case 'instances':
        return `Usage #instances [filters...]

Outputs instances

[filters] is a space-separated list of key-value pairs, which is one of
the values defined at https://mastostats.ftp.sh/docs/commands/instances`;
      default:
        throw `No help available for command ${cmdName}`;
    }
  }

  /**
   * #info command handler
   */
  async info(command, args) {
    if (!args || args.length == 0) {
      args = args || [];
      args[0] = 'global'; // the first argument
    }

    // Check first if the designated instance has been banned
    let instanceName = args[0];
    for (let banned of this.data.bannedInstances) {
      if (instanceName == banned) {
        throw `The instance ${instanceName} has been banned.`;
      }
    }

    // Check we are checking global statistics
    if (instanceName == 'global' || instanceName == '*') {
      let instanceCount = await this.instances.totalInstances(),
          totalUsers = await this.instances.totalUsers(),
          totalStatuses = await this.instances.totalStatuses(),
          totalConnections = await this.instances.totalConnections();

      // Final output
      let output = 'Mastodon network is composed of ';
      output += `${ instanceCount.toLocaleString('en-US') } instances\n\n`;
      output += `There are ${ totalUsers.toLocaleString('en-US') } registered users\n`;
      output += `There are ${ totalStatuses.toLocaleString('en-US') } posted statuses\n`;
      output += `and ${ totalConnections.toLocaleString('en-US') } connections with other instances\n`;

      return output;
    } else {
      let instanceInfo = await this.instances.instanceInfo(instanceName);
      if (!instanceInfo) {
        throw `No Mastodon instance named ${instanceName} exists`;
      }

      // Ignore DNS errors when resolving IP addresses
      let ip4 = null;
      try {
        ip4 = await this.utils.dnsResolve4(instanceName);
      } catch (err) {}
      let ip6 = null;
      try {
        ip6 = await this.utils.dnsResolve6(instanceName);
      } catch (err) {}

      let output = `Instance info for ${instanceName} (currently ${ instanceInfo.up ? 'up' : 'down' })`;
      if (ip4) {
        output += ` (${ip4})`;
      }
      output += '\n\n';

      if (instanceInfo.users) {
        output += `There are ${ Number.parseInt(instanceInfo.users).toLocaleString('en-US') } registered users`;
        if (instanceInfo.active_users) {
          output += ` and ${ Number.parseInt(instanceInfo.active_users).toLocaleString('en-US') } (${ Math.floor(instanceInfo.active_users * 10000 / instanceInfo.users) / 100 }%) who logged in this month`;
        }
        output += '\n';
      } else {
        output += 'Number of users is unknown\n';
      }
      if (instanceInfo.statuses) {
        output += `There are ${ Number.parseInt(instanceInfo.statuses).toLocaleString('en-US') } posted statuses\n`;
      } else {
        output += 'Number of posted statuses is unknown\n';
      }
      if (instanceInfo.connections) {
        output += `There are ${ Number.parseInt(instanceInfo.connections).toLocaleString('en-US') } connections with other instances\n`;
      } else {
        output += 'Number of domain connections is unknown\n';
      }
      output += `${ instanceInfo.open_registrations ? 'Registrations are open' : 'No new registrations' }\n`;
      output += `IPv6 address: ${ ip6 || 'none' }\n`;

      return output;
    }
  }

  /**
   * #instances command handler
   */
  async instances(command, args) {
    if (args && args.length) {
      const argsObject = this.utils.parseKeyValueArguments(args);
      let instances = await this.instances.instanceObject();

      // Error logging
      let errors = '';

      // Filters
      let minUsers = 0,
          maxUsers = 0;
      let range = '';
      let minStatuses = 0,
          maxStatuses = 0;
      let limit = 10;
      let sortDesc = false;

      // Minimal number of users
      switch (argsObject.min_users) {
        case undefined:
          break;
        case true:
          errors += 'Ignoring min_users: cannot be a boolean value\n';
          break;
        default:
          minUsers = Number.parseInt(argsObject.min_users);
          if (!(minUsers >= 0)) {
            minUsers = 0;
            errors += `Ignoring min_users: "${argsObject.min_users}" is not a valid number\n`;
          }

          instances = instances.filter(this.instances.filterMinimalUsers(minUsers));
      }

      // Maximal number of users
      switch (argsObject.max_users) {
        case undefined:
          break;
        case true:
          errors += 'Ignoring max_users: cannot be a boolean value\n';
          break;
        default:
          maxUsers = Number.parseInt(argsObject.max_users);
          if (!(maxUsers >= 0)) {
            maxUsers = 0;
            errors += `Ignoring max_users: "${argsObject.max_users}" is not a valid number\n`;
          }

          instances = instances.filter(this.instances.filterMaximalUsers(maxUsers));
      }

      // Matching a version range
      switch (argsObject.version) {
        case undefined:
          break;
        case true:
          errors += 'Ignoring version: cannot be a boolean value\n';
          break;
        default:
          range = semver.validRange(argsObject.version);
          if (!range) {
            range = '';
            errors += `Ignoring version: "${argsObject.version}" is not a SemVer range\n`;
          }

          instances = instances.filter(this.instances.filterVersion(range));
      }

      // Minimal number of statuses
      switch (argsObject.min_statuses) {
        case undefined:
          break;
        case true:
          errors += 'Ignoring min_statuses: cannot be a boolean value\n';
          break;
        default:
          minStatuses = Number.parseInt(argsObject.min_statuses);
          if (Number.isNaN(minStatuses)) {
            minStatuses = 0;
            errors += `Ignoring min_statuses: "${argsObject.min_statuses}" is not a valid number\n`;
          }

          instances = instances.filter(this.instances.filterMinimalStatuses(minStatuses));
      }

      // Maximal number of statuses
      switch (argsObject.max_statuses) {
        case undefined:
          break;
        case true:
          errors += 'Ignoring max_statuses: cannot be a boolean value\n';
          break;
        default:
          maxStatuses = Number.parseInt(argsObject.max_statuses);
          if (Number.isNaN(maxStatuses)) {
            maxStatuses = 0;
            errors += `Ignoring max_statuses: "${argsObject.max_statuses}" is not a valid number\n`;
          }

          instances = instances.filter(this.instances.filterMaximalStatuses(maxStatuses));
      }

      // Sort order
      switch (argsObject.sort_order) {
        case true:
        case 'desc':
          // Descendent order
          sortDesc = true;
          break;
        case undefined:
        case 'asc':
          // Ascendent order
          sortDesc = false;
          break;
        default:
          errors += `Using default value for sort_order: "${argsObject.sort_order}" is not a valid value\n`;
      }

      // Sort options
      switch (argsObject.sort = argsObject.sort_by || argsObject.sort) {
        case 'users':
          instances.sort(sortDesc ? this.utils.reverseOrder(this.instances.sortByInstanceUsers) : this.instances.sortByInstanceUsers);
          break;
        case 'statuses':
          instances.sort(sortDesc ? this.utils.reverseOrder(this.instances.sortByInstanceStatuses) : this.instances.sortByInstanceStatuses);
          break;
        case 'version':
          instances.sort(sortDesc ? this.utils.reverseOrder(this.instances.sortByVersion) : this.instances.sortByVersion);
          break;
        case true:
          errors += 'Using default value for sort: cannot be a boolean value\n';
        case undefined:
        case 'alpha':
        case 'alphabetically':
        case 'name':
          instances.sort(sortDesc ? this.utils.reverseOrder(this.instances.sortByInstanceName) : this.instances.sortByInstanceName);
          break;
        default:
          errors += `Using default value for sort: "${argsObject.sort}" is not a valid value\n`;
          instances.sort(sortDesc ? this.utils.reverseOrder(this.instances.sortByInstanceName) : this.instances.sortByInstanceName);
      }

      // Instance limit
      switch (argsObject.limit) {
        case undefined:
          break;
        case true:
          limit = (minUsers | maxUsers | maxStatuses | minStatuses) > 0 ? 5 : 10;
          break;
        default:
          limit = Number.parseInt(argsObject.limit);
          if (Number.isNaN(limit)) {
            limit = 0;
            errors += `Ignoring max_users: "${argsObject.limit}" is not a valid number\n`;
          }
      }

      // Final output
      let output = `Executed command: ${command}\n`;
      output += `Returned ${ instances.length.toLocaleString('en-US') } instances (${ (Math.floor(instances.length * 10000 / this.cache.instances.length) / 100).toLocaleString('en-US') }%)`;
      if (argsObject.sort == 'users') {
        output += ` with ${
instances.reduce((acc, i) => acc + (Number.parseInt(i.users) || 0), 0).toLocaleString('en-US')
} total registered users`;
      } else if (argsObject.sort == 'statuses') {
        output += ` with ${
instances.reduce((acc, i) => acc + (Number.parseInt(i.statuses) || 0), 0).toLocaleString('en-US')
} total posted statuses`;
      }
      output += `\n${errors}\n`;

      // Instance output
      let oldLimit = limit;
      for (let i of instances) {
        output += `- ${i.name}`;
        if (argsObject.sort == 'users') {
          output += ` (${ Number.parseInt(i.users).toLocaleString('en-US') } users)`;
        } else if (argsObject.sort == 'statuses') {
          output += ` (${ Number.parseInt(i.statuses).toLocaleString('en-US') } statuses)`;
        } else if (argsObject.sort == 'version') {
          output += ` (version ${ i.version })`;
        }
        output += '\n';

        if (--limit == 0) {
          // Instance limit has been reached
          // Never reached if limit == 0
          output += `- ...and ${ (instances.length - oldLimit).toLocaleString('en-US') } more\n`;
          break;
        }
      }
      return output;
    } else {
      throw `#instances excepts at least one filter. See #help instances for a list of those filters.
If you want to list all instances, use #instances min_users=0`;
    }
  }
}

module.exports = CommandHandler;
