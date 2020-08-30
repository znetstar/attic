export default interface Config {
    /**
     * URI to the MongoDB database used as a datastore
     */
    mongoUri?: string;

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
     * Enable the HTTP Web Resolver
     */
    enableWebResolver?: boolean;
    /**
     * Port the web resolver will listen on
     */
    webResolverPort?: number;
    /**
     * Host the web resolver will listen on
     */
    webResolverHost?: string;
    /**
     * Unix socket the web resolver will listen on. Overrides `webResolverHost` and `webResolverPort`
     */
    webResolverUnixSocket?: string;
    /**
     * If enabled, the web resolver will share the same HTTP server as the RPC function.
     */
    webResolverShareRpcServer?: boolean;

    /**
     * Size of each "short" url generated (in characters).
     */
    shortUrlSize?: number;
    /**
     * The number of resolvers MongoDB should query at once when attempting to match a location.
     */
    rootResolverBatchSize?: number;

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
}

