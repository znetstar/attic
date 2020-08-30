import Config from './Config';
import * as fs from 'fs-extra';
import * as path from 'path';

export default <Config>{
    mongoUri: 'mongodb://localhost:27017/attic',
    port: 7373,
    host: '127.0.0.1',

    enableCache: false,
    cacheSize: 2e7,
    cacheExpireIn: ( 24 * 60 * 60 * 1000 ),

    enableWebResolver: true,
    webResolverPort: 3737,
    webResolverHost: '127.0.0.1',

    webResolverShareRpcServer: false,

    shortUrlSize: 4,
    rootResolverBatchSize: 50,

    drivers: [
        'HTTPRedirectDriver'
    ],
    resolverTypes: [
        'Resolver',
        'RootResolver'
    ],
    entityTypes: [
        'HTTPResourceEntity'
    ]
};