import Location, {ILocation, LocationSchema} from "./Location";
import { Document, Schema } from 'mongoose';
import Constructible from "./Constructible";;
import * as MUUID from 'uuid-mongodb';
import mongoose from "./Database";
import { IResolver as IResolverBase } from 'attic-common/lib';
import Entity,{EntitySchema, IEntity} from "./Entity";
import {RPCServer} from "./RPC";
import {BasicFindOptions, BasicFindQueryOptions, BasicTextSearchOptions} from "attic-common/lib/IRPC";
import * as _ from "lodash";
import {RootResolverSchema} from "./Resolvers/RootResolver";
import {ensureMountPoint} from "attic-common/lib";
import {IMountPoint} from "attic-common/lib/IResolver";
import Config from "./Config";

export interface IResolverModel {
    id: MUUID.MUUID;
    _id: MUUID.MUUID;
    type: String;
    mountPoints: ILocation[];
    resolve(location: ILocation): Promise<ILocation>;
}

export type IResolver = IResolverModel&IResolverBase;

export const ResolverSchema = <Schema<IResolver>>(new (mongoose.Schema)({
    _id: {
        type: 'object',
        value: { type: 'Buffer' },
        default: () => MUUID.v1(),
    },
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
    discriminatorKey: 'type',
    timestamps: true
}));

ResolverSchema.index({
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

ResolverSchema.virtual('id')
    .get(function() {
        return MUUID.from(this._id).toString();
    })
    .set(function(val: string|MUUID.MUUID) {
        this._id = MUUID.from(val);
    });

ResolverSchema.pre(([ 'find', 'findOne' ] as  any),  function () {
    let self = this as any;

    if (typeof(self.mountPoint) === 'string') {
        let mountPoint = ensureMountPoint(self.mountPoint);
        self['mountPoint.expression'] = mountPoint.expression;
        delete self.mountPoint;
    }
    if (self.id) {
        self._id = MUUID.from(self.id);
        delete self._id;
    }
})

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

ResolverSchema.methods.resolve = async function (location: ILocation): Promise<ILocation&Document> {
    return Location.findOne({ 'href': location.href });
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
    let doc = await Resolver.findOne({ _id: MUUID.from(id) });

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
    let resolvers = await resolverQuery.exec();
    return resolvers.map(l => l.toJSON({ virtuals: true }));
}


RPCServer.methods.resolve = async function (location: ILocation|string, id?: string) {
    let resolver;
    if (id) {
        resolver = await Resolver.findOne({ _id: MUUID.from(id) });
    }
    if (typeof(location) === 'string') {
        location = <ILocation>{ href: location };
    }

    if (resolver) return resolver.resolve(location);
    else return RootResolverSchema.methods.resolve(location);
}

const Resolver = mongoose.model<IResolver&Document>('Resolver', ResolverSchema);

export default Resolver;