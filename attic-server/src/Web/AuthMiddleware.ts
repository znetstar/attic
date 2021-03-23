import {Express, RequestHandler, Router} from 'express';
import config from "../Config";
import User, {generateUsername, isAuthorizedToDo, IUser, UNAUTHROIZED_USERNAME} from "../User";
import {Document} from "mongoose";
import mongoose, {redis} from "../Database";
import RPCServer from "../RPC";
import Client, { getIdentityEntityByAccessToken, IClient} from "../Auth/Client";
import {nanoid} from 'nanoid';
import fetch from 'node-fetch';
import * as URL from 'url';
import {
    AccessToken,
    AccessTokenSchema, checkScopePermission,
    fromFormalToken,
    IAccessToken,
    IFormalAccessToken,
    IScopeContext,
    toFormalToken
} from "../Auth/AccessToken";
import ApplicationContext from "../ApplicationContext";
import {IClientRole} from "@znetstar/attic-common/lib/IClient";
import * as _ from 'lodash';
import {ScopeAccessTokenPair, TokenTypes} from "@znetstar/attic-common/lib/IAccessToken";
import {
    CouldNotFindTokenForScopeError,
    CouldNotLocateStateError,
    ErrorGettingTokenFromProviderError, InvalidAccessTokenError,
    InvalidClientOrProviderError,
    InvalidResponseTypeError,
    MalformattedTokenRequestError, NotAuthorizedToUseScopesError,
    ProviderDoesNotAllowRegistrationError
} from "@znetstar/attic-common/lib/Error/AccessToken";
import {asyncMiddleware} from "./Common";
import GenericError from "@znetstar/attic-common/lib/Error/GenericError";
import { CouldNotLocateUserError } from '@znetstar/attic-common/lib/Error/Auth';
import {CouldNotLocateIdentityError } from "@znetstar/attic-common/lib/Error/Auth";
import {OAuthTokenForm, OAuthTokenRequest} from "@znetstar/attic-common/lib/IRPC";

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

                for await (let tknResponse of await user.getAccessTokensForScope(scope)) {
                    let scopeTokenPair: ScopeAccessTokenPair = tknResponse;
                    let accessToken: IAccessToken&Document|null = _.get(scopeTokenPair, '1') as IAccessToken&Document|null;
                    if (accessToken) {
                        context.currentScopeAccessToken = accessToken;

                        return;
                    }
                }
                throw new CouldNotFindTokenForScopeError([ scope, null ]);
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
        } else {
            throw new InvalidAccessTokenError();
        }
    }

    if (!req.user) {
        req.user = context.user = unauthorizedUser = req.user || unauthorizedUser || await mongoose.models.User.findOne({ username: UNAUTHROIZED_USERNAME }).exec();

        if (!req.user) {
            throw new CouldNotLocateUserError();
        }

        context.accessToken = { scope: req.user.scope.slice(0) } as any;
    }

    return true;
}));




export function getAccessTokenForm(req: OAuthTokenRequest): OAuthTokenForm {
    let getField = (f: string) => _.get(req, f);
    let grantType = getField('grant_type');
    let clientId = getField('client_id');
    let clientSecret = getField('client_secret');
    let redirectUri = getField('redirect_uri');
    let originalState = getField('state');
    let code = [].concat(getField('code'))[0];
    let refreshTokenCode = getField('refresh_token');
    let username = getField('username');
    let password = getField('password');
    let scope = Array.isArray(getField('scope')) ? getField('scope') : (getField('scope') || '').split(' ');

    return {
        grantType,
        clientSecret,
        clientId,
        redirectUri,
        originalState,
        code,
        refreshTokenCode,
        username,
        password,
        scope
    }
}

ApplicationContext.on('Web.AuthMiddleware.getAccessToken.grantTypes.authorization_code', async function (client: IClient&Document, req: OAuthTokenRequest) {
    let accessToken: IAccessToken&Document,
        refreshToken: IAccessToken&Document;
    let {
        password,
        username,
        refreshTokenCode,
        originalState,
        redirectUri,
        clientId,
        clientSecret,
        grantType,
        code
    } = getAccessTokenForm(req);

    if (!code) {
        throw new MalformattedTokenRequestError();
    }
    let stateKey = `auth.token.${code}`;
    let state = await redis.hgetall(stateKey);
    if (!Object.keys(state).length || !state) {
        throw new CouldNotLocateStateError();
    }
    await redis.del(stateKey);

    let user = await User.findById(state.user).exec();

    if (!user || state.client !== client.id || client.redirectUri !== redirectUri) {
        throw new InvalidClientOrProviderError();
        return ;
    }


    let scopes = checkScopePermission((state.scope || '').split(' '), client, user);

    accessToken = new AccessToken({
        tokenType: 'bearer',
        token: nanoid(),
        scope: scopes,
        client: client._id,
        clientRole:  IClientRole.consumer,
        clientName: client.name,
        redirectUri: client.redirectUri,
        user: user
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
        user: user
    });

    accessToken.linkedToken = refreshToken._id;
    return {
        accessToken,
        refreshToken
    }
});

