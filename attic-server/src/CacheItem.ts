import Location, {ILocation, LocationSchema} from './Location';
import { Mongoose, Schema, Document } from 'mongoose';
import mongoose from './Database';
import * as MUUID from 'uuid-mongodb';
import Config from "./Config";
import ICacheItemBase  from "attic-common/lib/ICacheItem";
import config from "./Config";
import {moveAndConvertValue, parseUUIDQueryMiddleware} from "./misc";
import {EntitySchema, IEntity} from "./Entity";
import * as _ from 'lodash';

export interface ICacheItemModel {
    id: MUUID.MUUID;
    _id: MUUID.MUUID;
    source: ILocation;
    target: ILocation;
    expiresAt: Date;
    disabled?: boolean;
}

export type ICacheItem = ICacheItemBase&ICacheItemModel;

export const CacheItemSchema = <Schema<ICacheItem>>(new (mongoose.Schema)({
    _id: {
        type: 'object',
        value: { type: 'Buffer' },
        default: () => MUUID.v1(),
    },
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

    parseUUIDQueryMiddleware.call(this as any);
    moveAndConvertValue(self, '_conditions.source', '_conditions.source.href');
    moveAndConvertValue(self, '_conditions.target', '_conditions.target.href');
});

export async function resolveFromCache(source: ILocation): Promise<ILocation&Document> {
    let items: Array<ICacheItem&Document> = await (CacheItem.find({
        disabled: { $ne: true },
        expiresAt: { $gt: new Date() },
        'source.href': source.href
    })
    .sort({
        disabled: 1,
        expiresAt: -1,
        'source.href': 1
    }).limit(1).exec());

    if (_.isEmpty(items))
        return null as any;

    return items[0].target as Document&ILocation;
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

    await cacheItem.save();
    return cacheItem;
}



const CacheItem = mongoose.model<ICacheItem&Document>('CacheItem', CacheItemSchema);
export default CacheItem;