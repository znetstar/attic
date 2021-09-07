import mongoose from '../common/_database';
import {Document, ObjectId, Schema} from "mongoose";
import {ToPojo} from "@thirdact/to-pojo";
import rpcServer, {atticServiceRpcProxy, exposeModel, mkAtticService} from "./_rpcServer";
import {OAuthAgent} from "@znetstar/attic-cli-common/lib/OAuthAgent";
import {ModelInterface, SimpleModelInterface} from "@thirdact/simple-mongoose-interface";
import {HTTPError} from "./_rpcCommon";
import Redis from "ioredis";
import levelup from "levelup";
import {IORedisDown} from "@etomon/ioredisdown";

import atticConfig from '../../misc/attic-config/config.json';
const { DEFAULT_USER_SCOPE } = atticConfig;


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
  firstName: { type: String, required: false },
  password: { type: String, required: false },
  middleName: { type: String, required: false },
  lastName: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  atticUserId: { type: String, required: true },
  image: { type: Buffer, required: false }
}));

UserSchema.pre<IUser&{ password?: string }>('save', async function () {
  if (this.password) {
    const atticRpc = atticServiceRpcProxy();

    await atticRpc.updateUser(this.atticUserId, {
      password: this.password
    } as any);

    delete this.password;
  }
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

exposeModel(
  'User',
  new SimpleModelInterface<IUser>(new ModelInterface<IUser>(User))
);



(rpcServer as any).methodHost.set('marketplace:createUser', async (form: any) => {
  try {
    const atticRpc = atticServiceRpcProxy();


    const atticUserId = await atticRpc.createUser({
      username: form.email,
      password: form.password,
      scope: DEFAULT_USER_SCOPE
    } as any);

    const marketplaceUser = await User.create({
      email: form.email,
      atticUserId
    });

    await marketplaceUser.save();
  } catch (err) {
    throw new HTTPError(500, err.message);
  }
});
