import Location, {ILocation, LocationSchema} from '../Location';
import { IEntity, default as Entity } from '../Entity';
import { Mongoose, Schema, Document } from 'mongoose';
import config from '../Config';
import Resolver, { IResolver } from '../Resolver';
import mongoose from '../Database';
import * as MUUID from 'uuid-mongodb';
import Config from "../Config";


export const RootResolverSchema = <Schema<IResolver>>(new (mongoose.Schema)({

}))

RootResolverSchema.methods.resolve = async function (location: ILocation): Promise<ILocation> {
    // First find a resolver
    let match = <any>{
        match: true
    };
    if (this && this._id) {
        match._id = { $ne: this._id };
    }
    let resolvers = await (Resolver.aggregate()
        .sort({ isRootResolver: 1 })
        .match({ isRootResolver: false })
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
        .match({
            match: true
        })
        .sort({
            match: -1,
            priority: -1,
            mountPoint: 1
        })
        .exec());

    // Loop through each resolver
    let resolver: IResolver&Document;
    while (resolver = await resolvers.next()) {
        // Attempt to resolve the location
        let outLocation = await resolver.resolve(location);

        if (outLocation) {
            return outLocation;
        }
    }

    return null;
}


const RootResolver = Entity.discriminator('RootResolver', RootResolverSchema)
export default RootResolver;