import {Express, RequestHandler, Router} from 'express';
import config from "../Config";
import User, {IUser, UNAUTHROIZED_USERNAME} from "../User";
import {Document} from "mongoose";
import mongoose, {redis} from "../Database";
import RPCServer from "../RPC";
import Client, {IClient} from "../Auth/Client";
import {nanoid} from 'nanoid';
import fetch from 'node-fetch';
import * as URL from 'url';
import {
    AccessToken,
    FormalAccessToken,
    fromFormalToken,
    IAccessToken,
    IScopeContext,
    toFormalToken
} from "../Auth/AccessToken";
import {IClientRole} from "@znetstar/attic-common/lib/IClient";
import * as _ from 'lodash';
import {TokenTypes} from "@znetstar/attic-common/lib/IAccessToken";
import {
    CouldNotFindTokenForScopeError,
    CouldNotLocateStateError,
    ErrorGettingTokenFromProviderError,
    InvalidClientOrProviderError,
    InvalidResponseTypeError,
    MalformattedTokenRequestError, ProviderDoesNotAllowRegistrationError
} from "../../../attic-common/src/Error/AccessToken";
import {asyncMiddleware} from "./Common";
import GenericError from "../../../attic-common/src/Error/GenericError";
import {CouldNotLocateUserError} from "../../../attic-common/src/Error/Auth";

export const AuthMiddleware = Router();

export const StaticScopes = new Set(...Object.keys(RPCServer.methods).map(str => `rpc.${str}`));
export function registerStaticScope(scope: string) { StaticScopes.add(scope); }

export function initalizePassport(app: Express) {
    // app.use(passport.initialize());
    // app.use(passport.session());
    // passport.serializeUser(function (user: IUser, done) {
    //     done(null, user.id);
    // });
    //
    // passport.deserializeUser(function (userId: string, done) {
    //     User.findById(userId)
    //         .then((u: IUser&Document) => done(null, u))
    //         .catch(done);
    // });
    //
    // ApplicationContext.emit('Web.AuthMiddleware.configurePassport', passport);
}

let unauthorizedUser: IUser;

AuthMiddleware.use((req: any, res, next) => {
     req.scopeContext = { } as IScopeContext;
     next();
})

export function restrictScopeMiddleware(scope: string): RequestHandler {
    return function (req: any, res: any, next: any) {
        (async () => {
            if (!req.user) {
                throw new CouldNotLocateUserError();
            } else {
                const context = req.scopeContext as IScopeContext;
                let user: IUser = context.user = req.user;
                context.currentScopeAccessToken = await (await user.getToken(scope)).next();
                if (!req.scopeContext.currentScopeAccessToken) {
                    throw new CouldNotFindTokenForScopeError({ scope, token: null });
                }
            }
        })().then(() => next()).catch(err => next(err));
    }
}

function restrictOauth(fn: string) {
    return function (req: any, res: any, next: any) {
        return restrictScopeMiddleware(`auth.${req.params.provider}.${fn}`)(req ,res, next);
    }
}

AuthMiddleware.use(asyncMiddleware(async function (req: any, res: any, next: any) {
    const context = req.scopeContext as IScopeContext;
    if (req.headers.authorization) {
        let [tokenType, tokenStr] = req.headers.authorization.split(' ');
        tokenType = tokenType.toLowerCase();

        let token = context.accessToken = await mongoose.models.AccessToken.findOne( { tokenType, token: tokenStr } ).exec();
        if (token) {
                req.user = context.user = await mongoose.models.User.findById(token.user);
            }
        }

    if (!req.user) {
        req.user = context.user = unauthorizedUser = req.user || unauthorizedUser || await mongoose.models.User.findOne({ username: UNAUTHROIZED_USERNAME }).exec();
        context.accessToken = { scope: req.user.scope.slice(0) };
    }

    return true;
}));

