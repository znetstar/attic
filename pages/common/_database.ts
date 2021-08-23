import {
  Mongoose,
  Schema
} from 'mongoose';

export const mongoose = <Mongoose>(<any>require('mongoose'));
mongoose.connect(process.env.MONGO_URI as string, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: true,
  useCreateIndex: true
}).catch((err: Error) => {
  console.error(`Error connecting to mongoose: ${err.stack}`);
  process.exit(1);
});


export default mongoose;
