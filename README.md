# Mastodon statistics bot
*:warning: This project is in development. You can contribute by creating issues and pull requests*

## Features
* Basic instance information listing
* Open-source, under the very liberal [MIT license](LICENSE).
* Advanced filtering of Mastodon instances (see the `#instances` command reference).
* Command-line interface

**PLANNED:**
* Graphs about users on instances (generated server-side)

## How to use this bot
Send a mention to the [@mastostats](https://mastodon.xyz/@mastostats) bot with your command.
The bot will respond with a direct message within 60 seconds of your status. You can send multiple commands in one status
by separating them with a newline, for example:

```
@mastostats@mastodon.xyz #help
#about
```

If you send more than 5 commands within one minute, you will be automatically blocked by this account.
The block can last up to 3 hours.

### Following this bot
This bot can be followed by other people. Every 3 hours, this bot will send to each follower the
server information for the follower's particular instance.

### Public status
This bot also sends a public status every 12 hours about the global Mastodon statistics.

### Examples
#### To get help about the different supported commands:

```
@mastostats@mastodon.xyz #help

Mastodon statistics (aka the Mastostats) bot
These commands are supported:

#about - output about information
#desc - displays instance description
#help - output usage information
#info - output information about an instance
#instances - returns list of instances based on filters

Use #help [command] to output usage information for a specific command.
If #help is used without any argument, the help for the #help command
is displayed.
```

#### To get information about Mastostats:
```
@mastostats@mastodon.xyz #about

Mastostats 1.0.0, by Maxime Launois

Copyright (C) 2019 Maxime Launois, licensed under the MIT License.
```

#### To get instances with 1,000 or more users, with the servers running the latest versions coming first.
```
@mastostats@mastodon.xyz #instances min_users=1000 sort_by=version sort_order=desc

Executed command: #instances min_users=1000 sort_by=version sort_order=desc
Returned 142 instances (2.82%)

- sinblr.com (version 3.0.1+glitch)
- abdl.link (version 3.0.1+bottle)
- social.tchncs.de (version 3.0.1)
- hostux.social (version 3.0.1)
- octodon.social (version 3.0.1)
- anticapitalist.party (version 3.0.1)
- mstdn.io (version 3.0.1)
- niu.moe (version 3.0.1)
- freeradical.zone (version 3.0.1)
- queer.party (version 3.0.1)
- ...and 132 more
```

#### To get instances running Mastodon 2.9.x or earlier:
```
@mastostats@mastodon.xyz #instances version=^2.9.x sort_by=version sort_order=desc

Executed command: #instances version=^2.9.x sort_by=version sort_order=desc
Returned 384 instances (7.65%)

- ecosteader.com (version 2.9.4)
- inditoot.com (version 2.9.3+inditoot)
- mastodon.xyz (version 2.9.3)
- oc.todon.fr (version 2.9.3)
- social.atypique.net (version 2.9.3)
- mastodon.cc (version 2.9.3)
- social.targaryen.house (version 2.9.3)
- mastodon.at (version 2.9.3)
- slime.global (version 2.9.3)
- social.troll.academy (version 2.9.3)
- ...and 374 more
```

#### To get popular instances which have not upgraded to Mastodon 3.0.x:
```
@mastostats@mastodon.xyz #instances version=<3.0.x min_users=10000 sort_by=users sort_order=desc

Executed command: #instances version=<3.0.x min_users=10000 sort_by=users sort_order=desc
Returned 7 instances (0.13%) with 1,026,390 total registered users

- pawoo.net (579,225 users)
- mstdn.jp (194,295 users)
- humblr.social (139,902 users)
- mastodon.cloud (55,663 users)
- mastodon.xyz (23,681 users)
- mastodon.technology (19,134 users)
- mamot.fr (14,490 users)
```

## Available commands
A command starts with a hash (`#`) sign.
* `#about` displays information about the Mastostats software
* `#desc` displays description of a particular instance
* `#help` displays help about a Mastostats command
* `#info` displays information about a particular instance
* `#instances` returns a list of instances depending on specified filters

## Get help
If you need any help in using the bot, send a DM to my [@mlaunois](https://fosstodon.org/@mlaunois) account on Fosstodon.
