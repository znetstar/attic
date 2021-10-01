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
import {IPOJOUser, IUser, ToUserPojo, userAcl, userPrivFields, userPubFields, UserRoles, User as MarketplaceUser} from "./_user";
import {getUser, MarketplaceSession, User} from "../api/auth/[...nextauth]";
import {number} from "prop-types";
import {IToken, Token, TokenSupplyType, TokenType} from "./_token";
import {CustomRoyaltyFee} from "@hashgraph/sdk";

export enum SaleTypes {
  sale = 'sale',
  auction = 'auction'
}



export interface IRoyalty {
  _id: ObjectId;
  owedTo: IUser;
  percent: number;
  toCryptoValue: () => Promise<CustomRoyaltyFee>
}

export const Royalty: Schema<IRoyalty> = (new (mongoose.Schema)({
  owedTo: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  percent: {
    type: Number,
    required: true,
    validate: (x: unknown) => typeof(x) === 'number' && !Number.isNaN(x) && (x >= 0 || x <= 100)
  }
}));


Royalty.methods.toCryptoValue = async function(): Promise<CustomRoyaltyFee> {
  const self: IRoyalty&Document = this;


  const fee = new CustomRoyaltyFee()
    .setNumerator(self.percent)
    .setDenominator(100);


  return fee;
}

export interface HIP10Metadata {
  name: string;
  description: string;
  image: string;
  localization?: { uri: string, locales: string[], default: string }
}

export interface INFTMetadata  {
  name?: string;
  description?: string;
  image: Buffer;
  localization?: { uri: string, locales: string[], default: string },
  tags: string[]
}


export type INFT = IToken&INFTMetadata&{
  maxSupply: 0;
  nftFor?: SaleTypes;
  priceStart?: number;
  priceBuyNow?: number;
  listOn?: Date|string;
  customFees?: IRoyalty[];
  userId: IUser;
  sellerId?: IUser;
  sellerInfo?: {
    firstName: string;
    lastName: string;
  },
  public?: boolean;
}

export type IListedNFT = {
  image: string;
  _id: string;
  name: string;
  symbol: string;
  tags: string[];
  maxSupply: 0;
  minted: number;
  priceStart?: number;
  priceBuyNow?: number;
  sellerInfo: {
    firstName: string;
    lastName: string;
  };
  public: boolean;
}

export class RoyaltiesMustBe100 extends HTTPError {
  constructor()  { super(400, `All royalty destinations must equal 100%`);  }
}