AuthMiddleware.post('/auth/token', require('body-parser').urlencoded({ type: 'application/x-www-form-urlencoded' }), require('body-parser').json({ type: 'application/json' }),restrictScopeMiddleware('auth.token'), asyncMiddleware(async function (req: any, res: any, next: any) {
      const context = req.scopeContext as IScopeContext;
      let getField = (f: string) => _.get(req.query, f) || _.get(req.body, f) || null;
      let grantType = getField('grant_type');
        let clientId = getField('client_id');
        let clientSecret = getField('client_secret');
        let redirectUri = getField('redirect_uri');
        let originalState = getField('state');
        let code = [].concat(getField('code'))[0];
        let refreshTokenCode = getField('refresh_token');

      if (!grantType || !clientId || !clientSecret || !redirectUri || !(code || refreshTokenCode)) {
          throw new MalformattedTokenRequestError();
      }

      let client = await Client.findOne({
          clientId,
          clientSecret,
          redirectUri,
          role: 'consumer'
      }).exec();

      if (!client) {
          throw new InvalidClientOrProviderError();
      }

      let accessToken: IAccessToken&Document,
          refreshToken: IAccessToken&Document;
        if (grantType === 'authorization_code') {
            let stateKey = `auth.token.${code}`;
            let state = await redis.hgetall(stateKey);
            if (!Object.keys(state).length || !state) {
                throw new CouldNotLocateStateError();
            }
            await redis.del(stateKey);

            if (state.client !== client.id || client.redirectUri !== redirectUri) {
                throw new InvalidClientOrProviderError();
                return ;
            }

            let scopes = [].concat((getField('scope') || '').split(' '))

            accessToken = new AccessToken({
                tokenType: 'bearer',
                token: nanoid(),
                expiresAt: (new Date()).getTime() + config.expireTokenIn,
                scope: scopes,
                client: client._id,
                clientRole:  IClientRole.consumer,
                clientName: client.name,
                redirectUri: client.redirectUri,
                user: req.user
            })

            refreshToken = new AccessToken({
                tokenType: 'refresh_token',
                token: nanoid(),
                linkedToken: accessToken._id,
                scope: scopes,
                client: client._id,
                clientRole: IClientRole.consumer,
                clientName: client.name,
                redirectUri: client.redirectUri,
                user: req.user
            });

            accessToken.linkedToken = refreshToken._id;
        } else if (grantType === 'refresh_token') {
            accessToken = (await AccessToken.findOne({
                tokenType: TokenTypes.RefreshToken,
                client: client._id,
                clientRole: IClientRole.consumer,
                token: refreshTokenCode
            }));

        }

        if (!accessToken) {
            throw new GenericError(`An unknown error occurred, please try again`, 0, 500);
            return;
        }

        await accessToken.save();
        if (refreshToken)
            await refreshToken.save();

        let formalToken = await toFormalToken(accessToken);
        res.status(200).send(formalToken);
}));

