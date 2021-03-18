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

export const CacheItemSchema = <Schema<ICacheItem>>(new (mongoose.Schema)({
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

export async function resolveFromCache(source: ILocation): Promise<ILocation&Document> {
    let location: ILocation&Document;
    let cacheKey = await xxhash64(JSON.stringify(source));
    cacheKey = `resolverCache.${cacheKey}`;

    let locTmp = await redis.get(cacheKey);
    if (locTmp)
        location = Location.hydrate(JSON.parse(locTmp));

    if (!location) {
        // let items: Array<ICacheItem & Document> = await (CacheItem.find({
        //     disabled: {$ne: true},
        //     expiresAt: {$gt: new Date()},
        //     'source.href': source.href
        // })
        //     .sort({
        //         disabled: 1,
        //         expiresAt: -1,
        //         'source.href': 1
        //     }).limit(1).exec());
        //
        // if (_.isEmpty(items) || !items)
        //     return null as any;
        //
        // location = items[0].target as Document & ILocation;
        //
        // await redis.set(cacheKey, JSON.stringify(location.toJSON()));
        // await redis.pexpire(cacheKey, config.cacheExpireIn);
    }

    if (location)
        await location.populate('target.entity target.entity.source target.user').execPopulate();

    return location;
}

export async function invalidateCacheItem(source: ILocation): Promise<void> {
    let cacheCursor = CacheItem.find({ 'source.href': source.href }).sort({ _id: -1, 'source.href': 1 }).cursor();
    let cacheItem: ICacheItem&Document;
    while (cacheItem = await cacheCursor.next()) {
        cacheItem.disabled = true;
        await cacheItem.save();
    }
}

export async function createCacheItem(source: ILocation, target: ILocation) {
    let cacheItem = new CacheItem({
        source,
        target
    });

    (async () => {
        let cacheKey = await xxhash64(JSON.stringify(source));
        cacheKey = `resolverCache.${cacheKey}`;

        await redis.set(cacheKey, JSON.stringify(target));
        await redis.pexpire(cacheKey, config.cacheExpireIn);

        // await cacheItem.save();
    })().catch((err) => console.error(err.stack));

    return cacheItem;
}



const CacheItem = mongoose.model<ICacheItem&Document>('CacheItem', CacheItemSchema);
export default CacheItem;