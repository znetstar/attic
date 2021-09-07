import mongoose from '../common/_database';
import {Document, ObjectId, Schema} from "mongoose";
import {ToPojo} from "@thirdact/to-pojo";

export interface IUser {
  _id: ObjectId|string;
  id: ObjectId|string;

  firstName: string;
  middleName?: string;
  lastName: string;

  email?: string;
  atticUserId: string;

  image?: Buffer
}

export type IPOJOUser= IUser&{
  image?: string;
}

export const UserSchema: Schema<IUser> = (new (mongoose.Schema)({
  firstName: { type: String, required: true },
  middleName: { type: String, required: false },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  atticUserId: { type: String, required: true },
  image: { type: Buffer, required: false },
  password: { type: String, required: false }
}));

UserSchema.pre('save', async function () {

});

type ToUserParsable = (Document<IUser>&IUser)|IUser|Document<IUser>;
export const ToUserPojo = new ToPojo<ToUserParsable, IPOJOUser>();

export function toUserPojo(marketplaceUser: ToUserParsable): IPOJOUser {
  return ToUserPojo.toPojo(marketplaceUser, {
    conversions: [
      ...ToUserPojo.DEFAULT_TO_POJO_OPTIONS.conversions as any,
      {
        match: (item: Document<IUser>&IUser) => {
          return !!item.image;
        },
        transform: (item: Document<IUser>&IUser) => {
          return `data:image/jpeg;base64,${Buffer.from(item.image as Buffer).toString('base64')}`
        }
      }
    ],
    ...ToUserPojo.DEFAULT_TO_POJO_OPTIONS
  });
}

export const User = mongoose.models.User || mongoose.model<IUser&Document>('User', UserSchema);
