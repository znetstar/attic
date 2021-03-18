import {Document, Schema} from 'mongoose';
import mongoose from './Database';
import {ObjectId} from 'mongodb';
import config from "./Config";
import {default as IUserBase, IGetTokenResponse as IGetTokenResponseBase } from '@znetstar/attic-common/lib/IUser';
import RPCServer from "./RPC";
import {BasicFindOptions, BasicFindQueryOptions, BasicTextSearchOptions} from "@znetstar/attic-common/lib/IRPC";
import {Chance} from 'chance';
import * as _ from 'lodash';
import {IIdentityModel} from "./Auth/Identity";
import ApplicationContext from "./ApplicationContext";
import AccessToken, {AccessTokenSchema, IAccessToken} from "./Auth/AccessToken";
import {TokenTypes} from "@znetstar/attic-common/lib/IAccessToken";
import {nanoid} from 'nanoid';
import {SERVICE_CLIENT} from "./Auth/Client";

const Sentencer = require('sentencer');

interface IRegexQuery {
    $regex: string,
    $options?: string
}

export interface IUserModel {
    id: ObjectId;
    _id: ObjectId;
    scope?: (string)[];
    identities?:(IIdentityModel)[];
    username: string;
    isAuthorizedToDo(scope: string|string[]): boolean;
    getToken(scope: string|string[]): AsyncGenerator<IGetTokenResponse>;
}

export type IUser = IUserBase&IUserModel;

export const UserSchema = <Schema<IUser>>(new (mongoose.Schema)({
    identities: [
        { ref: 'Identity', type: Schema.Types.ObjectId }
    ],
    scope: {
        type: [String],
        default: () =>  config.get('unauthorizedScopes').slice(0)
    },
    username: {
        type: String,
        unique: true,
        required: true
    },
    disabled: {
        type: Boolean,
        default: false
    }
}, {
    collection: 'users',
    timestamps: true
}));

export interface IGetTokenResponseModel {
    token: IAccessToken & Document | null;
    scope: string;
}

export type IGetTokenResponse = IGetTokenResponseBase&IGetTokenResponseModel;


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



UserSchema.methods.getToken = async function* (scope: string[]|string): AsyncGenerator<IGetTokenResponse> {
    let nonImplicitScopes: string[] = [];
    scope = [].concat(scope);
    let testScope: string;
    let doneScopes = new Set();
    while (testScope = scope.shift()) {
        if (doneScopes.has(testScope)) continue;
        if (this.isAuthorizedToDo(testScope)) {
            doneScopes.add(testScope);
            yield {
                scope: testScope,
                token: new AccessToken({
                    tokenType: 'bearer',
                    token: nanoid(),
                    scope: [].concat(testScope),
                    user: this.user,
                    client: new ObjectId(),
                    clientRole: 'consumer',
                    clientName: SERVICE_CLIENT
                })
            }
        } else {
            nonImplicitScopes.push(testScope);
        }
    }

    if (!nonImplicitScopes.length) return;

    scope = nonImplicitScopes;

    let pipeline = AccessToken.aggregate();

    pipeline.match({
        user: this._id
    });

    pipeline.sort({
        expiresAt: -1
    });

    pipeline.addFields({
        scopeQuery: [].concat(scope)
    });

    pipeline.unwind('scopeQuery');
    pipeline.unwind('scope');

    pipeline.addFields({
        scopeMatch: {
            $regexMatch: {
                input: '$scope',
                regex: '$scopeQuery'
            }
        }
    });

    pipeline.group({
        _id: '$_id',
        scope: { $addToSet: '$scope' },
        doc: { $max: '$$ROOT' }
    });

    pipeline.replaceRoot({
            $mergeObjects: [
                '$doc',
                '$$ROOT'
            ]
    });

    pipeline.project({
        doc: 0
    });

    let doc: IAccessToken&Document&{ scopeQuery: string, scopeMatch: boolean };
    let cur =  pipeline.cursor({ batchSize: 500 }).exec();

    // @ts-ignore
    require('fs').writeFileSync('/tmp/x.json', JSON.stringify(pipeline._pipeline,null ,4))
    while (doc = await cur.next()) {
        if (doc && doneScopes.has(doc.scopeQuery))
            continue;
        doneScopes.add(doc.scopeQuery);
        if (!doc || !doc.scopeMatch) {
            yield { token: null, scope: doc.scopeQuery }
            continue;
        }
        if (doc.tokenType === TokenTypes.RefreshToken) {
            let child = await AccessTokenSchema.methods.accessTokenFromRefresh.call(doc);
            yield { token: child, scope: doc.scopeQuery };
            continue;
        }
        yield { token: doc, scope: doc.scopeQuery };
    }
}

UserSchema.methods.isAuthorizedToDo = function (scope: string|string[]) {
    let regexes = this.scope.map((x: string) => {
        return new RegExp(x);
    })

    for (let regex of regexes) {
        if ([].concat(scope).map(x => regex.test(x)).includes(true)) return true;
    }

    return false;
};


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

export const UNAUTHROIZED_USERNAME = 'unauthorized';

ApplicationContext.once('loadModels.complete', () => {
    return User.updateOne({ username: UNAUTHROIZED_USERNAME }, {
        $setOnInsert: {
            username: UNAUTHROIZED_USERNAME,
        },
        $set: ({
            scope: config.get('unauthorizedScopes')
        } as any)
    }, { upsert: true });
});

User.collection.createIndex({
    expiresAt: 1
}, {
    expireAfterSeconds: 0
});


export default User;