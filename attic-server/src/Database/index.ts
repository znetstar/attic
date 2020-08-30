import { connect, Mongoose } from 'mongoose';
import config from '../Config';

const mongoose = (<any>global).mongoose = <Mongoose>(<any>require('mongoose'));
mongoose.connect(config.mongoUri, { useNewUrlParser: true }).catch((err: Error) => {
    console.error(`Error connecting to mongoose: ${err.stack}`)
});


export function loadModels() {
    require('../Location');
    require('../Entity');
    require('../Resolver');
    require('../CacheItem');
}

export default mongoose;