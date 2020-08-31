import Config from './Config';
import * as fs from 'fs-extra';
import * as path from 'path';

export default <Config>{
    plugins: [],

    mongoUri: 'mongodb://localhost:27017/attic',
    port: 7373,
    host: '127.0.0.1',

    enableCache: true,
    cacheSize: 2e7,
    cacheExpireIn: ( 24 * 60 * 60 * 1000 ),

    enableWebResolver: true,
    webResolverPort: 3737,
    webResolverHost: '127.0.0.1',
    webResolverShareRpcServer: false,
    webResolverAuthenticateRequests: true,
    webResolverPromptLogin: true,

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
    ],
    userTypes: [
        'BasicUser'
    ]
};