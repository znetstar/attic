import mongoose from './_database';
import {Document, Model, Schema} from "mongoose";
import {toPojo, ToPojo} from "@thirdact/to-pojo";
import rpcServer, {
  atticService,
  atticServiceRpcProxy,
  exposeModel,
  MarketplaceClientRequest,
  RequestData
} from "./_rpcServer";
import {JSONPatch, ModelInterface, SimpleModelInterface} from "@thirdact/simple-mongoose-interface";
import {HTTPError} from "./_rpcCommon";
import atticConfig from '../../misc/attic-config/config.json';
import {ImageFormatMimeTypes, SerializationFormatMimeTypes} from "@etomon/encode-tools/lib/EncodeTools";
import {makeEncoder} from "./_encoder";
import {ImageFormat, SerializationFormat} from "@etomon/encode-tools/lib/IEncodeTools";
const { DEFAULT_USER_SCOPE } = atticConfig;
import * as _ from 'lodash';
import {AbilityBuilder, Ability, ForbiddenError} from '@casl/ability'
import { ObjectId } from 'mongodb';
import {objectRefs, s3} from './_aws';
import {
  CannotInteractWithTokenNotCreatedError,
  IToken, MissingKeyError,
  Token,
  TokenNotFoundError,
  TokenSchema,
  TokenSupplyType,
  TokenType,
  Royalty,
  IRoyalty,
  RoyaltiesMustBe100
} from "./_token";
import {
  IPOJOUser,
  IUser,
  ToUserPojo,
  userAcl,
  userPrivFields,
  userPubFields,
  UserRoles,
  User as MarketplaceUser
} from "./_user";
import {getUser, MarketplaceSession, User} from "../api/auth/[...nextauth]";
import {number} from "prop-types";
import {CustomRoyaltyFee, PrivateKey, TokenFeeScheduleUpdateTransaction, TokenBurnTransaction, TokenId, TransactionReceipt} from "@hashgraph/sdk";
import {generateCryptoKeyPair} from "./_keyPair";
import {
  getCryptoAccountByKeyName,
  ICryptoAccount
} from "./_account";
import CryptoQueue from "./_cryptoQueue";
import {Job} from "bullmq";
import {ISellerInfo, SellerInfoSchema} from "./_sellerInfo";

export { Royalty, RoyaltiesMustBe100 };
export type {IRoyalty};

export enum SaleTypes {
  sale = 'sale',
  auction = 'auction'
}


export interface INFTInstance  {
  _id: ObjectId;
  nft: INFT;
  serial: Buffer;
  owner: ICryptoAccount;
}
export const NFTInstanceSchema: Schema<INFTInstance> = (new (mongoose.Schema)({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'CryptoAccount'
  },
  serial: {
    type: Buffer,
    required: true
  },
  nft: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'NFT'
  }
}, { timestamps: true }));


export interface HIP10Metadata {
  name: string;
  description?: string;
  image: string;
  localization?: { uri: string, locales: string[], default: string }
}

export interface INFTMetadata  {
  name?: string;
  description?: string;
  image?: Buffer;
  localization?: { uri: string, locales: string[], default: string },
  tags: string[]
}


export type INFT = {
  maxSupply: number;
  nftFor?: SaleTypes;
  priceStart?: number;
  priceBuyNow?: number;
  listOn?: Date|string;
  userId: IUser;
  sellerId?: ObjectId;
  tokenType: TokenType.nft,
  sellerInfo?: ISellerInfo,
  public?: boolean;
  imageUrl?: string;
  metadataUrl?: string;
  cryptoMintToken(metadatas?: HIP10Metadata[]): Promise<void>;
  cryptoTransferNonFungible(executingAccountId: ObjectId|string, lines: Map<{ to: Buffer, from?: Buffer }, number>): Promise<void>;
  getHIP10Metadata(): Promise<HIP10Metadata>;
  cryptoSyncRoyalties(): Promise<void>;
}&INFTMetadata&IToken

export type IListedNFT = {
  _id: string;
  name: string;
  symbol: string;
  tags: string[];
  maxSupply: number;
  minted: number;
  priceStart?: number;
  priceBuyNow?: number;
  image?: string;
  sellerInfo: {
    firstName: string;
    lastName: string;
    image: Buffer;
  };
  public: boolean;
}


export const NFTSchema: Schema<INFT> = (new (mongoose.Schema)({
  tags: { type: [String], required: false },
  description: { type: String, required: false },
  supply: { type: Number, required: false, min:[1, 'Should be atleast 1 item'] },
  nftFor: {type: String, required: false, enum: { values: ['sale', 'auction'], message: '{VALUE} is not supported!! Should be either sale or auction'}},
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  decimals: {
    type: Number,
    required: false,
    // @ts-ignore
    default: function (x?: number): boolean {
      // @ts-ignore
      return this.supplyType === TokenSupplyType.finite ? 0 : undefined;
    },
    // @ts-ignore
    validate: function (x?: number): boolean {
      // @ts-ignore
      return this.supplyType === TokenSupplyType.finite ? !Number.isNaN(Number(x)) : undefined;
    }
  },
  sellerInfo: SellerInfoSchema,
  image: { type: Buffer, required: false },
  imageUrl: { type: String, required: false },
  listOn: { type: Date, required: false },
  priceStart: {type: Number, required: false},
  priceBuyNow: {type: Number, required: false},
  public: {type: Boolean, required: false},
  metadataUrl: { type: String, required: false },
  // tokenType: {
  //   enum: [ TokenType.nft ],
  //   type: String,
  //   default: TokenType.nft
  // }
}, {
  discriminatorKey: 'tokenType'
}));

