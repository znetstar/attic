attic-cli
=========



[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/attic-cli.svg)](https://npmjs.org/package/attic-cli)
[![Downloads/week](https://img.shields.io/npm/dw/attic-cli.svg)](https://npmjs.org/package/attic-cli)
[![License](https://img.shields.io/npm/l/attic-cli.svg)](https://github.com/znetstar/attic/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g attic-cli
$ attic-cli COMMAND
running command...
$ attic-cli (-v|--version|version)
attic-cli/0.0.0 darwin-x64 node-v12.12.0
$ attic-cli --help [COMMAND]
USAGE
  $ attic-cli COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`attic-cli hello [FILE]`](#attic-cli-hello-file)
* [`attic-cli help [COMMAND]`](#attic-cli-help-command)
* [`attic-cli location [FILE]`](#attic-cli-location-file)

## `attic-cli hello [FILE]`

describe the command here

```
USAGE
  $ attic-cli hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ attic-cli hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/znetstar/attic/blob/v0.0.0/src/commands/hello.ts)_

## `attic-cli help [COMMAND]`

display help for attic-cli

```
USAGE
  $ attic-cli help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.0/src/commands/help.ts)_

## `attic-cli location [FILE]`

describe the command here

```
USAGE
  $ attic-cli location [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print
```

_See code: [src/commands/location.ts](https://github.com/znetstar/attic/blob/v0.0.0/src/commands/location.ts)_
<!-- commandsstop -->
