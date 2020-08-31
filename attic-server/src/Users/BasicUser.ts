import { Mongoose, Schema, Document } from 'mongoose';
import { ObjectId } from 'mongodb';
import * as bcrypt from 'bcrypt';
import User, {IUser} from "../User";
import mongoose from '../Database';
import Config from "../Config";
import {moveAndConvertValue} from "../misc";
import RPCServer from "../RPC";
import {BasicFindOptions, BasicFindQueryOptions} from "attic-common/lib/IRPC";
import AuthMiddleware from "../Web/AuthMiddleware";
import {asyncMiddleware} from "../Web/Common";
import * as passport from 'passport';
import { BasicStrategy} from 'passport-http';
import ApplicationContext from "../ApplicationContext";


export interface IBasicUserModel {
    username: string;
    password: string;
    authenticateUser(password: string): Promise<boolean>;
    type: string;
}

export type IBasicUser = IUser&IBasicUserModel;

export const BasicUserSchema = <Schema<IBasicUser>>(new (mongoose.Schema)({
    password: {
        type: String,
        required: true
    }
}));

BasicUserSchema.pre([
    'save',
    'create'
] as any, async function() {
    let self: any = this;

    if (self.isNew && self.password) {
        const hash = await bcrypt.hash(self.password, Config.saltRounds);
        self.password = hash;
    }
});

BasicUserSchema.methods.authenticateUser = async function (password: string): Promise<boolean> {
    let  self: any =  this;
    return !self.disabled && await bcrypt.compare(password, self.password);
}

ApplicationContext.on('Web.AuthMiddleware.configurePassport', (passport: any) => {
    passport.use(new BasicStrategy(
        function (username: string, password: string, done: any) {
            (async () => {
                const user: IBasicUser&IUser&Document = (await User.findOne({ username: username }).exec()) as any;
                if (!user) {
                    return [ false ];
                }
                if (!(await user.authenticateUser(password))) {
                    return [ false ];
                }
                return [ user ];
            })().then((r: any) => done(null, ...r)).catch(done);
        }
    ));
})

ApplicationContext.on('Web.AuthMiddleware.loadAuthMiddleware', (auths: Map<string, any>) => {
    auths.set('BasicUser', passport.authenticate('basic'));
});

const BasicUser = User.discriminator('BasicUser', BasicUserSchema);
export default BasicUser;