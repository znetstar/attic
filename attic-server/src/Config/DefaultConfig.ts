import Config from './Config';
import * as fs from 'fs-extra';
import * as path from 'path';

export default <Config>{
    mongoUri: 'mongodb://localhost:27017/attic',
    port: 7777,
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