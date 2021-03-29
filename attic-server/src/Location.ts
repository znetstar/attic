import {Mongoose, Schema, Document, Model} from 'mongoose';
import { ObjectId } from 'mongodb';
import * as url  from 'url';
import Config from './Config';
import mongoose from './Database';
import { ILocation as ILocationBase, IEntity } from '@znetstar/attic-common/lib';
import {IDriver} from "@znetstar/attic-common/lib/IDriver";
import Constructible from "./Constructible";
import { RPCServer } from './RPC';
import Resolver, {ResolverSchema} from "./Resolver";
import { nanoid } from 'nanoid';
import * as _ from 'lodash';
import {BasicFindOptions, BasicFindQueryOptions, BasicTextSearchOptions} from "@znetstar/attic-common/lib/IRPC";
import {moveAndConvertValue, parseUUIDQueryMiddleware} from "./misc";
import {EntitySchema} from "./Entity";
import {IUser} from "./User";
import {IAccessToken} from "./Auth/AccessToken";
import {IHttpContext} from "./Drivers/HTTPCommon";
import ItemCache, {DocumentItemCache} from "./ItemCache";
const drivers = (<any>global).drivers = (<any>global).drivers || new Map<string, Constructible<IDriver>>();

export interface ILocationModel {
    id?: ObjectId;
    _id?: ObjectId;
    auth?: string;
    getHref?(): string;
    setHref?(value: string|url.UrlWithStringQuery): void;
    toString?(): string;
    getDriver?(): Constructible<IDriver>;
    entity?: IEntity|ObjectId;
    httpContext?: IHttpContext;
    driverOptions?: any;
}

export type ILocation = ILocationModel&ILocationBase;
export const LocationSchema = <Schema<ILocation>>(new (mongoose.Schema)({
    href: {
        type: String,
        required: true
    },
    protocol: {
        type: String,
        required: false
    },
    hostname: {
        type: String,
        required: false
    },
    host: {
        type: String,
        required: false
    },
    port: {
        type: String,
        required: false
    },
    pathname: {
        type: String,
        required: false
    },
    path: {
        type: String,
        required: false
    },
    auth: {
        type: String,
        required: false
    },
    entity: {
        type: Schema.Types.ObjectId,
        ref: 'Entity'
    },
    hash: {
        type: String,
        required: false
    },
    search:  {
        type: String,
        required: false
    },
    driver: {
        type: String,
        required: false,
        enum: Config.drivers.slice(0)
    },
    expiresAt: {
        type: Date,
        required: false
    },
    driverOptions: {
        type: Schema.Types.Mixed,
        required: false
    }
}, {
    timestamps: true
}));

LocationSchema.virtual('httpContext')
    .get(function (){ return this.$locals.httpContext; })
    .set(function (ctx: IHttpContext){ this.$locals.httpContext = ctx; })

LocationSchema.index({
    'href': 'text',
    'driver': 'text',
    'path': 'text',
    'pathname': 'text',
    'host': 'text',
    'hostname': 'text',
    'protocol': 'text',
    hash: 'text',
}, {
    weights: {
        driver: 10,
        href: 10,
        protocol: 5,
        path: 4,
        pathname: 2,
        host: 4,
        hostname: 2,
        hash: 1
    },
    name: 'location_search'
});


LocationSchema.methods.getDriver = function () {
    return drivers.get(this.driver);
}


LocationSchema.methods.getHref = LocationSchema.methods.toString = function () {
    let clone = this.toJSON();
    delete clone.auth;
    return url.format(clone);
}

LocationSchema.methods.setHref = function (val: string|url.UrlWithStringQuery): void {
    if (typeof(val) === 'string')
        val = url.parse(val);


    for (let k in val) {
        if (k === 'auth' && _.isEmpty(val[k]))
            continue;
        if (['href', 'toString', 'id', '_id'].includes((k)))
            continue;
        this[<any>k] = (<any>val)[<any>k];
    }
}

LocationSchema.pre(['save', 'init', 'create'] as any, function () {
    let self: ILocation&Document = <ILocation&Document>(this as any);
    if (self.href)
        LocationSchema.methods.setHref.call(self, self.href);
    self.href = LocationSchema.methods.getHref.call(self);
    // moveAndConvertValue(self, 'entity', 'entity', (x: any) => new ObjectId(x));
});

LocationSchema.pre([ 'find', 'findOne' ] as any, function () {
    let self: any = this;
    // moveAndConvertValue(self, 'entity', 'entity', (x: any) => new ObjectId(x));
});

RPCServer.methods.findLocation = async (query: any) => {
    let location = await Location.findOne(query).exec();
    return location ? location.toJSON({ virtuals: true }) : void(0);
}

export async function findLocationInner(query: BasicFindOptions) {
    let locationsQuery = (Location.find(query.query));
    if (query.count) {
        const count = await locationsQuery.count().exec();
        return count;
    }
    if (query.sort) locationsQuery.sort(query.sort);
    if (!Number.isNaN(Number(query.skip))) locationsQuery.skip(query.skip);
    if (!Number.isNaN(Number(query.limit))) locationsQuery.limit(query.limit);
    let locations = await locationsQuery.exec();
    return locations;
}

RPCServer.methods.findLocations = async (query: BasicFindOptions) => {
    let locations = await findLocationInner(query);
    return Array.isArray(locations) ?
        locations.map(l => l.toJSON({ virtuals: true })) :
        locations;
}

RPCServer.methods.createLocation = async (fields: any) => {
    if (fields.entity)
        fields.entity = new ObjectId(fields.entity);
    let location = new Location(fields);
    await location.save();

    return {
        id: location.id,
        href: location.href
    };
}

RPCServer.methods.deleteLocation = async (query: any) => {
    await RPCServer.methods.deleteLocations({ limit: 1, query })
}

RPCServer.methods.deleteLocations = async (query: BasicFindQueryOptions) => {
    let locs: Array<ILocation&Document> = (await findLocationInner(query)) as Array<ILocation&Document>;
    for (let loc of locs) {
        await loc.remove();
    }
}

RPCServer.methods.updateLocation = async (id: string, fields: any) => {
    let doc = await Location.findOne({ _id: new ObjectId(id) });

    _.extend(doc, fields);
    await doc.save();

    return {
        id: doc.id,
        href: doc.href
    }
}

RPCServer.methods.searchLocations = async (query:  BasicTextSearchOptions) => {
    let locationsQuery = (Location.find({
        $text: {
            $search: query.terms,
            $caseSensitive: false
            }
        }, {
        score: {
            $meta: 'textScore'
        }
    }).sort({ score:{ $meta:"textScore" }} ));
    if (query.count) {
        const count = await locationsQuery.count().exec();
        return count;
    }
    if (!Number.isNaN(Number(query.skip))) locationsQuery.skip(query.skip);
    if (!Number.isNaN(Number(query.limit))) locationsQuery.limit(query.limit);
    let locations = await locationsQuery.exec();
    return locations.map(l => l.toJSON({ virtuals: true }));
}

export const Location = mongoose.model<ILocation&Document>('Location', LocationSchema);

Location.collection.createIndex({ 'href': 1 }, { unique: true });

Location.collection.createIndex({
    '_id': 1,
    'driver': -1
}, {
    unique: true
});

Location.collection.createIndex({
    expiresAt: 1
}, {
    expireAfterSeconds: 0
});

// export const ResolverCache = new DocumentItemCache<ILocation, ILocation, Model<any>>(Location);
export const ResolverCache = new ItemCache<ILocation, ILocation>('Location');

export default Location;