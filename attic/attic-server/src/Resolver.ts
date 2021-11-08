import Location, {ILocation, LocationSchema, ResolverCache} from "./Location";
import { Document, Schema } from 'mongoose';
import Constructible from "./Constructible";
import { ObjectId } from 'mongodb';
import mongoose from "./Database";
import { IResolver as IResolverBase } from '@znetstar/attic-common/lib';
import Entity,{EntitySchema, IEntity} from "./Entity";
import {RPCServer} from "./RPC";
import {BasicFindOptions, BasicFindQueryOptions, BasicTextSearchOptions, ResolveOptions as ResolveOptionsBase} from "@znetstar/attic-common/lib/IRPC";
import * as _ from "lodash";
import {RootResolverSchema} from "./Resolvers/RootResolver";
import {ensureMountPoint} from "@znetstar/attic-common/lib";
import {IMountPoint} from "@znetstar/attic-common/lib/IResolver";
import Config from "./Config";
import { moveAndConvertValue, parseUUIDQueryMiddleware} from "./misc";
import ApplicationContext from "./ApplicationContext";
import {GenericError} from "@znetstar/attic-common/lib/Error/GenericError";

export interface IResolverModel {
    id: ObjectId;
    _id: ObjectId;
    type: String;
    mountPoints: ILocation[];
    resolve(location: ILocation): Promise<ILocation>;
}

export type IResolver = IResolverModel&IResolverBase;

export const ResolverSchema = <Schema<IResolver>>(new (mongoose.Schema)({
    mountPoint: {
        type: {
            regex: {
                type: String,
                required: true
            },
            options: {
                type: String,
                required: true
            },
            expression: {
                type: String,
                required: true
            }
        },
        required: true
    },
    priority: {
        type: Number,
        required: false
    },
    type: {
        type: String,
        required: true,
        default: 'Resolver',
        enum: Config.resolverTypes.slice(0)
    },
    isRootResolver: {
        type: Boolean,
        required: true,
        default: false
    }
}, {
    discriminatorKey: 'class',
    timestamps: true
}));

ResolverSchema.index({
    mountPoint: 1,
    priority: -1,
    isRootResolver: 1
});

ResolverSchema.index({
    'mountPoint': 1,
    priority: -1
}, { unique: true });

ResolverSchema.index({
    'mountPoint.expression': 1
});

ResolverSchema.index({
    'mountPoint.regex': 1,
    'mountPoint.options': 1
});

ResolverSchema.index({
    'mountPoint.expression': 'text',
    'mountPoint.regex': 'text',
    'mountPoint.options': 'text'
}, {
    weights: {
        'mountPoint.expression': 10,
        'mountPoint.regex': 5,
        'mountPoint.options': 5
    },
    name: 'resolver_search'
});



ResolverSchema.pre(([ 'find', 'findOne' ] as  any),  function () {
    let self = this as any;

    moveAndConvertValue(self, '_conditions.mountPoint', '_conditions.mountPoint.expression', (mnt: any) => ensureMountPoint(mnt as any).expression);
})

ResolverSchema.pre('init', function () {
    let self: any = this;

    try { self.mountPoint = ensureMountPoint(self.mountPoint); } catch (err) {}
    self.isRootResolver = self.type === 'RootResolver';
});

ResolverSchema.pre('save', async function () {
    let self: any = this;

    self.mountPoint = ensureMountPoint(self.mountPoint);

    if (typeof(self.priority) === 'undefined') {
        self.priority = await getNextResolverPriority(self.mountPoint);
    }

    self.isRootResolver = self.type === 'RootResolver';
})

export async function getNextResolverPriority(mountPoint: IMountPoint) {
    const count = await Resolver.find({
        $or: [
            {
                'mountPoint.regex': mountPoint.regex,
                'mountPoint.options': mountPoint.options
            },
            {
                'mountPoint.expression': mountPoint.expression
            }
        ]
    }).count().exec();

    return count;
}

ResolverSchema.methods.resolve = async function (inLocation: ILocation): Promise<ILocation&Document> {
    let location: ILocation&Document = await Location.findOne({ 'href': inLocation.href, driver: { $exists: true } });
    if (location) {
        await location.populate('entity entity.source user').execPopulate();
        return location;
    }
    return null;
}

RPCServer.methods.getNextResolverPriority = getNextResolverPriority;

RPCServer.methods.findResolver = async (query: any) => {
    let resolver = await Resolver.findOne(query).exec();
    return resolver ? resolver.toJSON({ virtuals: true }) : void(0);
}

export async function findResolverInner(query: BasicFindOptions) {
    let resolversQuery = (Resolver.find(query.query));
    if (query.count) {
        const count = await resolversQuery.count().exec();
        return count;
    }
    if (query.sort) resolversQuery.sort(query.sort);
    if (!Number.isNaN(Number(query.skip))) resolversQuery.skip(query.skip);
    if (!Number.isNaN(Number(query.limit))) resolversQuery.limit(query.limit);
if (query.populate) resolversQuery.populate(query.populate);
    let resolvers = await resolversQuery.exec();
    return resolvers;
}

