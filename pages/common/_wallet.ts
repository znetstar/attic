import {ObjectId} from "mongodb";
import {Schema} from "mongoose";
import mongoose from "./_database";
import {INFT} from "./_nft";

export  interface IDestination {
  userId: ObjectId|string;
  _id: ObjectId;
  // walletId?: ObjectId|string;
}

export interface IRoyalty {
  _id: ObjectId;
  owedTo: string;
  percent: number;
}

// export const Destination: Schema<IDestination> = (new (mongoose.Schema)({
//   userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }
//   // walletId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Wallet' }
// }));

export const Royalty: Schema<IRoyalty> = (new (mongoose.Schema)({
  owedTo: String,
  percent: {
    type: Number,
    required: true,
    validate: (x: unknown) => typeof(x) === 'number' && !Number.isNaN(x) && (x >= 0 || x <= 1)
  }
}));
