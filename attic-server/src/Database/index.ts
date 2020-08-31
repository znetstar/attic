import { connect, Mongoose } from 'mongoose';
import config from '../Config';
import ApplicationContext from "../ApplicationContext";

const mongoose = (<any>global).mongoose = <Mongoose>(<any>require('mongoose'));
mongoose.connect(config.mongoUri, { useNewUrlParser: true, useUnifiedTopology: true }).catch((err: Error) => {
    console.error(`Error connecting to mongoose: ${err.stack}`)
});

export async function loadModels() {
    await ApplicationContext.emitAsync('loadModels.start');
    require('../User');
    require('../Users/BasicUser');
    require('../Location');
    require('../Entity');
    require('../Entities/HTTPResourceEntity');
    require('../Resolver');
    require('../Resolvers/RootResolver');
    require('../CacheItem');
    await ApplicationContext.emitAsync('loadModels.complete');
}


export default mongoose;