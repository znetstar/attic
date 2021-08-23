import mongoose from '../common/_database';
import {Document, ObjectId, Schema} from "mongoose";

export interface IUser {
  _id: ObjectId|string;
  id: ObjectId|string;

  firstName?: string;
  middleName?: string;
  lastName?: string;

  email?: string;
  atticUserId: string;

  image?: Buffer
}

export const UserSchema: Schema<IUser> = (new (mongoose.Schema)({

}));

export const User = mongoose.models.User || mongoose.model<IUser&Document>('User', UserSchema);
