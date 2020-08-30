import Location, {ILocation, LocationSchema} from '../Location';
import { IEntity, default as Entity } from '../Entity';
import { Mongoose, Schema, Document } from 'mongoose';
import config from '../Config';
import Resolver, {IResolver, ResolverSchema, rootResolverResolve} from '../Resolver';
import mongoose from '../Database';
import { ObjectId } from 'mongodb';
import Config from "../Config";


export const RootResolverSchema = <Schema<IResolver>>(new (mongoose.Schema)({

}))

RootResolverSchema.methods.resolve = rootResolverResolve;


const RootResolver = Resolver.discriminator('RootResolver', RootResolverSchema);
export default RootResolver;