import { Stream } from 'stream';
import { Mongoose, Schema, Document } from 'mongoose';
import config from './Config';
import mongoose from './Database';
import * as MUUID from 'uuid-mongodb';
import { ICredentials as ICredentialsBase } from 'attic-common/src/index';
import {parseUUIDQueryMiddleware} from "./misc";
import {EntitySchema} from "./Entity";

export interface ICredentialsModel {
    id: MUUID.MUUID;
    _id: MUUID.MUUID;
    type: string;
}

export type ICredentials = ICredentialsModel&ICredentialsBase;

export const CredentialsSchema = <Schema<ICredentials>>(new (mongoose.Schema)({
    _id: {
        type: 'object',
        value: { type: 'Buffer' },
        default: () => MUUID.v1(),
    },
    type: {
        type: String,
        required: true
    }
}, {
    discriminatorKey: 'type'
}))

CredentialsSchema.virtual('id')
    .get(function() {
        return MUUID.from(this._id).toString();
    })
    .set(function(val: string|MUUID.MUUID) {
        this._id = MUUID.from(val);
    });

CredentialsSchema.pre([ 'find', 'findOne' ] as any, parseUUIDQueryMiddleware);


const Credentials = mongoose.model<ICredentials&Document>('Credentials', CredentialsSchema);
export default Credentials;