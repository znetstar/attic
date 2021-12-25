import {asyncMiddleware} from "./Common";
import {ILocation, Location} from "../Location";
import {IDriverOfFull} from "../Driver";
import {getFormatsFromContext, IHTTPResponse} from "../Drivers/HTTPCommon";
import Constructible from "../Constructible";
import {resolve} from "../Resolver";
import * as _ from 'lodash';
import {IScopeContext} from "../Auth/AccessToken";
import RPCServer from "../RPC";
import ApplicationContext from "../ApplicationContext";
import ItemCache from "../ItemCache";
import Config from '../Config';
import {
  UnauthorizedUserDoesNotHavePermissionToAccessResourceError,
  UserDoesNotHavePermissionToAccessResourceError
} from "@znetstar/attic-common/lib/Error/Auth";
import {ScopeAccessTokenPair} from "@znetstar/attic-common/lib/IAccessToken";
import {EncodeTools} from "@znetstar/encode-tools";
import {SerializationFormat} from "@znetstar/encode-tools/lib/EncodeTools";

export interface SerializedHTTPResponseExt {
    headers: [string, string][]
}

export type SerializedHTTPResponse = IHTTPResponse&SerializedHTTPResponseExt;

const HTTPResponseCache = new ItemCache<ILocation, SerializedHTTPResponse>('HTTPResponse');

export async function getHttpResponse<O extends IHTTPResponse, I>(req: any, res: any, location: ILocation): Promise<O> {
  const scopeContext: IScopeContext = req.scopeContext;
  const inLoc = _.cloneDeep({ href: location.href, auth: location.auth, headers: { 'user-agent': req.headers['user-agent'] } });
  let method: string = '$';

  if (req.method.toUpperCase() === 'GET')
    method = '.get';
  if (req.method.toUpperCase() === 'PUT')
    method = '.put';
  if (req.method.toUpperCase() === 'HEAD')
    method = '.head';
  if (req.method.toUpperCase() === 'DELETE')
    method = '.delete';
  if (req.method.toUpperCase() === 'CONNECT')
    method = '.connect';

  const baseScope = `resolve.no-group${method}`

  const auths = [].concat(inLoc.auth || []);

  let groupScopes: string[] = [];
  if (auths.length) {
    // If the location has groups the user cannot be anonymous
    if (scopeContext.user.username === ApplicationContext.config.unauthorizedUserName) {
      throw new UnauthorizedUserDoesNotHavePermissionToAccessResourceError();
    }

    groupScopes.push(
      ...auths.map((s) => { return `resolve.group.${s}${method}` })
    );
  }

  let scopePair: ScopeAccessTokenPair;
  let baseScopePair: ScopeAccessTokenPair;

  // Must match base scope
  if (baseScope !== scopeContext.currentScope) {
    for await (const pair of scopeContext.user.getAccessTokensForScope(baseScope)) {
      if (pair) {
        baseScopePair = pair;
        break;
      }
    }
  } else {
    baseScopePair = [ scopeContext.currentScope, scopeContext.currentScopeAccessToken ];
  }

  if (!baseScopePair) throw new UserDoesNotHavePermissionToAccessResourceError();

  // Must match at least one group scope, if given
  if (groupScopes.length) {
    if (!groupScopes.includes(scopeContext.currentScope)) {
      for await (const pair of scopeContext.user.getAccessTokensForScope(groupScopes)) {
        if (pair) {
          scopePair = pair;
          break;
        }
      }
    } else {
      scopePair = [scopeContext.currentScope, scopeContext.currentScopeAccessToken];
    }

    if (!scopePair) throw new UserDoesNotHavePermissionToAccessResourceError();
  }

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

    const Driver: Constructible<IDriverOfFull<IHTTPResponse|null, Buffer, unknown>> = ApplicationContext.drivers.get(location.driver) as Constructible<IDriverOfFull<IHTTPResponse|null, Buffer, unknown>>;
    const driver = new Driver();

    const allowedMethods = [
        'get', 'head', 'put', 'delete', 'connect'
    ].filter(m => typeof((driver as any)[m]) !== 'undefined');


    let response: IHTTPResponse|null;


    if (req.method === 'GET' && allowedMethods.includes(req.method.toLowerCase()))
        response = await driver.get(location);
    else if (req.method === 'HEAD' && allowedMethods.includes(req.method.toLowerCase()))
        response = await driver.head(location);
    else if (req.method === 'PUT' && allowedMethods.includes(req.method.toLowerCase())) {
      response = await driver.put(location, req.body);
    }
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

RPCServer.methods.getHttpResponse = async function Rpc<O extends IHTTPResponse, I>(location: ILocation, reqOverrides?: unknown): Promise<O> {
    const { req, res } = this.context.clientRequest.additionalData;
    for (let k in (reqOverrides || {} as any)) {
      (req as any)[k] = (reqOverrides as any)[k];
    }

    const loc = Location.hydrate(location);
    await loc.populate('entity').execPopulate();
    return getHttpResponse<O,I>(req, res, loc);
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

        // if (response.status === 401 && Config.promptUnauthenticatedToLogin) {
        //     if (location.preferredAuthProvider) {
        //         req.session.navigateAfterLogin = req.originalUrl;
        //         res.redirect(`/auth/${location.preferredAuthProvider}/authorize?`)
        //     };
        // }

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
