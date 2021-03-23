attic-cli-url-shortner
======================

URL Shortening plugin for attic-cli

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/attic-cli-url-shortner.svg)](https://npmjs.org/package/attic-cli-url-shortner)
[![Downloads/week](https://img.shields.io/npm/dw/attic-cli-url-shortner.svg)](https://npmjs.org/package/attic-cli-url-shortner)
[![License](https://img.shields.io/npm/l/attic-cli-url-shortner.svg)](https://github.com/znetstar/attic-cli-url-shortner/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @znetstar/attic-cli-url-shortener
$ oclif-example COMMAND
running command...
$ oclif-example (-v|--version|version)
@znetstar/attic-cli-url-shortener/2.0.0 darwin-x64 node-v12.21.0
$ oclif-example --help [COMMAND]
USAGE
  $ oclif-example COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`oclif-example shortUrl`](#oclif-example-shorturl)

## `oclif-example shortUrl`

shortens an existing URI, returning the new short url

```
USAGE
  $ oclif-example shortUrl

OPTIONS
  -G, --dontGenerate
  -h, --help                 show CLI help
  -n, --length=length
  -r, --href=href            (required)
  -s, --source=source        (required)
  -u, --auth=auth
  -v, --verbose
  -x, --expiresIn=expiresIn
  --format=(text|json)       [default: text]
```

_See code: [src/commands/shortUrl.ts](https://github.com/znetstar/attic/blob/v2.0.0/src/commands/shortUrl.ts)_
<!-- commandsstop -->
