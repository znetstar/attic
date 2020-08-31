import {Express, Router} from 'express';
import {asyncMiddleware} from "./Common";
import {RootResolverSchema} from "../Resolvers/RootResolver";
import {ILocation} from "../Location";
import {IDriverFull,IDriverOfFull} from "../Driver";
import {IHTTPResponse} from "../Drivers/HTTPCommon";
import Constructible from "../Constructible";
import {resolve} from "../Resolver";
import * as _ from 'lodash';
import Config from "../Config";
import User, {IUser} from "../User";
import * as passport from 'passport';
import {Document} from "mongoose";
import ApplicationContext from "../ApplicationContext";
import BasicUser from "../Users/BasicUser";



export const AuthMiddleware = Router();

export function initalizePassport(app: Express) {
    app.use(passport.initialize());
    app.use(passport.session());
    passport.serializeUser(function (user: IUser, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function (userId: string, done) {
        User.findById(userId)
            .then((u: IUser&Document) => done(null, u))
            .catch(done);
    });

    ApplicationContext.emit('Web.AuthMiddleware.configurePassport', passport);
}

AuthMiddleware.get('/auth/logout', function (req: any, res: any) {
    req.session.destory();
    res.sendStatus(204);
});


export const AuthMiddlewares = new Map<string, any>();


export default AuthMiddlewares;