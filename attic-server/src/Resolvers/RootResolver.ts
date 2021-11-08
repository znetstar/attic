import { Schema } from 'mongoose';
import Resolver, {IResolver, rootResolverResolve} from '../Resolver';
import mongoose from '../Database';

export const RootResolverSchema = <Schema<IResolver>>(new (mongoose.Schema)({

}))

RootResolverSchema.methods.resolve = rootResolverResolve;


const RootResolver = Resolver.discriminator('RootResolver', RootResolverSchema);
export default RootResolver;
