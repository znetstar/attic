import mongoose from './_database';
import {Document, Model, Schema} from "mongoose";
import {toPojo, ToPojo} from "@thirdact/to-pojo";
import rpcServer, {atticServiceRpcProxy, exposeModel, MarketplaceClientRequest, RequestData} from "./_rpcServer";
import {JSONPatch, ModelInterface, SimpleModelInterface} from "@thirdact/simple-mongoose-interface";
import {HTTPError} from "./_rpcCommon";
import atticConfig from '../../misc/attic-config/config.json';
import {ImageFormatMimeTypes} from "@etomon/encode-tools/lib/EncodeTools";
import {makeEncoder} from "./_encoder";
import {ImageFormat} from "@etomon/encode-tools/lib/IEncodeTools";
const { DEFAULT_USER_SCOPE } = atticConfig;
import * as _ from 'lodash';
import {AbilityBuilder, Ability, ForbiddenError} from '@casl/ability'
import { ObjectId } from 'mongodb';
import {IUser, userAcl, userPrivFields, userPubFields, UserRoles} from "./_user";
import {MarketplaceSession} from "../api/auth/[...nextauth]";
import {Royalty, IRoyalty,IDestination,Destination} from "./_wallet";
import {number} from "prop-types";

export enum SaleTypes {
  sale = 'sale',
  auction = 'auction'
}

/**
 * Model for the nft creation and it's metaData, with the fields present on each nft object
 */
export interface INFTData {
  _id: ObjectId|string;
  id: ObjectId|string;

  /**
   * Image as a `Buffer`
   */
  nftItem: Buffer;

  title: string;
  description?: string;
  tags?: string[];
  supply: number;
  nftFor: SaleTypes;

  listOn: Date;
  royalties: IRoyalty[];
  priceStart?: number;
  priceBuyNow?: number;


  /**
   * Author of the item
   */
  userId: ObjectId|string;
  public?: boolean;
}

export class RoyaltiesMustBe100 extends Error {
  constructor()  { super(`All royalty destinations must equal 100%`);  }
}

export const NFTDataSchema: Schema<INFTData> = (new (mongoose.Schema)({
  title: { type: String, required: true },
  description: { type: String, required: false },
  tags: { type: [String], required: false },
  supply: { type: Number, required: true, min:[1, 'Should be atleast 1 item'] },
  nftFor: {type: String, required: true, enum: { values: ['sale', 'auction'], message: '{VALUE} is not supported!! Should be either sale or auction'}},
  royalties: {
    type: [Royalty],
    validate: (royalties: IRoyalty[]) => {
      if (!royalties.length) return true;

      let pct: number = 0;
      for (const royalty of royalties)
        pct += royalty.percent;
      if (pct !== 1)
        throw new RoyaltiesMustBe100();

      return true;
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
    ref: 'User'
  },
  nftItem: { type: Buffer, required: true },
  listOn: { type: Date, required: true },
  priceStart: {type: Number, required: false},
  priceBuyNow: {type: Number, required: false},
  public: {type: Boolean, required: false}
}));

export const NFT = mongoose.models.NFT || mongoose.model<INFTData>('NFT', NFTDataSchema);
const nftInterface = new SimpleModelInterface<INFTData>(new ModelInterface<INFTData>(NFT));

const nftPubFields = [
  'title',
  'description',
  'tags',
  'supply',
  'priceStart',
  'priceBuyNow',
  'userId',
  'public'
]

const nftPrivFields = [
  ...nftPubFields,
  'royalties',
  'nftItem',
  'listOn'
]

export interface NFTACLOptions {
  nft?: { userId: ObjectId, public?: boolean };
  session?: MarketplaceSession|null;
}

export function nftAcl(options?: NFTACLOptions): Ability {
  const { can, cannot, rules } = new AbilityBuilder(Ability);

  if (options?.session?.user?.marketplaceUser?.roles?.includes(UserRoles.nftAdmin)) {
    can([
      'marketplace:getNFT',
      'marketplace:createNFT',
      'marketplace:patchNFT',
      'marketplace:deleteNFT'
    ], 'NFT', 'all');
  }
  else {
    /// Anyone can view public NFT info
    can('marketplace:getNFT', 'NFT', nftPubFields, {
      public: true
    });

    // Owner can see their own NFTs  even if not  public
    if (options?.nft?.userId &&
      options?.session?.user?.marketplaceUser?._id &&
      options?.session?.user?.marketplaceUser?._id.toString() === options?.nft?.userId.toString()) {

      can([
        'marketplace:getNFT'
      ], 'NFT', nftPubFields, {
        userId: options?.session?.user?.marketplaceUser?._id
      });
    }
  }

  return new Ability(rules);
}


/**
 * Creates a new nft document using the provided fields in the marketplace database,
 * @param form Fields for the new ntf document
 */
export async function marketplaceCreateNft (form: INFTData) {
  try {
    // Extract the session data
    // @ts-ignore
    const clientRequest = (this as { context: { clientRequest:  MarketplaceClientRequest } }).context.clientRequest;
    const additionalData: RequestData = clientRequest.additionalData;

    // additionalData has the raw req/res, in addition to the session

    // Get the user from the session object
    const user: IUser = additionalData?.session?.user.marketplaceUser as IUser;
    if (!user) throw new HTTPError(401);
    const acl = nftAcl({  session: additionalData?.session });

    // Here you could check if the user has permission to execute
    for (const k in form) {
      acl.can('marketplace:createNft', 'NFT', k);
    }

    const marketplaceNft = await NFT.create({
      title: form.title,
      description: form.description,
      tags: form.tags,
      supply: form.supply,
      nftFor: form.nftFor,
      royalties: form.royalties,
      userId: form.userId,
      nftItem: form.nftItem,
      listOn: form.listOn,
      priceStart: form.priceStart,
      priceBuyNow: form.priceBuyNow
    });
  } catch (err:any) {
    throw new HTTPError(err?.httpCode || 500, (
      _.get(err, 'data.message') || _.get(err, 'innerError.message') || err.message || err.toString()
    ));
  }
}


/**
 * Creates a new nft document using the provided fields in the marketplace database,
 * @param form Fields for the new ntf document
 */
export async function marketplaceGetNft (query: unknown, getOpts?: { limit?: number, skip?: number }) {
  try {
    // Extract the session data
    // @ts-ignore
    const clientRequest = (this as { context: { clientRequest:  MarketplaceClientRequest } }).context.clientRequest;
    const additionalData: RequestData = clientRequest.additionalData;

    const acl = nftAcl({ session: additionalData?.session, nft: query as any });

    // Here you could check if the user has permission to execute
    for (const k in query as any) {
      if (!acl.can('marketplace:getNFT', 'NFT', k))
        throw new HTTPError(403, `You do have permission get NFT information`);
    }

    const cur = NFT.find(query as any);
    if (typeof(getOpts?.limit) === 'number') {
      cur.limit(getOpts.limit)
    }
    if (typeof(getOpts?.skip) === 'number') {
      cur.skip(getOpts.skip)
    }
    const nfts = await cur.exec();

    const pojo = toPojo(nfts);
    return pojo;
  } catch (err:any) {
    throw new HTTPError(err?.httpCode || 500, (
      _.get(err, 'data.message') || _.get(err, 'innerError.message') || err.message || err.toString()
    ));
  }
}