NFTSchema.virtual('sellerId')
  .get(function () {
    // @ts-ignore
    return (this as INFT&Document).sellerInfo?._id;
  })
  .set(function (val: any) {
    // @ts-ignore
     if ((this as INFT&Document).sellerInfo)
       // @ts-ignore
      (this as INFT&Document).sellerInfo._id = val;
  });

export const NFT = (global as any).NFTModel = (global as any).NFTModel || Token.discriminator(TokenType.nft, NFTSchema);
const nftInterface = new SimpleModelInterface<INFT>(new ModelInterface<INFT>(NFT));

export const NFTInstance = mongoose.models.NFTInstance || mongoose.model<INFTInstance>('NFTInstance', NFTInstanceSchema);

async function nftSave() {
  try {
    const { RPCProxy } = atticService();

    // @ts-ignore
    const self: any = this;
    const enc = makeEncoder();

    const paths = self.modifiedPaths();
    if (paths.includes('image')) {
      const href = `/nft/${self._id.toString()}`
      const s3Href = `${process.env.USER_IMAGES_S3_URI}${href}`;

      if (self.image) {
        await s3.putObject({
          ...objectRefs(s3Href),
          Body: Buffer.from(self.image),
          ContentType:  ImageFormatMimeTypes.get(makeEncoder().options.imageFormat as ImageFormat) as string
        }).promise();
        self.image = Buffer.from(`${process.env.USER_IMAGES_PUBLIC_URI}${href}`);

        const entityId = await (RPCProxy as any).copyLocationToNewIPFSEntity({
          href: s3Href,
          driver: 'S3Driver'
        }, true);

        const entity = await RPCProxy.findEntity({ id: entityId });

        self.imageUrl = entity.source.href.replace('ipfs://ipfs', 'ipfs://');
      } else {
        await s3.deleteObject({
          ...objectRefs(s3Href)
        }).promise();
        self.image = void (0);
      }
    }
    const fields = [
      'adminKey',
      // 'tokenType',
      // 'supplyType',
      'kycKey',
      'freezeKey',
      'wipeKey',
      'supplyKey',
      'feeScheduleKey'
    ]
    for (const field of fields) {
      if (!self[field]) {
        self[field] = await generateCryptoKeyPair();
        await self[field].save();
      }
    }
  } catch (err) {
    debugger
    throw err;
  }
}

NFTSchema.pre<INFT&Document>('save' as any, nftSave);

NFTSchema.methods.getHIP10Metadata = async function (): Promise<HIP10Metadata> {
  const href = `/nft/${this._id.toString()}`;
  let meta: HIP10Metadata = {
    description: this.description,
    name: this.name,
    localization: this.localization,
    image: this.imageUrl || `${process.env.USER_IMAGES_S3_URI}${href}`
  };
  return meta;
}

  NFTSchema.methods.cryptoSyncRoyalties = async function (): Promise<void> {
  if (!this.tokenId) {
    throw new CannotInteractWithTokenNotCreatedError(this.id);
  }

  const queue = CryptoQueue.createCryptoQueue(
    'crypto:syncRoyalties',
    async (job: Job) => {
      let  {
        id
      }: {
        id: string
      } = job.data;

      const tokenDoc: IToken&Document = await Token.findById(id).populate('supplyKey treasury').exec();

      if (!tokenDoc)
        throw new TokenNotFoundError(id);

      if (!tokenDoc.tokenId) {
        throw new CannotInteractWithTokenNotCreatedError(tokenDoc.id);
      }

      if (!tokenDoc.feeScheduleKey) {
        throw new MissingKeyError(tokenDoc.id, 'feeScheduleKey');
      }

      const masterAccount = await getCryptoAccountByKeyName('cryptoMaster');
      const client = await masterAccount.createClient();

      let transaction = new TokenFeeScheduleUpdateTransaction();

      transaction
        .setTokenId(TokenId.fromBytes(tokenDoc.tokenId))

      if (tokenDoc.customFees) {
        const cryptoFees = await Promise.all(tokenDoc.customFees.map(f => f.toCryptoValue()));
        transaction = transaction.setCustomFees(cryptoFees);
      }

      transaction
        .freezeWith(client);

      const signTx = await transaction.sign(await tokenDoc.feeScheduleKey?.toCryptoValue() as PrivateKey);

      const txResponse = await signTx.execute(client);
      return txResponse.transactionId;
    },
    async (job: Job, getReceipt: TransactionReceipt) => {
      let  {
        id
      }: {
        id: string
      } = job.data;

      const tokenDoc = await Token.findById(id).populate('treasury').exec();

      if (!tokenDoc)
        throw new TokenNotFoundError(id);

      console.debug(`✅ synced royalties for ${tokenDoc.symbol}`);
    }
  );

  await queue.addJob('beforeConfirm', {
    id: this._id.toString()
  }, true);
}


