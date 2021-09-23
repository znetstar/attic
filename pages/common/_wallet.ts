import {ObjectId} from "mongodb";
import {Schema} from "mongoose";
import mongoose from "./_database";
import {INFTData} from "./_ntf-collection";

export  interface IDestination {
  userId: ObjectId|string;
  _id: ObjectId;
  // walletId?: ObjectId|string;
}

export interface IRoyalty {
  _id: ObjectId;
  owedTo: IDestination;
  percent: number;
}

export const Destination: Schema<IDestination> = (new (mongoose.Schema)({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }
  // walletId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Wallet' }
}));

export const Royalty: Schema<IRoyalty> = (new (mongoose.Schema)({
  owedTo: Destination,
  percent: {
    type: Number,
    required: true,
    validate: (x: unknown) => typeof(x) === 'number' && !Number.isNaN(x) && (x >= 0 || x <= 1)
  }
}));
