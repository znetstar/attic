import { Mongoose, Schema, Document } from 'mongoose';
import * as MUUID from 'uuid-mongodb';
import * as url  from 'url';
import Config from './Config';
import mongoose from './Database';
import {EntitySchema, IEntity} from "./Entity";
import { ILocation as ILocationBase } from 'attic-common/src';
import {ICredentials} from "./Credentials";
import {IDriver} from "attic-common/lib/IDriver";
import { drivers } from './Drivers';
import Constructible from "./Constructible";
import { RPCServer } from './RPC';
import Resolver, {ResolverSchema} from "./Resolver";
import { nanoid } from 'nanoid';
import * as _ from 'lodash';
import {BasicFindOptions, BasicFindQueryOptions, BasicTextSearchOptions} from "attic-common/lib/IRPC";

export interface ILocationModel {
    id?: MUUID.MUUID;
    _id?: MUUID.MUUID;
    auth?: ICredentials|MUUID.MUUID,
    getHref?(): string;
    setHref?(value: string|url.UrlWithStringQuery): void;
    toString?(): string;
    getDriver?(): Constructible<IDriver>;
    entity?: IEntity|MUUID.MUUID;
}


export type ILocation = ILocationModel&ILocationBase;
export const LocationSchema = <Schema<ILocation>>(new (mongoose.Schema)({
    _id: {
        type: 'object',
        value: { type: 'Buffer' },
        default: () => MUUID.v1(),
    },
    href: {
        type: String,
        required: true,
        unique: true
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
        type: 'object',
        value: { type: 'Buffer' },
        ref: 'Credentials'
    },
    entity: {
        type: 'object',
        value: { type: 'Buffer' },
        ref: 'Entity'
    },
    search:  {
        type: String,
        required: false
    },
    driver: {
        type: String,
        required: true,
        enum: Config.drivers.slice(0)
    }
}, {
    timestamps: true
}));

LocationSchema.index({
    'href': 'text',
    'driver': 'text',
    'path': 'text',
    'pathname': 'text',
    'host': 'text',
    'hostname': 'text',
    'protocol': 'text'
}, {
    weights: {
        driver: 10,
        href: 10,
        protocol: 5,
        path: 4,
        pathname: 2,
        host: 4,
        hostname: 2
    },
    name: 'location_search'
});

LocationSchema.methods.getDriver = function () {
    return drivers.get(this.driver);
}

LocationSchema.virtual('id')
    .get(function() {
        return MUUID.from(this._id).toString();
    })
    .set(function(val: string|MUUID.MUUID) {
        this._id = MUUID.from(val);
    });

LocationSchema.methods.getHref = LocationSchema.methods.toString = function () {
    return url.format(this.toJSON());
}

LocationSchema.methods.setHref = function (val: string|url.UrlWithStringQuery): void {
    if (typeof(val) === 'string')
        val = url.parse(val);

    for (let k in val) {
        if (['href', 'toString', 'id', '_id'].includes((k)))
            continue;
        this[<any>k] = (<any>val)[<any>k];
    }
}

LocationSchema.pre(['save', 'init'] as any, function () {
    let self: ILocation&Document = <ILocation&Document>(this as any);
    // self.href = self.getHref();
    if (self.href)
        self.setHref(self.href);
});

LocationSchema.pre([
    'find',
    'findOne'
] as any, function () {
    let self = this as any;
    if (self.id) {
        self._id = MUUID.from(self.id);
        delete self._id;
    }
})

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

    let location = await Location.create(fields);

    return location.id;
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
    let doc = await Location.findOne({ _id: MUUID.from(id) });

    _.extend(doc, fields);
    await doc.save();
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

const Location = mongoose.model<ILocation&Document>('Location', LocationSchema);
export default Location;