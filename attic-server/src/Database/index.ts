import { connect, Mongoose } from 'mongoose';
import config from '../Config';
import ApplicationContext from "../ApplicationContext";
import * as Redis from 'ioredis';
import {RPCServer} from "../RPC";

const mongoose = (<any>global).mongoose = <Mongoose>(<any>require('mongoose'));
mongoose.connect(config.mongoUri, { useNewUrlParser: true, useUnifiedTopology: true }).catch((err: Error) => {
    console.error(`Error connecting to mongoose: ${err.stack}`)
});

export const redis = new Redis(config.redisUri);

RPCServer.methods.redisFlushAll = async () => { await redis.flushall(); }

export async function loadModels() {
    await ApplicationContext.emitAsync('launch.loadModels.start');
    require('../User');
    require('../Auth/Client');
    require('../Auth/AccessToken');
    require('../Location');
    require('../Entities/IdentityEntity');
    require('../Entity');
    require('../Entities/HTTPResourceEntity');
    require('../Resolver');
    require('../Resolvers/RootResolver');
    await ApplicationContext.emitAsync('launch.loadModels.complete');

}


export default mongoose;