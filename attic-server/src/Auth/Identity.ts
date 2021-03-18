
import { Mongoose, Schema, Document } from 'mongoose';
import mongoose from '../Database';
import { ObjectId } from 'mongodb';
import Config from "../Config";
import IIdentityBase  from "@znetstar/attic-common/lib/IIdentity";
import config from "../Config";
import {moveAndConvertValue, parseUUIDQueryMiddleware} from "../misc";
import * as _ from 'lodash';
import RPCServer from "../RPC";

export interface IIdentityModel {
    id: ObjectId;
    _id: ObjectId;
}

export type IIdentity = IIdentityBase&IIdentityModel;

export const IdentitySchema = <Schema<IIdentity>>(new (mongoose.Schema)({
    provider: {
        ref: 'Client',
        type: Schema.Types.ObjectId,
        required: true
    },
    displayName: { type: String, required: false },
    name: {
        familyName: String,
        givenName: String,
        middleName: String
    },
    emails: { type: [ { value: String, type: String } ] },
    photos: [ { value: String } ]
}, {
    collection: 'identities',
    timestamps: true
}));


const Identity = mongoose.model<IIdentity&Document>('Identity', IdentitySchema);
export default Identity;