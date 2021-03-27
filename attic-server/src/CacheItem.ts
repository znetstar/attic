import Location, {ILocation, LocationSchema} from './Location';
import { Mongoose, Schema, Document } from 'mongoose';
import mongoose, {redis} from './Database';
import { ObjectId } from 'mongodb';
import Config from "./Config";
import ICacheItemBase  from "@znetstar/attic-common/lib/ICacheItem";
import config from "./Config";
import {moveAndConvertValue, parseUUIDQueryMiddleware} from "./misc";
import {EntitySchema, IEntity} from "./Entity";
import * as _ from 'lodash';
import ApplicationContext from "./ApplicationContext";
const { xxhash64 } = require('hash-wasm');

export interface ICacheItemModel {
    id: ObjectId;
    _id: ObjectId;
    source: ILocation;
    target: ILocation;
    expiresAt: Date;
    disabled?: boolean;
}

export type ICacheItem = ICacheItemBase&ICacheItemModel;

export const CacheItemSchema = <Schema<ICacheItem>>(new (require('mongoose').Schema)({
    source: {
        type: LocationSchema,
        required: true
    },
    target: {
        type: LocationSchema,
        required: true
    },
    disabled: {
        type: Boolean,
        required: true,
        default: false
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date((new Date()).getTime() + Config.cacheExpireIn)
    }
}, {
    collection: 'cache',
    capped: {
        max: Config.cacheMax,
        size: Config.cacheSize
    }
}));

CacheItemSchema.index({
    disabled: 1,
    expiresAt: -1,
    'source.href': 1
});


CacheItemSchema.index({
    _id: -1,
    'source.href': 1
});

CacheItemSchema.pre(([ 'find', 'findOne' ] as  any),  function () {
    let self = this as any;

    moveAndConvertValue(self, '_conditions.source', '_conditions.source.href');
    moveAndConvertValue(self, '_conditions.target', '_conditions.target.href');


});

async function getCacheKey(source: ILocation) {
    let cacheKey = await xxhash64(JSON.stringify(source));
    cacheKey = `resolverCache.${cacheKey}`;
    return cacheKey;
}

export async function resolveFromCache(source: ILocation): Promise<ILocation&Document> {
    if (!config.enableCache)
        return null;
    ApplicationContext.logs.silly({
        method: 'CacheItem.resolveFromCache.start',
        params: [
            source
        ]
    });
    let location: ILocation&Document;
    let cacheKey = await getCacheKey(source);

    let locTmp = await redis.get(cacheKey);
    if (locTmp) {
        let locTempParse = JSON.parse(locTmp);
        locTempParse.entity = locTempParse.entity._id;
            location = Location.hydrate(locTempParse);
    }

    if (location)
        await location.populate('entity entity.source').execPopulate();

    ApplicationContext.logs.silly({
        method: 'CacheItem.resolveFromCache.complete',
        params: [
            location
        ]
    });
    return location;
}

export async function invalidateCacheItem(source: ILocation): Promise<void> {
    ApplicationContext.logs.silly({
        method: 'CacheItem.invalidateCacheItem.start',
        params: [
            source
        ]
    });
    await redis.del(await getCacheKey(source));
    ApplicationContext.logs.silly({
        method: 'CacheItem.invalidateCacheItem.complete',
        params: [
            source
        ]
    });
}

export async function createCacheItem(source: ILocation, target: ILocation) {
    if (!config.enableCache)
        return
    (async () => {
        ApplicationContext.logs.silly({
            method: 'CacheItem.createCacheItem.start',
            params: [
                source, target
            ]
        });

        let cacheKey = await getCacheKey(source)
        await redis.set(cacheKey, JSON.stringify((target as ILocation&Document).toJSON()));
        await redis.pexpire(cacheKey, config.cacheExpireIn);
        ApplicationContext.logs.silly({
            method: 'CacheItem.createCacheItem.complete',
            params: [
                source, target
            ]
        });

        // await cacheItem.save();
    })().catch((err) => console.error(err.stack));
}



const CacheItem = mongoose.model<ICacheItem&Document>('CacheItem', CacheItemSchema);
export default CacheItem;