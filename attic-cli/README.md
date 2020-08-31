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
$ npm install -g @znetstar/attic-cli
$ attic-cli COMMAND
running command...
$ attic-cli (-v|--version|version)
@znetstar/attic-cli/1.0.2 darwin-x64 node-v12.12.0
$ attic-cli --help [COMMAND]
USAGE
  $ attic-cli COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`attic-cli drivers:listTypes`](#attic-cli-driverslisttypes)
* [`attic-cli entities:create [FIELDS]`](#attic-cli-entitiescreate-fields)
* [`attic-cli entities:delete [QUERY]`](#attic-cli-entitiesdelete-query)
* [`attic-cli entities:find [QUERY]`](#attic-cli-entitiesfind-query)
* [`attic-cli entities:listTypes`](#attic-cli-entitieslisttypes)
* [`attic-cli entities:search [TERMS]`](#attic-cli-entitiessearch-terms)
* [`attic-cli entities:update`](#attic-cli-entitiesupdate)
* [`attic-cli help [COMMAND]`](#attic-cli-help-command)
* [`attic-cli locations:create [FIELDS]`](#attic-cli-locationscreate-fields)
* [`attic-cli locations:delete [QUERY]`](#attic-cli-locationsdelete-query)
* [`attic-cli locations:find [QUERY]`](#attic-cli-locationsfind-query)
* [`attic-cli locations:search [TERMS]`](#attic-cli-locationssearch-terms)
* [`attic-cli locations:update`](#attic-cli-locationsupdate)
* [`attic-cli resolve:entity [ENTITY]`](#attic-cli-resolveentity-entity)
* [`attic-cli resolve:location [LOCATION]`](#attic-cli-resolvelocation-location)
* [`attic-cli resolvers:create [FIELDS]`](#attic-cli-resolverscreate-fields)
* [`attic-cli resolvers:delete [QUERY]`](#attic-cli-resolversdelete-query)
* [`attic-cli resolvers:find [QUERY]`](#attic-cli-resolversfind-query)
* [`attic-cli resolvers:listTypes`](#attic-cli-resolverslisttypes)
* [`attic-cli resolvers:search [TERMS]`](#attic-cli-resolverssearch-terms)
* [`attic-cli resolvers:update`](#attic-cli-resolversupdate)
* [`attic-cli shortUrl`](#attic-cli-shorturl)
* [`attic-cli users:create [FIELDS]`](#attic-cli-userscreate-fields)
* [`attic-cli users:delete [QUERY]`](#attic-cli-usersdelete-query)
* [`attic-cli users:find [QUERY]`](#attic-cli-usersfind-query)
* [`attic-cli users:listTypes`](#attic-cli-userslisttypes)
* [`attic-cli users:search [TERMS]`](#attic-cli-userssearch-terms)
* [`attic-cli users:update`](#attic-cli-usersupdate)

## `attic-cli drivers:listTypes`

lists all available driver types

```
USAGE
  $ attic-cli drivers:listTypes

OPTIONS
  -h, --help            show CLI help
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/drivers/listTypes.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/drivers/listTypes.ts)_

## `attic-cli entities:create [FIELDS]`

creates a entity returning a entity id

```
USAGE
  $ attic-cli entities:create [FIELDS]

OPTIONS
  -h, --help            show CLI help
  -s, --source=source   (required)
  -t, --type=type
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/entities/create.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/entities/create.ts)_

## `attic-cli entities:delete [QUERY]`

deletes an entity

```
USAGE
  $ attic-cli entities:delete [QUERY]

OPTIONS
  -h, --help            show CLI help
  -i, --id=id
  -s, --source=source   (required)
  -t, --type=type
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/entities/delete.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/entities/delete.ts)_

## `attic-cli entities:find [QUERY]`

finds an entity via MongoDB query

```
USAGE
  $ attic-cli entities:find [QUERY]

OPTIONS
  -h, --help            show CLI help
  -i, --id=id
  -s, --source=source   (required)
  -t, --type=type
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/entities/find.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/entities/find.ts)_

## `attic-cli entities:listTypes`

lists all entity types

```
USAGE
  $ attic-cli entities:listTypes

OPTIONS
  -h, --help            show CLI help
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/entities/listTypes.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/entities/listTypes.ts)_

## `attic-cli entities:search [TERMS]`

searches an entity via MongoDB text query

```
USAGE
  $ attic-cli entities:search [TERMS]

OPTIONS
  -c, --count
  -h, --help            show CLI help
  -l, --limit=limit
  -s, --skip=skip
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/entities/search.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/entities/search.ts)_

## `attic-cli entities:update`

updates an existing entity

```
USAGE
  $ attic-cli entities:update

OPTIONS
  -h, --help            show CLI help
  -i, --id=id           (required)
  -s, --source=source   (required)
  -t, --type=type
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/entities/update.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/entities/update.ts)_

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

## `attic-cli locations:create [FIELDS]`

creates a location, returning the url and id

```
USAGE
  $ attic-cli locations:create [FIELDS]

OPTIONS
  -d, --driver=driver
  -e, --entity=entity
  -h, --help                 show CLI help
  -r, --href=href            (required)
  -s, --short
  -u, --auth=auth
  -v, --verbose
  -x, --expiresIn=expiresIn
  --format=(text|json)       [default: text]
```

_See code: [src/commands/locations/create.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/locations/create.ts)_

## `attic-cli locations:delete [QUERY]`

deletes a location

```
USAGE
  $ attic-cli locations:delete [QUERY]

OPTIONS
  -d, --driver=driver
  -e, --entity=entity
  -h, --help            show CLI help
  -i, --id=id
  -l, --limit=limit
  -o, --sort=sort
  -r, --href=href
  -s, --skip=skip
  -u, --auth=auth
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/locations/delete.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/locations/delete.ts)_

## `attic-cli locations:find [QUERY]`

finds a location via MongoDB query

```
USAGE
  $ attic-cli locations:find [QUERY]

OPTIONS
  -d, --driver=driver
  -e, --entity=entity
  -h, --help            show CLI help
  -i, --id=id
  -l, --limit=limit
  -o, --sort=sort
  -r, --href=href
  -s, --skip=skip
  -u, --auth=auth
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/locations/find.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/locations/find.ts)_

## `attic-cli locations:search [TERMS]`

searches for an entity via MongoDB text search

```
USAGE
  $ attic-cli locations:search [TERMS]

OPTIONS
  -c, --count
  -h, --help            show CLI help
  -l, --limit=limit
  -s, --skip=skip
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/locations/search.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/locations/search.ts)_

## `attic-cli locations:update`

updates an existing location, returning the url and id

```
USAGE
  $ attic-cli locations:update

OPTIONS
  -d, --driver=driver
  -e, --entity=entity
  -h, --help                 show CLI help
  -i, --id=id                (required)
  -r, --href=href
  -s, --short
  -u, --auth=auth
  -v, --verbose
  -x, --expiresIn=expiresIn
  --format=(text|json)       [default: text]
```

_See code: [src/commands/locations/update.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/locations/update.ts)_

## `attic-cli resolve:entity [ENTITY]`

resolves a location to an entity

```
USAGE
  $ attic-cli resolve:entity [ENTITY]

OPTIONS
  -C, --noCache
  -h, --help            show CLI help
  -i, --id=id
  -r, --href=href
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/resolve/entity.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/resolve/entity.ts)_

## `attic-cli resolve:location [LOCATION]`

resolves a location to a location

```
USAGE
  $ attic-cli resolve:location [LOCATION]

OPTIONS
  -C, --noCache
  -h, --help            show CLI help
  -i, --id=id
  -r, --href=href
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/resolve/location.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/resolve/location.ts)_

## `attic-cli resolvers:create [FIELDS]`

creates a resolver returning a resolver id

```
USAGE
  $ attic-cli resolvers:create [FIELDS]

OPTIONS
  -h, --help                   show CLI help
  -m, --mountPoint=mountPoint  (required)
  -p, --priority=priority
  -t, --type=type              (required)
  -v, --verbose
  --format=(text|json)         [default: text]
```

_See code: [src/commands/resolvers/create.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/resolvers/create.ts)_

## `attic-cli resolvers:delete [QUERY]`

deletes a resolver

```
USAGE
  $ attic-cli resolvers:delete [QUERY]

OPTIONS
  -e, --type=type
  -h, --help                   show CLI help
  -i, --id=id                  (required)
  -l, --limit=limit
  -m, --mountPoint=mountPoint
  -o, --sort=sort
  -s, --skip=skip
  -u, --priority=priority
  -v, --verbose
  --format=(text|json)         [default: text]
```

_See code: [src/commands/resolvers/delete.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/resolvers/delete.ts)_

## `attic-cli resolvers:find [QUERY]`

finds an entity via MongoDB query

```
USAGE
  $ attic-cli resolvers:find [QUERY]

OPTIONS
  -h, --help                   show CLI help
  -i, --id=id
  -l, --limit=limit
  -m, --mountPoint=mountPoint
  -o, --sort=sort
  -p, --priority=priority
  -s, --skip=skip
  -t, --type=type
  -v, --verbose
  --format=(text|json)         [default: text]
```

_See code: [src/commands/resolvers/find.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/resolvers/find.ts)_

## `attic-cli resolvers:listTypes`

lists all resolver types

```
USAGE
  $ attic-cli resolvers:listTypes

OPTIONS
  -h, --help            show CLI help
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/resolvers/listTypes.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/resolvers/listTypes.ts)_

## `attic-cli resolvers:search [TERMS]`

searches for a resolver via MongoDB text search

```
USAGE
  $ attic-cli resolvers:search [TERMS]

OPTIONS
  -c, --count
  -h, --help            show CLI help
  -l, --limit=limit
  -s, --skip=skip
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/resolvers/search.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/resolvers/search.ts)_

## `attic-cli resolvers:update`

updates an existing resolver

```
USAGE
  $ attic-cli resolvers:update

OPTIONS
  -e, --type=type
  -h, --help                   show CLI help
  -i, --id=id                  (required)
  -m, --mountPoint=mountPoint
  -u, --priority=priority
  -v, --verbose
  --format=(text|json)         [default: text]
```

_See code: [src/commands/resolvers/update.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/resolvers/update.ts)_

## `attic-cli shortUrl`

shortens an existing URI, returning the new short url

```
USAGE
  $ attic-cli shortUrl

OPTIONS
  -h, --help            show CLI help
  -r, --href=href       (required)
  -s, --source=source   (required)
  -u, --auth=auth
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [@znetstar/attic-cli-url-shortener](https://github.com/znetstar/attic/blob/v1.0.1/src/commands/shortUrl.ts)_

## `attic-cli users:create [FIELDS]`

creates a user returning a user id

```
USAGE
  $ attic-cli users:create [FIELDS]

OPTIONS
  -d, --disabled
  -h, --help                 show CLI help
  -t, --type=type            (required)
  -u, --username=username
  -v, --verbose
  -x, --expiresIn=expiresIn
  --format=(text|json)       [default: text]
```

_See code: [src/commands/users/create.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/users/create.ts)_

## `attic-cli users:delete [QUERY]`

deletes a user

```
USAGE
  $ attic-cli users:delete [QUERY]

OPTIONS
  -d, --disabled
  -h, --help            show CLI help
  -i, --id=id
  -l, --limit=limit
  -o, --sort=sort
  -s, --skip=skip
  -t, --type=type
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/users/delete.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/users/delete.ts)_

## `attic-cli users:find [QUERY]`

finds a user via MongoDB query

```
USAGE
  $ attic-cli users:find [QUERY]

OPTIONS
  -d, --disabled
  -h, --help            show CLI help
  -i, --id=id
  -l, --limit=limit
  -o, --sort=sort
  -s, --skip=skip
  -t, --type=type
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/users/find.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/users/find.ts)_

## `attic-cli users:listTypes`

lists all resolver types

```
USAGE
  $ attic-cli users:listTypes

OPTIONS
  -h, --help            show CLI help
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/users/listTypes.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/users/listTypes.ts)_

## `attic-cli users:search [TERMS]`

searches for users via MongoDB text search

```
USAGE
  $ attic-cli users:search [TERMS]

OPTIONS
  -c, --count
  -h, --help            show CLI help
  -l, --limit=limit
  -s, --skip=skip
  -v, --verbose
  --format=(text|json)  [default: text]
```

_See code: [src/commands/users/search.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/users/search.ts)_

## `attic-cli users:update`

updates an existing location

```
USAGE
  $ attic-cli users:update

OPTIONS
  -d, --disabled
  -h, --help                 show CLI help
  -i, --id=id                (required)
  -t, --type=type            (required)
  -u, --username=username
  -v, --verbose
  -x, --expiresIn=expiresIn
  --format=(text|json)       [default: text]
```

_See code: [src/commands/users/update.ts](https://github.com/znetstar/attic/blob/v1.0.2/src/commands/users/update.ts)_
<!-- commandsstop -->
