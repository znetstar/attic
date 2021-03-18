import Config from './Config';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export default <Config>{
    plugins: [],
    siteUri: 'http://127.0.0.1:7373',
    mongoUri: 'mongodb://localhost:27017/attic',
    redisUri: 'redis://127.0.0.1:6379/0',
    port: 7373,
    host: '127.0.0.1',
    hostname: os.hostname(),
    authorizeGracePeriod: 5*60e3,
    enableCache: true,
    cacheSize: 2e7,
    cacheExpireIn: ( 24 * 60 * 60 * 1000 ),

    unauthorizedScopes: [ 'rpc', 'auth\.(.*)\.authorize', 'auth\.token' ],

    enableWebResolver: true,

    expireTokenIn: ( 1 * 60 * 60 * 1000 ),
    expireRefreshTokenIn: (365 * 24 * 60 * 60 * 1000 ),


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
        'HTTPResourceEntity'
    ]
};