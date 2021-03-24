/**
 * This component is licensed separately from the main program
 * @module attic-server/ApplicationContext
 * @license LGPL-3.0
 * Copyright (C) 2021 Zachary R.T. Boyd <zachary@zacharyboyd.nyc>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 *  You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import Config from './Config';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export default <Config>{
    plugins: [],
    siteUri: 'http://localhost:7373',
    mongoUri: 'mongodb://localhost:27017/attic',
    redisUri: 'redis://localhost:6379/0',
    port: 7373,
    host: '127.0.0.1',
    hostname: os.hostname(),
    authorizeGracePeriod: 5*60e3,
    unauthorizedUserName: 'guest',
    enableCache: true,
    cacheSize: 2e7,
    cacheExpireIn: ( 24 * 60 * 60 * 1000 ),

    unauthorizedScopes: [ 'auth\.authorize', 'auth\.token', 'rpc\.getAccessToken' ],

    enableWebResolver: true,

    expireTokenIn: ( 1 * 60 * 60 * 1000 ),
    expireRefreshTokenIn: (365 * 24 * 60 * 60 * 1000 ),
    serviceClientId: 'attic',
    serviceClientSecret: 'attic',
    shortUrlSize: 4,
    rootResolverBatchSize: 50,

    saltRounds: 10,

    expressSessionMaxAge: ( 24 * 60 * 60 * 1000 ),
    expressSessionSecret: null as any,
    expressSessionSecretSize: 512,

    drivers: [
        'HTTPRedirectDriver'
    ],
    resolverTypes: [
        'RootResolver'
    ],
    entityTypes: [
        'HTTPResourceEntity',
        'IdentityEntity'
    ]
};