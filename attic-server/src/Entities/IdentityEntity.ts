import Location, {ILocation, LocationSchema} from '../Location';
import { IEntity, default as Entity } from '../Entity';
import { Mongoose, Schema, Document } from 'mongoose';
import config from '../Config';
import mongoose from '../Database';
import { ObjectId } from 'mongodb';
import {IClientModel} from "../Auth/Client";
import {IUserModel} from "../User";
import {IIdentityEntity as IIdentityEntityBase} from "@znetstar/attic-common/lib/IIdentity";
import {IHTTPResourceEntity, IHTTPResourceEntityModel} from "./HTTPResourceEntity";
import {CacheItemSchema} from "../CacheItem";

export interface IIdentityEntityModel {
    _id: ObjectId;
    id: ObjectId;
    client: IClientModel;
    user: IUserModel;
    externalId: any;
    otherFields: any;
    clientName: string;
}

export type IIdentityEntity = IIdentityEntityBase&IHTTPResourceEntity;

export const IdentityEntitySchema = <Schema<IEntity&IIdentityEntityModel>>(new (mongoose.Schema)({
    headers: {
        type: Map,
        required: false
    },
    body: {
        type: Buffer,
        required: false
    },
    method: {
        type: String,
        required: false
    },
    status: {
        type: Number,
        required: false
    },
    client: { ref: 'Client', type: Schema.Types.ObjectId },
    clientName: { type: String, required: true },
    user: { ref: 'User', type: Schema.Types.ObjectId },
    firstName: {
        type: String,
        required: false
    },
    lastName: {
        type: String,
        required: false
    },
    phone: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: false
    },
    externalId: {
        type: Schema.Types.Mixed,
        required: true
    },
    otherFields:  {
        type: Schema.Types.Mixed,
        required: false
    }

}))

IdentityEntitySchema.index({
    externalId: 1,
    type: 1
}, {
    unique: true
});

export const IdentityEntity = Entity.discriminator('IdentityEntity', IdentityEntitySchema)
export default IdentityEntity;