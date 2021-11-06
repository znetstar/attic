import {IApplicationContext as IApplicationContextBase, IConfig, IPlugin} from "@znetstar/attic-common/lib/Server";
import { default as IRPCBase } from '@znetstar/attic-common/lib/IRPC';
import {Db, MongoClient, ObjectId} from "mongodb";
const {
  emperors
} = require('@dailynodemodule/emperor-data/src/index');
const {
  AccountId,
  PrivateKey
} = require('@hashgraph/sdk');
import * as _ from 'lodash';
import {CouldNotLocateUserError} from "@znetstar/attic-common/lib/Error";
import {BinaryEncoding, BinaryInputOutput} from "@etomon/encode-tools/lib/IEncodeTools";
import {EncodeToolsAuto} from "@etomon/encode-tools";

export type IApplicationContext = IApplicationContextBase&{
  marketplaceMongo:MongoClient,
  marketplaceDb: Db
}

export type IMarketplaceCryptoKeyPair = {
  publicKey?: BinaryInputOutput,
  privateKey: BinaryInputOutput,
  _id: string;
  encrypted?: boolean;
}

export interface IMarketplaceCryptoAccount {
  _id: string;
  name: string;
  keyPair: IMarketplaceCryptoKeyPair;
  accountId: BinaryInputOutput;
  networkName: string;
  createdAt: Date;
  updatedAt: Date;
}


export type IRPC = IRPCBase&{
  marketplaceDbFind(collection: string, query: unknown): Promise<unknown[]>;
  marketplaceDbClear(): Promise<void>;
  marketplaceRandomProfile(): Promise<{
    name: string,
    image: string
  }>;
  marketplaceCryptoGetCryptoAccount(q: any, hederaFormat?: boolean, pipeline?: any[]): Promise<IMarketplaceCryptoAccount[]>;
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


      ctx.registerHook('launch.loadWebServer.complete', () => {
        (ctx.webExpress as any).get('/version', (req: any, res: any) => {
          res.send({
            name: (ctx.package as any).name,
            version: (ctx.package as any).version
          });
        });

        (ctx.webExpress as any).get('/', (req: any, res: any) => {
          res.redirect((ctx as any).config.homeRedirect || process.env.HOME_REDIRECT, 301);
        });
      });

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

      rpcMethods.marketplaceCryptoGetCryptoAccount = async function (q: any = {}, hederaFormat?: boolean, pipeline?: any[]): Promise<IMarketplaceCryptoAccount[]> {
        if (q._id) q._id = new ObjectId(q._id);

        const accounts = (await db.collection('cryptoaccounts')
          .aggregate([
            {
              $match: q as any
            },
            {
              $lookup: {
                from: 'keypairs',
                let: {
                  id: '$keyPair'
                },
                as: 'keyPair',
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          '$_id',
                          '$$id'
                        ]
                      }
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                keyPair: {
                  $arrayElemAt: [ '$keyPair', 0 ]
                }
              }
            },
            ...(pipeline || []),
          ]).toArray())
          .map((account: any) => {
            if (account && hederaFormat) {
              account.accountId = AccountId.fromBytes(Buffer.from(account.accountId.buffer)).toString();
              if (account.keyPair) {
                const pk = PrivateKey.fromBytes(Buffer.from(account.keyPair.privateKey.buffer));
                account.keyPair.privateKey = pk.toString();
                account.keyPair.publicKey = pk.publicKey.toString();
              }
            }

            return account;
          })

        return accounts;
      }
    }

    public get name(): string {
        return '@thirdact/attic-marketplace-mods';
    }
}

export default MarketplaceTesting;
