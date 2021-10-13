
export enum LogLevels {
    silly = 'silly',
    debug = 'debug',
    verbose = 'verbose',
    info = 'info',
    warn = 'warn',
    error = 'error'
}

export enum ExpressSessionDrivers {
  mongo = 'mongo',
  redis = 'redis'
}

export type PluginPath = [ string, string ]|string;

export interface DBInitRecordBase<T>  {
  document: T,
  replace?: boolean;
  query?: unknown;
}

export type DBInitRecordMongo<T,> = DBInitRecordBase<T>&{
  collection: string;
};

export type DBInitRecordMongoose<T> = DBInitRecordBase<T>&{
  model: string;
};

export type DBInitRecord<T> = DBInitRecordMongo<T>|DBInitRecordMongoose<T>;

export interface IConfig {
    /**
     * Externally facing hostname
     */
    siteUri?: string;
    hostname?: string;
    emailHostname?: string;
    /**
     * A list of plugins to load, as paths
     */
    plugins?: PluginPath[];

    /**
     * URI to the MongoDB database used as a datastore
     */
    mongoUri?: string;
    npmOptions?: any,
    redisUri?: string;
    authorizeGracePeriod?: number;
    expireTokenIn?: number;
    defaultScopeJoin?: string;
    expireRefreshTokenIn?: number;
    updateIdentityUponTokenRefresh?: boolean;

    serviceClientId?: string;
    serviceClientSecret?: string;
    serviceClientName?: string;
    serviceRedirectUri?: string;
    unauthorizedUserName?: string;
    unauthorizedGroups?: string[];
    rootUsername?: string;
    rootPassword?: string;
    promptUnauthenticatedToLogin?: boolean;
    rootGroups?: string[];

    cors?: unknown;

    /**
     * Port the RPC server will listen on
     */
    port?: number;
    /**
     * Host the RPC will listen on
     */
    host?: string;
    /**
     * Unix Socket the RPC will listen on. Overrides `port` and `host`
     */
    unixSocket?: string;

    /**
     * Cache the result of `Resolver.resolve` in a capped collection
     */
    enableCache?: boolean;
    /**
     * Size of the resolve cache (in bytes)
     */
    cacheSize?: number;
    /**
     * Max documents in the resolve cache
     */
    cacheMax?: number;
    /**
     * Amount of time to wait before invalidating the entry
     */
    cacheExpireIn?: number;
    /**
     * Default scopes for unauthorized users
     */
    unauthorizedScopes?: string[];
    /**
     * Enable the HTTP Web Resolver
     */
    enableWebResolver?: boolean;

    /**
     * Size of each "short" url generated (in characters).
     */
    shortUrlSize?: number;
    /**
     * The number of resolvers MongoDB should query at once when attempting to match a location.
     */
    rootResolverBatchSize?: number;

    /**
     * Passed to bcrypt
     */
    saltRounds: number;

    /**
     * Max age for the express session
     */
    expressSessionMaxAge?: number;
    /**
     * Secret for the express session. If left unset, will generate at runtime
     */
    expressSessionSecret?: string;
    /**
     * Defult key size for the express session string
     */
    expressSessionSecretSize?: number;
    expressSessionDriver?: ExpressSessionDrivers;

    /**
     * List of drivers available
     */
    drivers: string[];
    /**
     * List of resolvers available
     */
    resolverTypes: string[];
    /**
     * List of entities available
     */
    entityTypes: string[];
    debugLogs?: boolean;

    logLevel?: LogLevels;
    autoLogEvents?: boolean;
    logErrors?: boolean;
    logListening?: boolean;
    cacheNon200HTTPResponses?: boolean;
    allowClientOverride?: boolean;
    allowRootUserOverride?: boolean;
    allowUnauthorizedUserOverride?: boolean;

    dbInit?: DBInitRecord<any>[];
    allowGetTokenWithNoRedirectUri?: string[];

  /**
   * URL to IPFS API server. Leave `undefined` to disable IPFS
   */
  ipfsUri?: string;
  ipfsOptions?: { [name: string]: unknown; }
}

export default IConfig;
