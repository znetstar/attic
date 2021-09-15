import { IApplicationContext as IApplicationContextBase, IPlugin } from "@znetstar/attic-common/lib/Server";
import { default as IRPCBase } from '@znetstar/attic-common/lib/IRPC';
import { Db, MongoClient } from "mongodb";
export declare type IApplicationContext = IApplicationContextBase & {
    marketplaceMongo: MongoClient;
    marketplaceDb: Db;
};
export declare type IRPC = IRPCBase & {
    marketplaceDbFind(collection: string, query: unknown): Promise<unknown[]>;
    marketplaceDbClear(): Promise<void>;
};
export declare class MarketplaceTesting implements IPlugin {
    applicationContext: IApplicationContext;
    marketplaceMongoUri: string;
    constructor(applicationContext: IApplicationContext, marketplaceMongoUri?: string);
    init(): Promise<void>;
    get name(): string;
}
export default MarketplaceTesting;
