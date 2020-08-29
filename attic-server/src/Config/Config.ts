export default interface Config {
    mongoUri?: string;
    port?: number;
    shortUrlSize?: number;
    rootResolverBatchSize?: number;
    drivers: string[];
    resolverTypes: string[];
    entityTypes: string[];
}

