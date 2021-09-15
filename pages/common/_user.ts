import mongoose from '../common/_database';
import {Document, ObjectId, Schema} from "mongoose";
import {ToPojo} from "@thirdact/to-pojo";
import rpcServer, {atticServiceRpcProxy, exposeModel} from "./_rpcServer";
import {ModelInterface, SimpleModelInterface} from "@thirdact/simple-mongoose-interface";
import {HTTPError} from "./_rpcCommon";
import atticConfig from '../../misc/attic-config/config.json';
import {ImageFormatMimeTypes} from "@etomon/encode-tools/lib/EncodeTools";
import {makeEncoder} from "./_encoder";
import {ImageFormat} from "@etomon/encode-tools/lib/IEncodeTools";
const { DEFAULT_USER_SCOPE } = atticConfig;
import * as _ from 'lodash';

/**
 * Model for the user profile, with the fields present on each user object
 */
export interface IUser {
  _id: ObjectId|string;
  id: ObjectId|string;

  firstName: string;
  middleName?: string;
  lastName: string;

  email?: string;
  atticUserId: string;
  /**
   * Image as a `Buffer`
   */
  image?: Buffer

  /**
   * The password here is a placeholder and does nothing
   *
   * Attic handles password login.
   */
  password?: string;
}


export type IPOJOUser= IUser&{
  /**
   * Image as a data uri
   */
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
  // Changing the password will update the password on the attic server
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

/**
 * Returns a POJO copy of the user object. This converts the image to a data URI
 * @param marketplaceUser
 */
export function toUserPojo(marketplaceUser: ToUserParsable): IPOJOUser {
  return ToUserPojo.toPojo(marketplaceUser, {
    conversions: [
      ...ToUserPojo.DEFAULT_TO_POJO_OPTIONS.conversions as any,
      {
        match: (item: Document<IUser>&IUser) => {
          return !!item.image;
        },
        transform: (item: Document<IUser>&IUser) => {
          const enc = makeEncoder();

          const mime = ImageFormatMimeTypes.get(enc.options.imageFormat as ImageFormat) as string;
          return `data:${mime};base64,${Buffer.from(item.image as Buffer).toString('base64')}`
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

/**
 * Creates a new user using the provided fields first on the attic server,
 * and then in the marketplace database
 * @param form Fields for the new user
 */
export async function marketplaceCreateUser (form: IUser&{[name:string]:unknown}) {
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
    throw new HTTPError(500, (
      _.get(err, 'data.message') || _.get(err, 'innerError.message') || err.message || err.toString()
    ));
  }
}
(rpcServer as any).methodHost.set('marketplace:createUser', marketplaceCreateUser);
