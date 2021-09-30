import {
  Mongoose,
  Schema
} from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';


/**
 * Global mongoose object
 */
export const mongoose = <Mongoose>(<any>require('mongoose'));
mongoose.plugin(accessibleRecordsPlugin);
mongoose.connect(process.env.MARKETPLACE_MONGO_URI as string, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: true,
  useCreateIndex: true
}).catch((err: Error) => {
  console.error(`Errorvt connecting to mongoose ${process.env.MONGO_URI }: ${err.stack}`);
  process.exit(1);
});


export default mongoose;