export const NFTSchema: Schema<INFT> = (new (mongoose.Schema)({
  tags: { type: [String], required: false },
  supply: { type: Number, required: false, min:[1, 'Should be atleast 1 item'] },
  nftFor: {type: String, required: false, enum: { values: ['sale', 'auction'], message: '{VALUE} is not supported!! Should be either sale or auction'}},
  customFees: {
    type: [Royalty],
    validate: (royalties: IRoyalty[]) => {
      if (!royalties.length) return true;

      let pct: number = 0;
      for (const royalty of royalties)
        pct += royalty.percent;
      if (pct !== 100)
        throw new RoyaltiesMustBe100();

      return true;
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  sellerInfo: {
    firstName: { type: String, required: false },
    lastName: {  type: String, required: false },
    required: false
  },
  image: { type: Buffer, required: false },
  listOn: { type: Date, required: false },
  priceStart: {type: Number, required: false},
  priceBuyNow: {type: Number, required: false},
  public: {type: Boolean, required: false}
}, {
  discriminatorKey: 'tokenType'
}));

export const NFT = (global as any).NFTModel = (global as any).NFTModel || Token.discriminator(TokenType.nft, NFTSchema);
const nftInterface = new SimpleModelInterface<INFT>(new ModelInterface<INFT>(NFT));

NFTSchema.pre<INFT>('save', async function () {
  if (this.sellerId) {
    const seller = await MarketplaceUser.findById(this.sellerId);
    this.sellerInfo = {
      firstName: seller.firstName,
      lastName: seller.lastName
    };
  }
});

export const nftPubFields = [
  '_id',
  'name',
  'description',
  'tags',
  'maxSupply',
  'minted',
  'priceStart',
  'priceBuyNow',
  'sellerId',
  'public',
  'minted'
]

export const nftPrivFields = [
  ...nftPubFields,
  'customFees',
  'image',
  'listOn'
]

export interface NFTACLOptions {
  nft?: { userId: ObjectId|string, sellerId: ObjectId|string, public?: boolean };
  session?: MarketplaceSession|null;
}

export async function nftAcl(options?: NFTACLOptions): Promise<Ability> {
  const { can, cannot, rules } = new AbilityBuilder(Ability);
  const user = (await getUser(options?.session)) as User|null;

  if (
    // @ts-ignore
    (user.marketplaceUser?.roles || []).includes(UserRoles.nftAdmin)
  ) {
    can([
      'marketplace:getNFT',
      'marketplace:createNFT',
      'marketplace:patchNFT',
      'marketplace:deleteNFT'
    ], 'NFT');
  }
  else {
    /// Anyone can view public NFT info
    can('marketplace:getNFT', 'NFT', nftPubFields, {
      public: true
    });

    // Owner and Seller can see their own NFTs  even if not  public
    if (options?.nft?.userId && options?.session?.user?.marketplaceUser?._id && options?.session?.user?.marketplaceUser?._id.toString() === options?.nft?.userId.toString()
        || options?.nft?.sellerId && options?.session?.user?.marketplaceUser?._id && options?.session?.user?.marketplaceUser?._id.toString() === options?.nft?.sellerId.toString()) {

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
export async function marketplaceCreateNft (form: INFT) {
  try {
    // Extract the session data
    // @ts-ignore
    const clientRequest = (this as { context: { clientRequest:  MarketplaceClientRequest } }).context.clientRequest;
    const additionalData: RequestData = clientRequest.additionalData;

    // additionalData has the raw req/res, in addition to the session

    // Get the user from the session object
    const user: IUser = additionalData?.session?.user.marketplaceUser as IUser;
    if (!user) throw new HTTPError(401);
    const acl = await nftAcl({  session: additionalData?.session });

    // Here you could check if the user has permission to execute
    for (const k in form) {
      if (!acl.can('marketplace:createNFT', 'NFT', k)) {
        throw new HTTPError(403, `You do have permission to create NFT`);
      }
    }

    const marketplaceNft = await NFT.create({
      name: form.name,
      symbol: form.symbol,
      description: form.description,
      tags: form.tags,
      maxSupply: 0,
      nftFor: form.nftFor,
      customFees: form.customFees,
      userId: user._id,
      sellerId: form.sellerId,
      image: form.image,
      listOn: form.listOn,
      priceStart: form.priceStart,
      priceBuyNow: form.priceBuyNow,
      supplyType: TokenSupplyType.finite
    });

    return marketplaceNft._id.toString();
  } catch (err:any) {
    throw new HTTPError(err?.httpCode || 500, (
      _.get(err, 'data.message') || _.get(err, 'innerError.message') || err.message || err.toString()
    ));
  }
}


type ToNFTParsable = (Document<INFT>&INFT)|INFT|Document<INFT>;
export const ToNFTPojo = new ToPojo<ToNFTParsable, INFT&{ image?: string }>();


/**
 * Returns a POJO copy of the user object. This converts the image to a data URI
 * @param marketplaceUser
 */
export function toListedNFT(nft: INFT): IListedNFT {
  const pojo = ToNFTPojo.toPojo(nft, {
    conversions: [
      ...ToNFTPojo.DEFAULT_TO_POJO_OPTIONS.conversions as any,
      {
        match: (item: Document<INFT>&INFT) => {
          return !!item.image;
        },
        transform: (item: Document<INFT>&INFT) => {
          const enc = makeEncoder();

          const mime = ImageFormatMimeTypes.get(enc.options.imageFormat as ImageFormat) as string;
          return `data:${mime};base64,${Buffer.from(item.image as Buffer).toString('base64')}`
        }
      }
    ],
    ...ToNFTPojo.DEFAULT_TO_POJO_OPTIONS
  });

  return {
    image: pojo.image,
    _id: pojo._id.toString(),
    name: pojo.name,
    symbol: pojo.symbol,
    tags: pojo.tags,
    maxSupply: pojo.maxSupply,
    minted: pojo.minted,
    priceStart: pojo.priceStart,
    priceBuyNow: pojo.priceBuyNow,
    public: pojo.public as boolean,
    sellerInfo: pojo.sellerInfo as { firstName: string, lastName: string }
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

    const acl = await nftAcl({ session: additionalData?.session, nft: query as any });

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

    const pojo = nfts.map((n: INFT) => toListedNFT(n));
    return pojo;
  } catch (err:any) {
    throw new HTTPError(err?.httpCode || 500, (
      _.get(err, 'data.message') || _.get(err, 'innerError.message') || err.message || err.toString()
    ));
  }
}

export async function marketplacePatchNft(id: string, patches: any[]) {
  // Extract the session data
  // @ts-ignore
  const clientRequest = (this as { context: { clientRequest: MarketplaceClientRequest } }).context.clientRequest;
  const additionalData: RequestData = clientRequest.additionalData;

  // additionalData has the raw req/res, in addition to the session

  // Get the user from the session object
  const user: IUser = (await getUser(additionalData.session))?.marketplaceUser as IUser;
  if (!user) throw new HTTPError(401);
  const acl = await nftAcl({session: additionalData?.session});

  // Here you could check if the user has permission to execute
  // for (const k of args[1].map((k: JSONPatch) => k.path.replace(/^\//, '').replace(/\//g, '.'))) {
  //   if (!acl.can('marketplace:patchUser', 'User', k))
  //     throw new HTTPError(403, `You do have p  ermission to patch a user`);
  // }

  try {
    // Execute the request
    // @ts-ignore
    const resp = await nftInterface.patch({
      query: {
        _id: new ObjectId(id)
      }
    }, patches);
    return resp
  } catch (err) {
    debugger;
  }
}
