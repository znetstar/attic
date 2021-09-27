import mongoose from '../common/_database';
import {Document, Model, Schema} from "mongoose";
import {ToPojo} from "@thirdact/to-pojo";
import rpcServer, {atticServiceRpcProxy, exposeModel, MarketplaceClientRequest, RequestData} from "./_rpcServer";
import {JSONPatch, JSONPatchOp, ModelInterface, SimpleModelInterface} from "@thirdact/simple-mongoose-interface";
import {HTTPError} from "./_rpcCommon";
import atticConfig from '../../misc/attic-config/config.json';
import {ImageFormatMimeTypes} from "@etomon/encode-tools/lib/EncodeTools";
import {makeEncoder} from "./_encoder";
import {ImageFormat} from "@etomon/encode-tools/lib/IEncodeTools";
const { DEFAULT_USER_SCOPE } = atticConfig;
import * as _ from 'lodash';
import {AbilityBuilder, Ability, ForbiddenError} from '@casl/ability'
import { ObjectId } from 'mongodb';
import {MarketplaceSession} from "../api/auth/[...nextauth]";

export enum UserRoles {
  nftAdmin = 'nftAdmin'
}

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

  public: boolean;
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

  handle?: string;
  followers?: number;
  following?: number;
  bio?: string;

  roles?: UserRoles[]
}


export type IPOJOUser= IUser&{
  /**
   * Image as a data uri
   */
  image?: string;
}


export const UserSchema: Schema<IUser> = (new (mongoose.Schema)({
  firstName: {
    type: String,
    required: false
  },
  password: {
    type: String,
    required: false
  },
  middleName: {
    type: String,
    required: false
  },
  lastName: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: false,
    unique: true
  },
  atticUserId: { type: String, required: true, unique: true },
  image: { type: Buffer, required: false },
  public: { type: Boolean, required: true, default: () => false },
  follower: {
    type: Number,
    required: false
  },
  following: {
    type: Number,
    required: false
  },
  handle: {
    type: String,
    required: false
  },
  bio: {
    type: String,
    required: false
  },
  roles: {
    type: [String],
    required: false,
    enum: [
      'nftAdmin'
    ]
  }
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

export const userPubFields = [
  'firstName',
  'lastName',
  'image',
  'public',
  '_id'
];
export const userPrivFields = [
  ...userPubFields,
  'middleName',
  'email',
  'password'
];

export const User = mongoose.models.User || mongoose.model<IUser&Document>('User', UserSchema);
const simpleInterface = new SimpleModelInterface<IUser>(new ModelInterface<IUser>(User));

export function userAcl(user?: IUser, session?: MarketplaceSession|null): Ability {
  const { can, cannot, rules } = new AbilityBuilder(Ability);

  if (user) {
    if (session?.user?.marketplaceUser?._id.toString() === user?._id.toString()) {
      can('marketplace:getUser', 'User', userPrivFields, {
        _id: new ObjectId(user.id)
      });

      can('marketplace:patchUser', 'User', userPrivFields, {id: user.id});
    } else {
      can('marketplace:getUser', 'User', userPubFields, {
        _id: new ObjectId(user.id),
        public: true
      });
    }
  }

  if (!session) {
    can('marketplace:createUser', 'User',  userPubFields);
  }

  return new Ability(rules);
}

/**
 * Creates a new user using the provided fields first on the attic server,
 * and then in the marketplace database
 * @param form Fields for the new user
 */
export async function marketplaceCreateUser (form: IUser&{[name:string]:unknown}) {
  const acl = userAcl();

  // for (const k in form) {
  //   if (!acl.can('marketplace:createUser', 'User', k))
  //     throw new HTTPError(403, `You don't have permission to create a user`);
  // }

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

    return marketplaceUser._id.toString();
  } catch (err) {
    throw new HTTPError(err?.httpCode || 500, (
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
  const acl = userAcl(user, additionalData?.session);

  // Here you could check if the user has permission to execute
  for (const k of args[1].map((k: JSONPatch) => k.path.replace(/^\//, '').replace(/\//g, '.'))) {
    if (!acl.can('marketplace:patchUser', 'User', k))
      throw new HTTPError(403, `You do have permission to patch a user`);
  }

  // Make sure to restrict all writes/deletes to the current user id
  args[0] = {
    query: {
      _id: new ObjectId(user._id as string)
    }
  }

  // Execute the request
  // @ts-ignore
  const resp = await simpleInterface.patch(...args);
}

