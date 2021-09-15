"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceTesting = void 0;
const mongodb_1 = require("mongodb");
class MarketplaceTesting {
    constructor(applicationContext, marketplaceMongoUri = process.env.MARKETPLACE_MONGO_URI) {
        this.applicationContext = applicationContext;
        this.marketplaceMongoUri = marketplaceMongoUri;
    }
    async init() {
        const { applicationContext: ctx } = this;
        await ctx.triggerHook('MarketplaceTesting.marketplaceMongo.start');
        const dbName = require('url').parse(this.marketplaceMongoUri).pathname.split('?').shift();
        const mongo = ctx.marketplaceMongo = await mongodb_1.MongoClient.connect(this.marketplaceMongoUri);
        await ctx.triggerHook('MarketplaceTesting.marketplaceMongo.complete', mongo);
        await ctx.triggerHook('MarketplaceTesting.marketplaceDb.start');
        const db = ctx.marketplaceDb = mongo.db(dbName);
        await ctx.triggerHook('MarketplaceTesting.marketplaceDb.complete', db);
        const rpcMethods = ctx.rpcServer.methods;
        rpcMethods.marketplaceDbFind = async function (collection, query) {
            return db.collection(collection).find(query).toArray();
        };
        rpcMethods.marketplaceDbClear = async function () {
            const cols = await db.listCollections().toArray();
            for (let col of cols) {
                await db.dropCollection(col.name);
            }
        };
    }
    get name() {
        return '@thirdact/marketplace-testing';
    }
}
exports.MarketplaceTesting = MarketplaceTesting;
exports.default = MarketplaceTesting;
//# sourceMappingURL=Atticfile.js.map