import { Stream } from 'stream';
import { Mongoose, Schema, Document } from 'mongoose';
import config from './Config';
import mongoose from './Database';
import { ObjectId } from 'mongodb';
import { ICredentials as ICredentialsBase } from 'attic-common/src/index';
import {parseUUIDQueryMiddleware} from "./misc";
import {EntitySchema} from "./Entity";

export interface ICredentialsModel {
    id: ObjectId;
    _id: ObjectId;
    type: string;
}

export type ICredentials = ICredentialsModel&ICredentialsBase;

export const CredentialsSchema = <Schema<ICredentials>>(new (mongoose.Schema)({

    type: {
        type: String,
        required: true
    }
}, {
    discriminatorKey: 'type'
}))


CredentialsSchema.pre([ 'find', 'findOne' ] as any, parseUUIDQueryMiddleware);


const Credentials = mongoose.model<ICredentials&Document>('Credentials', CredentialsSchema);
export default Credentials;