async function getAccessToken (form: OAuthTokenRequest): Promise<IFormalAccessToken> {
    let {
        password,
        username,
        refreshTokenCode,
        originalState,
        redirectUri,
        clientId,
        clientSecret,
        grantType,
        code
    } = getAccessTokenForm(form);

    let grantEvent = `Web.AuthMiddleware.getAccessToken.grantTypes.${grantType || ''}`;

    if (!grantType || !clientId || !clientSecret || !redirectUri || !(ApplicationContext).eventNames().includes(grantEvent)) {
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

    let output: { accessToken: IAccessToken&Document, refreshToken?: IAccessToken&Document  }[] = await ApplicationContext.emitAsync(grantEvent, client, form);

    output.reverse();
    let { accessToken, refreshToken } = output.shift();
    if (!accessToken) {
        throw new GenericError(`An unknown error occurred, please try again`, 0, 500);
        return;
    }

    await accessToken.save();
    if (refreshToken)
        await refreshToken.save();

    return toFormalToken(accessToken);
}

RPCServer.methods.getAccessToken = getAccessToken;
RPCServer.methods.getAccessTokenForm = async (form: OAuthTokenRequest) => getAccessTokenForm(form);

ApplicationContext.on('Web.AuthMiddleware.getAccessToken.grantTypes.refresh_token', async function (client: IClient&Document, req: OAuthTokenRequest) {
    let accessToken: IAccessToken&Document,
        refreshToken: IAccessToken&Document;
    let {
        password,
        username,
        refreshTokenCode,
        originalState,
        redirectUri,
        clientId,
        clientSecret,
        grantType,
        code,
        scope
    } = getAccessTokenForm(req);

    if (!refreshTokenCode) {
        throw new MalformattedTokenRequestError();
    }

    refreshToken = await ( AccessToken.findOne({
        tokenType: TokenTypes.RefreshToken,
        client: client._id,
        clientRole: IClientRole.consumer,
        token: refreshTokenCode
    })).exec();

    if (!refreshToken)
        throw new CouldNotFindTokenForScopeError([ 'rpc.getAccessToken', null ]);

    await refreshToken.populate('user client').execPopulate();
    checkScopePermission(refreshToken.scope, refreshToken.client, refreshToken.user);

    if (refreshToken) {
        accessToken = await AccessTokenSchema.methods.accessTokenFromRefresh.call(refreshToken);
    }

    return {
        accessToken,
        refreshToken
    }
});

ApplicationContext.on('Web.AuthMiddleware.getAccessToken.grantTypes.password', async function (client: IClient&Document, req: OAuthTokenRequest) {
    let accessToken: IAccessToken&Document,
        refreshToken: IAccessToken&Document;
    let {
        password,
        username,
        refreshTokenCode,
        originalState,
        redirectUri,
        clientId,
        clientSecret,
        grantType,
        code,
        scope
    } = getAccessTokenForm(req);

    if (!password || !username) {
        throw new MalformattedTokenRequestError();
    }

    let user = await User.findOne({
        username
    });

    if (!user) {
        throw new CouldNotLocateUserError();
    }

    let scopes = checkScopePermission([].concat(scope), client, user);

    accessToken = new AccessToken({
        tokenType: 'bearer',
        token: nanoid(),
        scope: scopes,
        client: client._id,
        clientRole:  IClientRole.consumer,
        clientName: client.name,
        redirectUri: client.redirectUri,
        user: user
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
        user: user
    });

    accessToken.linkedToken = refreshToken._id;
    return {
        accessToken,
        refreshToken
    }
});


AuthMiddleware.post('/auth/token', require('body-parser').urlencoded({ type: 'application/x-www-form-urlencoded' }), require('body-parser').json({ type: 'application/json' }),restrictScopeMiddleware('auth.token'), asyncMiddleware(async function (req: any, res: any, next: any) {
    let form = {
        ...req.query,
        ...req.body
    };

    let formalToken = await getAccessToken(form);
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

            let formalToken: IFormalAccessToken = await tokenResp.json();
            let {accessToken, refreshToken} = await fromFormalToken(formalToken, null, provider, IClientRole.provider);
            let identity = await getIdentityEntityByAccessToken(accessToken);

            if (!identity) {
                throw new CouldNotLocateIdentityError();
            } else if (identity.user) {
                await identity.populate('user').execPopulate();
            }

            let user: IUser&Document;
            if (identity.user && (identity.user as IUser&Document).username !== UNAUTHROIZED_USERNAME) {
                user = identity.user as IUser&Document;
            }
            else if (existingState.username === UNAUTHROIZED_USERNAME || _.isEmpty(existingState.username)) {
                if (provider.role.includes(IClientRole.registration)) {
                    user = new User({
                        username: generateUsername(),
                        scope: [
                            ...config.get('unauthorizedScopes').slice(0)
                        ],
                    });
                } else {
                    throw new ProviderDoesNotAllowRegistrationError();
                }
            } else {
                user = await User.findById(existingState.user).exec();
            }

            user.identities = user.identities || [];
            if (!user.identities.map(x => x.toString()).includes(identity._id))
                user.identities.push(identity._id);

            identity.user = user._id;

            await user.save();
            await identity.save();

            accessToken.user = user;

            req.user = user;
            existingState.user = user._id;

            accessToken.scope = [].concat(provider.scope);
            refreshToken.scope = [].concat(provider.scope);

            accessToken.save();
            if (refreshToken) refreshToken.save();

            let authCode = nanoid();
            stateKey = `auth.token.${authCode}`;
            let pipeline = redis.pipeline();

            for (let k in existingState) {
                pipeline.hset(stateKey, k, (existingState as any)[k].toString());
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

        let scopes = checkScopePermission((req.query.scope || '').split(' '), client, req.user);

        let newState = {
            client: client.id,
            provider: provider.id,
            user: req.user.id,
            originalState: originalState,
            redirectUri: '',
            username: req.user.username,
            scope: scopes.join(' ')
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


export const AuthMiddlewares = new Map<string, any>();


export default AuthMiddlewares;