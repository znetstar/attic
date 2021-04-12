import { Router } from 'express';
import {asyncMiddleware} from "./Common";
import {RootResolverSchema} from "../Resolvers/RootResolver";
import {ILocation, Location} from "../Location";
import {IDriverFull,IDriverOfFull} from "../Driver";
import {IHTTPResponse} from "../Drivers/HTTPCommon";
import Constructible from "../Constructible";
import {resolve} from "../Resolver";
import * as _ from 'lodash';
import {  } from 'multi-rpc';
import {IScopeContext} from "../Auth/AccessToken";
import RPCServer from "../RPC";
import ApplicationContext from "../ApplicationContext";
import ItemCache from "../ItemCache";
import { Document } from 'mongoose';
import Config from '../Config';
import {UnauthorizedUserDoesNotHavePermissionToAccessResourceError, UserDoesNotHavePermissionToAccessResourceError} from "@znetstar/attic-common/lib/Error/Auth";

export interface SerializedHTTPResponseExt {
    headers: [string, string][]
}

export type SerializedHTTPResponse = IHTTPResponse&SerializedHTTPResponseExt;

const HTTPResponseCache = new ItemCache<ILocation, SerializedHTTPResponse>('HTTPResponse');

export async function getHttpResponse<O extends IHTTPResponse, I>(req: any, res: any, location: ILocation): Promise<O> {
    let scopeContext: IScopeContext = req.scopeContext;

    let userIsAuth = await location.authenticateLocation(scopeContext.user);

    if (!userIsAuth) {
        if (scopeContext.user.username === Config.unauthorizedUserName) {
            throw new UnauthorizedUserDoesNotHavePermissionToAccessResourceError()
        } else {
            throw new UserDoesNotHavePermissionToAccessResourceError();
        }
    }

    let inLoc = _.cloneDeep({ href: location.href, auth: location.auth, headers: { 'user-agent': req.headers['user-agent'] } });

    let scope = 'rpc.getResponse';
    let scopePair = [ scopeContext.currentScope, scopeContext.currentScopeAccessToken ];
    if (scope !== scopeContext.currentScope)
        scopePair = (await (await scopeContext.user.getAccessTokensForScope(scope)).next()).value;

    let cachedResult = await HTTPResponseCache.getObject(inLoc);
    if (cachedResult) {
        let response: O = {
            ...(cachedResult as any),
            headers: new Map<string, string>(cachedResult.headers)
        };
        return response as O;
    }

    location.httpContext = {
        req,
        res,
        scopeContext: req.context
    };

    let Driver: Constructible<IDriverOfFull<IHTTPResponse|null, Buffer>> = ApplicationContext.drivers.get(location.driver) as Constructible<IDriverOfFull<IHTTPResponse|null, Buffer>>;
    let driver = new Driver();

    let allowedMethods = [
        'get', 'head', 'put', 'delete', 'connect'
    ].filter(m => typeof((driver as any)[m]) !== 'undefined');


    let response: IHTTPResponse|null;
    if (req.method === 'GET' && allowedMethods.includes(req.method.toLowerCase()))
        response = await driver.get(location);
    else if (req.method === 'HEAD' && allowedMethods.includes(req.method.toLowerCase()))
        response = await driver.head(location);
    else if (req.method === 'PUT' && allowedMethods.includes(req.method.toLowerCase()))
        response = await driver.put(location, req.body);
    else if (req.method === 'DELETE' && allowedMethods.includes(req.method.toLowerCase()))
        response = await driver.delete(location);
    else if (req.method === 'CONNECT' && allowedMethods.includes(req.method.toLowerCase()))
        response = await driver.connect(location);
    else {
        response = {
            method: req.method,
            status: 405,
            href: location.href,
            headers: new Map<string, string>([ [ 'Allowed', allowedMethods.map(m => m.toUpperCase()).join(' ') ] ])
        };
    }

    let outResp: SerializedHTTPResponse = {
        ...(response as any),
        headers: Array.from(response.headers.entries())
    };

    if (outResp.status === 200 || (outResp.status !== 200 && Config.cacheNon200HTTPResponses))
        await HTTPResponseCache.setObject(inLoc, outResp);

    return response as O;
}

RPCServer.methods.getHttpResponse = async function Rpc<O extends IHTTPResponse, I>(location: ILocation): Promise<O> {
    let { req, res } = this.clientRequest.additionalData;

    return getHttpResponse<O,I>(req, res, Location.hydrate(location));
}

export default function ResolverMiddleware(req: any, res: any, next: any) {
    asyncMiddleware(async function (req: any, res: any) {
        if (req.originalUrl.substr(0, 5) === '/auth')
            return true;
        let href = ((req.headers && req.headers['x-forwarded-proto']) || req.protocol) + '://' + req.get('host') + req.originalUrl;

        // href = href.replace('http://localhost:7337', 'https://zb.gy');


        const location = await resolve({ href });


        if (_.isEmpty(location) || !location) {
            return true;
        }

        const response = await getHttpResponse<IHTTPResponse, Buffer>(req, res, location);

        if (!response) {
            return;
        }

        res.status(response.status);
        if (response.headers) {
            for (let k of Array.from(response.headers.keys())) {
                res.set(k, response.headers.get(k));
            }
        }
        if (response.body) {
            res.send(response.body);
        }

        res.end();
    })(req, res, next);
}