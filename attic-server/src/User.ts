import { Mongoose, Schema, Document } from 'mongoose';
import mongoose from './Database';
import { ObjectId } from 'mongodb';
import Config from "./Config";
import { default as IUserBase } from 'attic-common/lib/IUser';
import Location, {ILocation, LocationSchema} from "./Location";
import RPCServer from "./RPC";
import {BasicFindOptions, BasicFindQueryOptions, BasicTextSearchOptions} from "attic-common/lib/IRPC";
import {EntitySchema} from "./Entity";
import { Chance } from 'chance';
import * as _ from 'lodash';
const Sentencer = require('sentencer');

export interface IUserModel {
    id: ObjectId;
    _id: ObjectId;
    type: String;
    username: string;
}

export type IUser = IUserBase&IUserModel;

export const UserSchema = <Schema<IUser>>(new (mongoose.Schema)({
    type: {
        type: String,
        enum: Config.userTypes
    },
    expiresAt: {
        type: Date,
        required: false
    },
    disabled: {
        type: Boolean,
        default: false
    },
    username: {
        type: String,
        required: true,
        default: () => generateUsername(),
        unique: true
    }
}, {
    timestamps: true,
    discriminatorKey: 'type'
}));


UserSchema.index({
    "$**": "text"
}, {
    name: 'user_search'
});

let chance = new Chance.Chance();
export function generateUsername() {
    return encodeURIComponent(Sentencer.make(`{{ an_adjective }}-${chance.animal()}`)
                            .toLowerCase()
                            .replace(/\s/ig, '-')
                            .replace(/^a-/, '')
                            .trim());
}

RPCServer.methods.generateUsername = generateUsername;

RPCServer.methods.findUser = async (query: any) => {
    let users = await User.findOne(query).exec();
    return users ? users.toJSON({ virtuals: true }) : void(0);
}

export async function findUserInner(query: BasicFindOptions) {
    let usersQuery = (User.find(query.query));
    if (query.count) {
        const count = await usersQuery.count().exec();
        return count;
    }
    if (query.sort) usersQuery.sort(query.sort);
    if (!Number.isNaN(Number(query.skip))) usersQuery.skip(query.skip);
    if (!Number.isNaN(Number(query.limit))) usersQuery.limit(query.limit);
    let users = await usersQuery.exec();
    return users;
}

RPCServer.methods.findUsers = async (query: BasicFindOptions) =>  {
    let users = await findUserInner(query);
    return Array.isArray(users) ?
        users.map(l => l.toJSON({ virtuals: true })) :
        users;
}

RPCServer.methods.createUser = async (fields: any) => {
    if (!Config.userTypes.includes(fields.type)) {
        throw new Error(`invalid user type "${fields.type}"`);
    }
    let users = await User.create(fields);

    return users.id;
}

RPCServer.methods.deleteUsers = async (query: BasicFindQueryOptions) => {
    let users: Array<IUser & Document> = (await findUserInner(query)) as Array<IUser & Document>;
    for (let res of users) {
        await res.remove();
    }
}

RPCServer.methods.deleteUser = async (query: any) => {
    return RPCServer.methods.deleteUsers({ limit: 1, query });
}

RPCServer.methods.updateUser = async (id: string, fields: any) => {
    let doc = await User.findOne({ _id: new ObjectId(id) });

    _.extend(doc, fields);
    await doc.save();
}

RPCServer.methods.searchUsers = async (query:  BasicTextSearchOptions) => {
    let usersQuery = (User.find({
        $text: {
            $search: query.terms,
            $caseSensitive: true
        }
    }, {
        score: {
            $meta: 'textScore'
        }
    }).sort({ score:{ $meta:"textScore" }} ));
    if (query.count) {
        const count = await usersQuery.count().exec();
        return count;
    }
    if (!Number.isNaN(Number(query.skip))) usersQuery.skip(query.skip);
    if (!Number.isNaN(Number(query.limit))) usersQuery.limit(query.limit);
    let users = await usersQuery.exec();
    return users.map(l => l.toJSON({ virtuals: true }));
}

const User = mongoose.model<IUser&Document>('User', UserSchema);

User.collection.createIndex({
    expiresAt: 1
}, {
    expireAfterSeconds: 0
});


export default User;