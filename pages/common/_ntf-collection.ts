import mongoose from './_database';
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
  nftFor: string;

  royalties: Royalty;

  /**
   * Author of the item
   */
  userId: string;
}

interface Royalty {
  owedTo: string;
  percent: number;
}

export const NftDataSchema: Schema<INFTData> = (new (mongoose.Schema)({
  title: { type: String, required: true },
  description: { type: String, required: false },
  tags: { type: [String], required: false },
  supply: { type: Number, required: true, min:[1, 'Should be atleast 1 item'] },
  nftFor: {type: String, required: true, enum: { values: ['sale', 'auction'], message: '{VALUE} is not supported!! Should be either sale or auction'}},
  royalties: {owedTo: { type: String, required: true},
              percent: { type: Number, required: true, min:[0, "Royalty can't be less than 0%"], max: [100, "Royalty can't be more than 100%"]}
              },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'User' },
  nftItem: { type: Buffer, required: true }
}));

export const NFT = mongoose.models.NFT || mongoose.model<INFTData>('NFT', NftDataSchema);
const nftInterface = new SimpleModelInterface<INFTData>(new ModelInterface<INFTData>(NFT));

/**
 * Creates a new nft document using the provided fields in the marketplace database,
 * @param form Fields for the new ntf document
 */
export async function marketplaceCreateNft (form: INFTData) {
  try {
    const marketplaceNft = await NFT.create({
      title: form.title,
      description: form.description,
      tags: form.tags,
      supply: form.supply,
      nftFor: form.nftFor,
      royalties: form.royalties,
      userId: form.userId,
      nftItem: form.nftItem
    });

    await marketplaceNft.save();
  } catch (err:any) {
    throw new HTTPError(500, (
      _.get(err, 'data.message') || _.get(err, 'innerError.message') || err.message || err.toString()
    ));
  }
}

(rpcServer as any).methodHost.set('marketplace:createNft', marketplaceCreateNft);
