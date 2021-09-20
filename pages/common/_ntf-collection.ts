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
  nft_item: Buffer;

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
  Owed_to : string;
  percent: number;
}

export const NftDataSchema: Schema<INFTData> = (new (mongoose.Schema)({
  title: { type: String, required: true },
  description: { type: String, required: false },
  tags: { type: Array, required: false },
  supply: { type: Number, required: true },
  nftFor: {type: String, required: true},
  royalties: {Owed_to: { type: String, required: true},
              percent: { type: Number, required: true}
              },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'User' },
  nft_item: { type: Buffer, required: true }
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
      nft_item: form.nft_item
    });

    await marketplaceNft.save();
  } catch (err) {
    throw new HTTPError(500, (
      _.get(err, 'data.message') || _.get(err, 'innerError.message') || err.message || err.toString()
    ));
  }
}

(rpcServer as any).methodHost.set('marketplace:createNft', marketplaceCreateNft);
