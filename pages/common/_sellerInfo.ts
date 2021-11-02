import {Document, Schema} from "mongoose";
import mongoose from "./_database";
import {IUser, toUserPojo} from "./_user";
import {ObjectId} from "mongodb";

export interface ISellerInfo {
  firstName: string;
  lastName: string;
  image?: Buffer;
  imageUrl?: string;
  id: any;
  _id: ObjectId;
  fill(): Promise<void>;
}

export const SellerInfoSchema: Schema<ISellerInfo>  = (new (mongoose.Schema)({
  firstName: {
    type: String,
    required: false
  },
  lastName: {
    type: String,
    required: false
  },
  image: {
    type: Buffer,
    required: false
  },
  imageUrl: {
    type: String,
    required: false
  },
  id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  }
}));

export function sellerInfoFill(user: IUser, self: Partial<ISellerInfo> = {})  {
  self.id = user._id;
  self.firstName = user.firstName;
  self.lastName = user.lastName;
  self.image = user.image;
  if (user.imageUrl)
    self.imageUrl = toUserPojo(user).image as string;

  return self as ISellerInfo;
}

SellerInfoSchema.methods.fill = async function ()  {
  const self = this as Partial<ISellerInfo>&Document;

  await self.populate('id').execPopulate();
  sellerInfoFill(self.id, self);
}

SellerInfoSchema.pre<ISellerInfo>('save', async function () {
 await this.fill();
});