NFTSchema.methods.cryptoMintToken = async function (
  metadatas?: HIP10Metadata[]
): Promise<void> {
  if (!this.tokenId) {
    throw new CannotInteractWithTokenNotCreatedError(this.id);
  }

  let buffers = ([] as any[]).concat(metadatas || [] as any[]).map((m) => {
    if (Buffer.isBuffer(m)) return m;
    else return Buffer.from(JSON.stringify(m), 'utf8');
  })
  return Token.schema.methods.cryptoMintToken.call(this, 1, buffers);
}

export const nftPubFields = [
  '_id',
  'name',
  'description',
  'tags',
  'tokenId',
  'tokenIdStr',
  'maxSupply',
  'tokenIdHederaFormatStr',
  'minted',
  'priceStart',
  'priceBuyNow',
  'sellerId',
  'sellerInfo',
  'supply',
  'public',
  'minted',
  'customFees',
  'supplyType',
  'metadataUrl',
  'nftFor',
  'symbol',
  'imageUrl'
]

export const nftPrivFields = [
  ...nftPubFields,
  'image',
  'listOn',
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
      // maxSupply: 1,
      nftFor: form.nftFor,
      customFees: form.customFees,
      userId: user._id,
      sellerInfo: {
        id: form.sellerId
      },
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
          // @ts-ignore
         item.image = Buffer.from(item.image as Buffer).toString('utf8');

         return item;
        }
      }
    ],
    ...ToNFTPojo.DEFAULT_TO_POJO_OPTIONS
  });
  let o: any = {
    image: `${process.env.USER_IMAGES_PUBLIC_URI}/nft/${pojo._id.toString()}`,
    _id: pojo._id.toString(),
    name: pojo.name,
    symbol: pojo.symbol,
    tags: pojo.tags,
    maxSupply: pojo.maxSupply,
    minted: pojo.minted,
    priceStart: pojo.priceStart,
    priceBuyNow: pojo.priceBuyNow,
    public: pojo.public as boolean,
    sellerInfo: pojo.sellerInfo as { firstName: string, lastName: string, image:Buffer }
  };

  // @ts-ignore
  for (let k in o) {
    if (typeof(o[k]) === 'undefined') {
      delete o[k];
    }
  }


  return o;
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
  try {
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

    // try {
    // Execute the request



    const nft = await NFT.findById(new ObjectId(id)).exec();

    for (const patch of patches) {

      if (patch.path === '/image')
        patch.value = Buffer.from(patch.value);
      _.set(nft, patch.path.substr(1).replace(/\//g, '.'), patch.value);
    }

    await nftSave.call(nft);
    await nft.save();

    // } catch (err) {
    //   debugger;
    // }
  } catch (err: any) {
    // debugger
    throw err;
  }
}

export async function marketplaceCreateAndMintNFT(nft: INFT&Document, supply: number, updateRoyalties?: boolean) {
  try {

    const { RPCProxy } = atticService();
    // nft = NFT.hydrate(nft);
    // debugger
    // Create the token if we haven't already
    if (!nft.tokenId) {
      await NFTSchema.methods.cryptoCreateToken.call(nft, 0);
    }
    // Sync royalties if we need to
    else if (updateRoyalties) {
      await NFTSchema.methods.cryptoSyncRoyalties.call(nft);
    }

    const meta: Buffer = Buffer.from(JSON.stringify(await NFTSchema.methods.getHIP10Metadata.call(nft)), 'utf8');

    const href = `/nft/${nft._id.toString()}.json`;
    const s3Href = `${process.env.METADATA_S3_URI}${href}`;

    await s3.putObject({
      ...objectRefs(s3Href),
      Body: meta,
      ContentType: 'application/json'
    }).promise();

    const entityId = await (RPCProxy as any).copyLocationToNewIPFSEntity({
      href: s3Href,
      driver: 'S3Driver'
    }, true);

    const entity = await RPCProxy.findEntity({ id: entityId });
    const ipfsUrl = entity.source.href.replace('ipfs://ipfs', 'ipfs://');

    await Token.collection.updateOne({
      _id: nft._id
    }, {
      $set: {
        metadataUrl: ipfsUrl,
        updatedAt: new Date()
      }
    });

    for (let i = 0; i < supply; i++)
      await NFTSchema.methods.cryptoMintToken.call(nft, [Buffer.from( ipfsUrl, 'utf8' )]);
  } catch (err: any) {
    debugger
    throw err;
  }
}

