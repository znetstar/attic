import * as express from 'express';
import * as session from 'express-session';
const MongoDBStoreBase = require('connect-mongodb-session');
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import Config from "../Config";
import * as cookieParser from "cookie-parser";
import {WebExpress} from "./WebServer";
const MongoDBExpressSessionStore = MongoDBStoreBase(session);

if (!Config.expressSessionSecret) {
    try {
        let generatedSecret = crypto.randomBytes(Config.expressSessionSecretSize).toString('base64');
        fs.appendFileSync(path.join(__dirname, '..', '..', '.env'), `EXPRESS_SESSION_SECRET=${generatedSecret}\n`);
        Config.set('expressSessionSecret', generatedSecret);
    } catch (err) {
        console.error(`could not save a unique key for the expression secret to .env`);
    }
}

export const ExpressSessionStore = new MongoDBExpressSessionStore({
    uri: Config.mongoUri,
    collection: 'sessions',
    connectionOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
});

export const SessionMiddleware = session({
    cookie: {
        maxAge: Config.expressSessionMaxAge
    },
    secret: Config.expressSessionSecret,
    store: ExpressSessionStore,
    resave: true,
    saveUninitialized: true
});

export const CookieMiddleware = cookieParser(Config.expressSessionSecret);

export default SessionMiddleware;