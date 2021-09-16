import mongoose from '../common/_database';
import {Document, Model, Schema} from "mongoose";
import {ToPojo} from "@thirdact/to-pojo";
import rpcServer, {atticServiceRpcProxy, exposeModel, MarketplaceClientRequest, RequestData} from "./_rpcServer";
import {ModelInterface, SimpleModelInterface} from "@thirdact/simple-mongoose-interface";
import {HTTPError} from "./_rpcCommon";
import atticConfig from '../../misc/attic-config/config.json';
import {ImageFormatMimeTypes} from "@etomon/encode-tools/lib/EncodeTools";
import {makeEncoder} from "./_encoder";
import {ImageFormat} from "@etomon/encode-tools/lib/IEncodeTools";
const { DEFAULT_USER_SCOPE } = atticConfig;
import * as _ from 'lodash';
import {AbilityBuilder, Ability, ForbiddenError} from '@casl/ability'
import { ObjectId } from 'mongodb';
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
const simpleInterface = new SimpleModelInterface<IUser>(new ModelInterface<IUser>(User));

export async function defineAbilitiesFor(user: IUser): Promise<Ability> {
  const { can, cannot, rules } = new AbilityBuilder(Ability);

  can('marketplace:getUser', 'User', { id: user.id });
  can('marketplace:patchUser', 'User', [
    'firstName',
    'middleName',
    'lastName',
    'email'
    ], { id: user.id });
  cannot('marketplace:deleteUser', 'User', { id: user.id });
  return new Ability(rules);
}

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

/**
 * Applies a set of JSON patches to the current user
 * @param args
 */
export async function marketplacePatchUser(...args: any[]): Promise<void> {
  // Extract the session data
  // @ts-ignore
  const clientRequest = (this as { context: { clientRequest:  MarketplaceClientRequest } }).context.clientRequest;
  const additionalData: RequestData = clientRequest.additionalData;

  // additionalData has the raw req/res, in addition to the session

  // Get the user from the session object
  const user: IUser = additionalData?.session?.user.marketplaceUser as IUser;
  if (!user) throw new HTTPError(401);

  // Here you could check if the user has permission to execute

  // Filter out invalid fields
  const restrictedFields  = [
    '/atticUserId',
    '/createdAt',
    '/updatedAt'
  ]

  for (let k of restrictedFields) {
    for (let kk of args[1]) {
      if (kk.path.indexOf(k) !== -1) continue;
    }
  }

  // Make sure to restrict all writes/deletes to the current user id
  args[0] = {
    query: {
      _id: new ObjectId(user._id as string)
    }
  }

  // Execute the request
  // @ts-ignore
  await simpleInterface.patch(...args);
}

(rpcServer as any).methodHost.set('marketplace:createUser', marketplaceCreateUser);
(rpcServer as any).methodHost.set('marketplace:patchUser', marketplacePatchUser);
