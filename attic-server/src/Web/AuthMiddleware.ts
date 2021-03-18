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
import {AccessToken, FormalAccessToken, fromFormalToken, IAccessToken, toFormalToken} from "../Auth/AccessToken";
import {IClientRole} from "@znetstar/attic-common/lib/IClient";
import * as _ from 'lodash';
import {TokenTypes} from "@znetstar/attic-common/lib/IAccessToken";

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

export function restrictScopeMiddleware(scope: string): RequestHandler {
    return function (req: any, res: any, next: any) {
        (async () => {
            if (!req.user) {
                res.status(401).end();
            } else {
                let user: IUser = req.user;
                req.currentScope = scope;
                req.scopeToken = await (await user.getToken(scope)).next();
                if (!req.scopeToken)
                    res.status(403).send();
                else
                    next();
            }
        })().catch(err => next(err))
    }
}

function restrictOauth(fn: string) {
    return function (req: any, res: any, next: any) {
        return restrictScopeMiddleware(`auth.${req.params.provider}.${fn}`)(req ,res, next);
    }
}

AuthMiddleware.use(function (req: any, res: any, next: any) {
    (async () => {
        if (req.headers.authorization) {
            let [tokenType, tokenStr] = req.headers.authorization.split(' ');
            tokenType = tokenType.toLowerCase();

            let token = req.token = await mongoose.models.AccessToken.findOne( { tokenType, token: tokenStr } ).exec();
            if (token) {
                req.user = await mongoose.models.User.findById(token.user);
            }
        }

        if (!req.user) {
            req.user = unauthorizedUser = req.user || unauthorizedUser || await mongoose.models.User.findOne({ username: UNAUTHROIZED_USERNAME }).exec();
            req.token = { scope: req.user.scope.slice(0) };
        }

        return true;
    })().catch((err: Error) => next(err)).then((go) => {
        if (go) next();
    });
});

AuthMiddleware.post('/auth/token', require('body-parser').urlencoded({ type: 'application/x-www-form-urlencoded' }), require('body-parser').json({ type: 'application/json' }),restrictScopeMiddleware('auth.token'), function (req, res, next) {
    (async () => {
      let getField = (f: string) => _.get(req.query, f) || _.get(req.body, f) || null;
      let grantType = getField('grant_type');
        let clientId = getField('client_id');
        let clientSecret = getField('client_secret');
        let redirectUri = getField('redirect_uri');
        let originalState = getField('state');
        let code = [].concat(getField('code'))[0];
        let refreshTokenCode = getField('refresh_token');

      if (!grantType || !clientId || !clientSecret || !redirectUri || !(code || refreshTokenCode)) {
          res.status(400).end();
          return;
      }

      let client = await Client.findOne({
          clientId,
          clientSecret,
          redirectUri,
          role: 'consumer'
      }).exec();

      if (!client) {
          res.status(400).end();

          return;
      }

      let accessToken: IAccessToken&Document,
          refreshToken: IAccessToken&Document;
        if (grantType === 'authorization_code') {
            let stateKey = `auth.token.${code}`;
            let state = await redis.hgetall(stateKey);
            if (!Object.keys(state).length || !state) {
                res.status(403).end();
                return;
            }
            await redis.del(stateKey);

            if (state.client !== client.id || client.redirectUri !== redirectUri) {
                res.status(403);
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
            res.status(403).end();
            return;
        }

        await accessToken.save();
        if (refreshToken)
            await refreshToken.save();

        let formalToken = await toFormalToken(accessToken);
        res.status(200).send(formalToken);
    })().catch((err: Error) => {
        console.error(err.stack);
        next(err);
    }).then((go) => {

    });
})

AuthMiddleware.get('/auth/:provider/authorize', restrictOauth('authorize'), function (req: any, res: any, next: any) {
    (async () => {
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
                    res.status(403).end();
                    return;
                }
            } else {
                await redis.del(stateKey);
                let [ client, provider ]: [ IClient&Document, IClient&Document ] = await Promise.all([
                    Client.findById(existingState.client).exec(),
                    Client.findById(existingState.provider).exec()
                ]);

                if (!client || !provider) {
                    res.status(403).end();
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

                    console.log(await tokenResp.json())
                    res.status(500).end();
                    return;
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
                        res.status(403).end();
                        return;
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
                res.status(400).end();
                return;
            }

            let provider = await Client.findOne({
                name: req.params.provider,
                role: 'provider'
            }).exec();

            if (!provider) {
                res.status(400).end();
                return;
            }

            let client = await Client.findOne({
                clientId: req.query.client_id,
                redirectUri: req.query.redirect_uri,
                role: 'consumer'
            }).exec();

            if (!client) {
                res.status(403).end();
                return;
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
    })().catch((err: Error) => {
        console.error(err.stack);
        next(err);
    }).then((go) => {

    });
});

AuthMiddleware.get('/auth/logout', function (req: any, res: any) {
    req.session.destory();
    res.sendStatus(204);
});


export const AuthMiddlewares = new Map<string, any>();


export default AuthMiddlewares;