AuthMiddleware.get('/auth/:provider/authorize', restrictOauth('authorize'), asyncMiddleware(async function (req: any, res: any, next: any) {
    let state: string;
    let originalState: string;
    if (req.query.code && req.query.state)
        state = [].concat(req.query.state)[0];
    else if (req.query.state) {
        originalState = req.query.state;
        req.query.state = void(0);
    }

    if (!req.query.state) {
        state = nanoid();
    }

    let stateKeyBase = `auth.${req.params.provider}.authorize.`;
    let stateKey = stateKeyBase+state;

    if (
        req.query.code
    ) {
        let existingState: any = req.query.state && await redis.hgetall(stateKey);

        if (typeof(existingState) === 'object' && existingState !== null && !Object.keys(existingState).length)
            existingState = void(0);

        if (!existingState) {
            if (req.query.response_type !== 'code') {
                throw new InvalidResponseTypeError();
            } else {
                throw new CouldNotLocateStateError();
            }
        } else {
            await redis.del(stateKey);
            let [ client, provider ]: [ IClient&Document, IClient&Document ] = await Promise.all([
                Client.findById(existingState.client).exec(),
                Client.findById(existingState.provider).exec()
            ]);

            if (!client || !provider) {
                throw new InvalidClientOrProviderError();
                return;
            }

            let q = {
                grant_type: 'authorization_code',
                code: req.query.code,
                redirect_uri: existingState.redirectUri,
                client_id: provider.clientId,
                client_secret: provider.clientSecret
            }

            let tokenUri: any = URL.parse(provider.tokenUri, true);
            tokenUri.query = q;
            tokenUri = URL.format(tokenUri);

            const params = new URL.URLSearchParams();

            for (let k in q) params.append(k, (q as any)[k]);

            let tokenResp = await fetch(tokenUri, {
                method: 'POST',
                body: params
            });

            if (tokenResp.status !== 200) {
                throw new ErrorGettingTokenFromProviderError(await tokenResp.json());
            }

             let user = await User.findById(existingState.user).exec();
            if (existingState.username === UNAUTHROIZED_USERNAME) {
                if (provider.role.includes(IClientRole.registration)) {
                    user = new User({
                        username: nanoid(),
                        scope: [
                            ...config.get('unauthorizedScopes').slice(0),
                            'identity.self'
                        ]
                    });

                    await user.save();
                } else {
                    throw new ProviderDoesNotAllowRegistrationError();
                }
            }

            let formalToken: FormalAccessToken = await tokenResp.json();

            let { refreshToken, accessToken } = await fromFormalToken(formalToken, user, provider, IClientRole.provider);
            accessToken.save();
            if (refreshToken) refreshToken.save();

            let authCode = nanoid();
            stateKey = `auth.token.${authCode}`;
            let pipeline = redis.pipeline();

            for (let k in existingState) {
                pipeline.hset(stateKey, k, (existingState as any)[k]);
            }

            pipeline.pexpire(stateKey, config.authorizeGracePeriod);
            await pipeline.exec();

            let finalUri = URL.parse(client.redirectUri, true);
            finalUri.query = {
                code: authCode,
                state: existingState.originalState
            }

            let finalUriFormatted = URL.format(finalUri);

            res.redirect(finalUriFormatted);
            return;
        }
    } else {
        if (req.query.response_type !== 'code') {
            throw new InvalidResponseTypeError();
        }

        let provider = await Client.findOne({
            name: req.params.provider,
            role: 'provider'
        }).exec();

        if (!provider) {
            throw new InvalidClientOrProviderError();
        }

        let client = await Client.findOne({
            clientId: req.query.client_id,
            redirectUri: req.query.redirect_uri,
            role: 'consumer'
        }).exec();

        if (!client) {
            throw new InvalidClientOrProviderError();
        }

        let pipeline = redis.pipeline();

        let newState = {
            client: client.id,
            provider: provider.id,
            user: req.user.id,
            originalState: originalState,
            redirectUri: '',
            username: req.user.username
        };


        let redirectUri = URL.parse(provider.redirectUri || config.siteUri, true);
        redirectUri.path = `/auth/${provider.name}/authorize`;
        redirectUri.query.state = state;
        newState.redirectUri =  URL.format(redirectUri);

        for (let k in newState) {
            pipeline.hset(stateKey, k, (newState as any)[k]);
        }

        pipeline.pexpire(stateKey, config.authorizeGracePeriod);
        await pipeline.exec();


        let finalUri = URL.parse(provider.authorizeUri, true);
        finalUri.query = {
            client_id: provider.clientId,
            client_secret: provider.clientSecret,
            redirect_uri: newState.redirectUri,
            state: state,
            scope: [].concat(client.scope).join(' '),
            response_type: 'code'
        };

        let finalFormatted = URL.format(finalUri);
        res.redirect(finalFormatted);
        return;
    }
}));

AuthMiddleware.get('/auth/logout', function (req: any, res: any) {
    req.session.destory();
    res.sendStatus(204);
});


export const AuthMiddlewares = new Map<string, any>();


export default AuthMiddlewares;