RPCServer.methods.findResolvers = async (query: BasicFindOptions) =>  {
    let resolvers = await findResolverInner(query);
    return Array.isArray(resolvers) ?
        resolvers.map(l => l.toJSON({ virtuals: true })) :
        resolvers;
}

RPCServer.methods.createResolver = async (fields: any) => {
    let resolver = await Resolver.create(fields);

    return resolver.id;
}

RPCServer.methods.deleteResolvers = async (query: BasicFindQueryOptions) => {
    let resolvers: Array<IResolver & Document> = (await findResolverInner(query)) as Array<IResolver & Document>;
    for (let res of resolvers) {
        await res.remove();
    }
}

RPCServer.methods.deleteResolver = async (query: any) => {
    return RPCServer.methods.deleteResolvers({ limit: 1, query });
}

RPCServer.methods.updateResolver = async (id: string, fields: any) => {
    let doc = await Resolver.findOne({ _id: new ObjectId(id) });

    _.extend(doc, fields);
    await doc.save();
}

RPCServer.methods.searchResolvers = async (query:  BasicTextSearchOptions) => {
    let resolverQuery = (Resolver.find({
        $text: {
            $search: query.terms,
            $caseSensitive: true
        }
    }, {
        score: {
            $meta: 'textScore'
        }
    }).sort({ score:{ $meta:"textScore" }} ));
    if (query.count) {
        const count = await resolverQuery.count().exec();
        return count;
    }
    if (!Number.isNaN(Number(query.skip))) resolverQuery.skip(query.skip);
    if (!Number.isNaN(Number(query.limit))) resolverQuery.limit(query.limit);
if (query.populate) resolverQuery.populate(query.populate);
    let resolvers = await resolverQuery.exec();
    return resolvers.map(l => l.toJSON({ virtuals: true }));
}


export async function rootResolverResolve(location: ILocation): Promise<ILocation&Document> {
    // First find a resolver
    let match = <any>{
        match: true
    };
    if (this && this._id) {
        match._id = { $ne: this._id };
    }
    let resolvers = (Resolver.aggregate()
        .sort({
            mountPoint: 1,
            priority: -1,
            isRootResolver: 1
        })
        .append({
            $addFields: {
                match: {
                    $regexMatch: {
                        input: location.href,
                        regex: '$mountPoint.regex',
                        options: '$mountPoint.options'
                    }
                }
            }
        })
        .sort({
            match: -1
        })
        .match({
            match: true
        })
        .cursor({ batchSize: 500 })
        .exec());

    // Loop through each resolver
    let rawResolver: IResolver&Document;
    while (rawResolver = await resolvers.next()) {
        // Attempt to resolve the location
        let outLocation: ILocation&Document;
        if (rawResolver.
          isRootResolver) {
            const resolver = Resolver.hydrate(rawResolver);
            outLocation = await ResolverSchema.methods.resolve.call(resolver, location);
        }
        else {
            const TResolver = mongoose.models[rawResolver.type];

            if (!TResolver) {
              throw new GenericError(
                `Unknown Resolver of type ${rawResolver.type}`,
                0,
                500
              );
            }

            const resolver = Resolver.hydrate(rawResolver);

          outLocation = await (TResolver as any).schema.methods.resolve.call(resolver, location) as ILocation&Document;
        }

        if (outLocation) {
            return (outLocation);
        }
    }

    return null;
}

export interface ResolveOptionsModel {
    id?: string|ObjectId;
}

export type ResolveOptions = ResolveOptionsBase&ResolveOptionsModel;

export async function resolve(location: ILocation|string, options: ResolveOptions = { noCache: false }): Promise<ILocation> {
    let resolver;
    let result: ILocation;
    let { id, noCache } = options;

    ApplicationContext.logs.silly({
        method: 'Resolver.resolve.start',
        params: [
            location, options
        ]
    });

    if (!Config.enableCache) noCache = true;

    if (typeof(location) === 'string') {
        location = <ILocation>{ href: location };
    }

    let cacheKey: ILocation = _.cloneDeep(location);


    // @ts-ignore
    if (location && location.populate) { await location.populate('entity').execPopulate(); }

    if (!noCache) {
        result = await ResolverCache.getObject(cacheKey);
    }

    if (!result) {
        if (id) {
            let findOne: any = {
                driver: {$exists: true},
                _id: new ObjectId(id)
            };
            resolver = await Resolver.findOne(findOne);
        }


        if (resolver) {
            result = ((await resolver.resolve(location)) as Document & ILocation);
        } else {
            result = (await rootResolverResolve(location)) as ILocation & Document;
        }

        // @ts-ignore
        if (result && result.toJSON) { result = result.toJSON({ virtuals: true }); }

        if (result && ( typeof(location.cacheExpireIn) === 'undefined' || location.cacheExpireIn > 0 )) {
            await ResolverCache.setObject(cacheKey, result, location.cacheExpireIn);
        }
    }

    ApplicationContext.logs.silly({
        method: 'Resolver.resolve.complete',
        params: [
            result
        ]
    });


    return result;
}

RPCServer.methods.resolve = async function (location: ILocation|string, options: ResolveOptionsBase) {
    let doc = await resolve(location, options);

    return doc;
}

const Resolver = mongoose.model<IResolver&Document>('Resolver', ResolverSchema);

export default Resolver;
