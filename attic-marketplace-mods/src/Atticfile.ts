import {GenericError} from '@znetstar/attic-common/lib/Error/GenericError'
import {IApplicationContext as IApplicationContextBase, IConfig, IPlugin} from "@znetstar/attic-common/lib/Server";
import { default as IRPCBase } from '@znetstar/attic-common/lib/IRPC';
import {Db, MongoClient} from "mongodb";
const {
  emperors
} = require('@dailynodemodule/emperor-data/src/index');
import * as _ from 'lodash';
import {CouldNotLocateUserError} from "@znetstar/attic-common/lib/Error";

export type IApplicationContext = IApplicationContextBase&{
  marketplaceMongo:MongoClient,
  marketplaceDb: Db
}


export type IRPC = IRPCBase&{
  marketplaceDbFind(collection: string, query: unknown): Promise<unknown[]>;
  marketplaceDbClear(): Promise<void>;
  marketplaceRandomProfile(): Promise<{
    name: string,
    image: string
  }>;
};

class MarketplaceCouldNotLocateUserError extends CouldNotLocateUserError {
  constructor() {
    super(`Invalid email or password, please try again`);
  }
}

export class MarketplaceTesting implements IPlugin {
    constructor(
      public applicationContext: IApplicationContext,
      public marketplaceMongoUri = (process.env.ATTIC_MARKETPLACE_MONGO_URI || process.env.MARKETPLACE_MONGO_URI || process.env.MONGO_URI) as string
    ) {
    }
    public async init(): Promise<void> {
      const { applicationContext: ctx } = this;

      await ctx.triggerHook('MarketplaceTesting.marketplaceMongo.start');
      const dbName = (require('url').parse(this.marketplaceMongoUri).pathname.split('?').shift() as string).substr(1);
      const mongo = ctx.marketplaceMongo = await MongoClient.connect(this.marketplaceMongoUri);

      await ctx.triggerHook('MarketplaceTesting.marketplaceMongo.complete', mongo);
      await ctx.triggerHook('MarketplaceTesting.marketplaceDb.start');
      const db = ctx.marketplaceDb = mongo.db(dbName);
      await ctx.triggerHook('MarketplaceTesting.marketplaceDb.complete', db);

      ctx.errors.setError(
        MarketplaceCouldNotLocateUserError,
        {
          name: 'CouldNotLocateUserError'
        }
      );

      const rpcMethods: IRPC = ctx.rpcServer.methods as IRPC;
      rpcMethods.marketplaceRandomProfile = async function() {
        const emp = await _.sample(emperors);

        return {
          name:emp.name,
          image: Buffer.from(emp.blobs?.mainImage?.blob).toString('base64')
        };
      }
      rpcMethods.marketplaceDbFind = async function(collection: string, query: any): Promise<unknown[]> {
        return db.collection(collection).find(query).toArray();
      }

      rpcMethods.marketplaceDbClear = async function () {
        const cols = await db.listCollections().toArray();
        for (let col of cols) {
          await db.dropCollection(col.name);
        }
      }
    }

    public get name(): string {
        return '@thirdact/attic-marketplace-mods';
    }
}

export default MarketplaceTesting;
