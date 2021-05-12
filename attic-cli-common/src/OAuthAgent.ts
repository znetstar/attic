import {OAuthTokenRequest as OAuthTokenRequestBase} from "@znetstar/attic-common/lib/IRPC";
import {IRPC} from "@znetstar/attic-common";
import {Client, HTTPClientTransport, JSONSerializer,RPCError} from "multi-rpc";
import Config from "./Config/Config";
import {IFormalAccessToken} from "@znetstar/attic-common/lib/IAccessToken";
import {InvalidGrantTypeError} from "@znetstar/attic-common/lib/Error/AccessToken";
import {GenericError, IError} from "@znetstar/attic-common/lib/Error/index";
import {LevelUp} from 'levelup';
import fetch from 'cross-fetch';

/**
 * Full OAuth request (this is the stuff that goes into `fetch` usually).
 */
type OAuthTokenRequest = OAuthTokenRequestBase;

import {
  BinaryEncoding,
  EncodeTools,
  HashAlgorithm,
  IDFormat,
  SerializationFormat
} from '@etomon/encode-tools/lib/EncodeTools';

/**
 * Client infomation from OAuth
 */
export interface ClientDetails {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

/**
 * Options for the RPC Proxy
 */
export interface RPCProxyOptions {
  headers: Map<string, string>|[string,string][];
  transport: HTTPClientTransport;
  accessToken?: IFormalAccessToken;
}

/**
 * Everything in the `OAuthTokenRequest` except for the client stuff (`ClientDetails`).
 * This is so you don't have to include the client stuff with every request
 */
export interface PartialOAuthTokenRequest {
  grant_type: string;
  state?: string;
  code?: string;
  refresh_token?: string;
  username?: string;
  password?: string;
  scope?: string|string[];
}

/**
 * Fields specifically for getting an access token from a refresh token
 */
export interface RefreshTokenRequest {
  grant_type: 'refresh_token';
  state?: string;
  refresh_token: string;
  scope?: string|string[];
}

/**
 * Fields specifically for getting an access token from client credentials
 */
export interface ClientCredentialsRequest {
  grant_type: 'client_credentials';
  state?: string;
  /**
   * Username of the user you'd like to login as
   */
  username: string;
  scope?: string|string[];
}

/**
 * Fields specifically for getting an access token from username/password
 */
export interface PasswordRequest {
  grant_type: 'password';
  state?: string;
  username: string;
  password: string;
  scope?: string|string[];
}

/**
 * Raw RPC Error from multi-rpc
 */
export interface RawRPCError {
  message:  string;
  stack?: string;
  code: number;
  data?: {
    stack?:  string;
    message: string;
    code?: string
  }
};

/**
 * Fields specifically for getting an access token from an authorization code (like WeChat or Google)
 */
export interface AuthorizationCodeRequest  {
  grant_type: 'authorization_code';
  state?: string;
  code: string;
  scope?: string|string[];
}

export type UsedAccessToken = IFormalAccessToken&{
  /**
   * Is true when the access token has been used more than once
   */
  used?: boolean;
}

export interface RPCProxyResult {
  /**
   * RPC Client from Multi-RPC
   */
  RPCClient: Client,
  /**
   * The full RPC Proxy
   */
  RPCProxy: IRPC
}

/**
 * The standard grant types
 */
enum GrantTypeList {
  clientCredentials= 'client_credentials',
  password = 'password',
  authorizationCode = 'authorization_code',
  refreshToken = 'refresh_token'
}

export type GrantType = (GrantTypeList|string);

/**
 * Options for the RPC Invoke function
 */
export interface RPCInvokeOptions {
  /**
   * RPC Method to Call
   */
  method: string,
  /**
   * Args
   */
  args: unknown[],
  /**
   * not used
   * @deprecated
   */
  noLoop?: boolean;
  /**
   * The Multi-RPC Client
   */
  RPCClient: Client;
  /**
   * HTTP Headers to be used with each request
   */
  headers: Map<string, string>;
  /**
   * The OAuth token request
   */
  request?: OAuthTokenRequest
  /**
   * Grants that are allowed to be used when attempting to get a new token.
   *
   * The grants will be attempted in sequence, so `allowedGrants[0]` will be the first grant attempted
   * if the token has expired.
   */
  allowedGrants?: GrantType[];
}

export type OAuthRPCError = RPCError&{
  httpCode: number;
}

let errors = new Map<number, unknown>();

let errorsObj = require('@znetstar/attic-common/lib/Error');
for (let k in errorsObj) {
  errors.set(errorsObj[k].code, errorsObj[k]);
}
/**
 * The full RPC Proxy
 */
export const DEFAULT_ALLOWED_GRANTS: GrantType[] = [ GrantTypeList.refreshToken, GrantTypeList.password, GrantTypeList.authorizationCode ];

export type OAuthRequestError = (OAuthRPCError|IError)&{ ensured?: boolean };

/**
 * A tool to manage Attic OAuth tokens, and provides
 * an easy to use interface for attic
 */
export class OAuthAgent {
  /**
   *
   * @param serverUri URI to the attic server
   * @param client The OAuth `ClientDetails`
   * @param cache Accepts a `levelup` instance to use as a cache for access tokens. If not provided will refresh every time
   * @param allowedGrants Grants that will be attempted to be used if the token has expired
   * @param encoder An `EncodeTools` instance for encoding/decoding tokens and generating hashes
   */
  constructor(public serverUri: string, public client: ClientDetails, public cache?: LevelUp,  public allowedGrants: GrantType[] = DEFAULT_ALLOWED_GRANTS, protected encoder: EncodeTools = new EncodeTools({
    binaryEncoding: BinaryEncoding.nodeBuffer,
    hashAlgorithm: HashAlgorithm.xxhash64,
    serializationFormat: SerializationFormat.json,
    uniqueIdFormat: IDFormat.uuidv4String
  })) {
    this.cache = this.cache || OAuthAgent.createDefaultCache();
  }

  /**
   * Returns the default cache that will be used, which is `memdown` (memory only)
   */
  public static createDefaultCache(): LevelUp {
    return require('levelup')(require('memdown')());
  }

  /**
   * Generates the hash used to uniquely identify each refresh token
   * @param request - Stuff that would be needed to get an access token
   */
  public async makeAccessTokenKey(request: OAuthTokenRequest):Promise<Buffer> {
    let key = {
      refresh_token: request.refresh_token,
      client_id: request.client_id,
      redirect_uri: request.redirect_uri,
      scope: request.scope
    }

    return (await this.encoder.hashObject(key));
  }

  /**
   * Retrieves an access token from the cache or `null` if non are found
   * @param request
   */
  public async getAccessToken(request: OAuthTokenRequest): Promise<UsedAccessToken|null> {
    if (!this.cache)
      return null;

    let key = await this.makeAccessTokenKey(request);
    try {
      let cachedObjectRaw = await this.cache.get(key);
      let cachedObject = this.encoder.deserializeObject<UsedAccessToken>(cachedObjectRaw);
      return cachedObject;
    }  catch (err) {
      if (err.notFound) {
        return null;
      } else {
        throw err;
      }
    }
  }

  /**
   * Adds an access token to the cache
   * @param request
   * @param token
   */
  public async setAccessToken(request: OAuthTokenRequest, token: UsedAccessToken): Promise<void> {
    if (!this.cache)
      return;

    let key = await this.makeAccessTokenKey(request);
    try {
      let cachedObject = this.encoder.serializeObject<IFormalAccessToken>(token);
      await this.cache.put(key, cachedObject);
    }  catch (err) {
      throw err;
    }
  }

  /**
   * Deletes an access token from the cache
   * @param request
   */
  public async deleteAccessToken(request: OAuthTokenRequest): Promise<void> {
    if (!this.cache)
      return;

    let key = await this.makeAccessTokenKey(request);
    try {
      await this.cache.del(key);
    }  catch (err) {
      throw err;
    }
  }
  /**
   * Gets an access token given the full OAuth request (what would normally go into `fetch`).
   * @param request - Full OAuth request (this is the stuff that goes into `fetch` usually).
   */
  public static fromConfig(config: Config): OAuthAgent {
    return new OAuthAgent(config.serverUri, {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri
    });
  }
  /**
   * Deals with the different types of errors that may be thrown (e.g., `fetch` error or `multi-rpc` `RPCError`)
   * returning an object with a consistent interface.
   * @param rawError The raw error provided
   * @param httpCode An HTTP Code that will be used if none can be detected
   */
  public static ensureError(rawError: any, httpCode?: number): OAuthRequestError {
    if (rawError.ensured)
      return rawError;

    if (rawError?.error)
      rawError = rawError.error;

    let errorCode = rawError?.data?.code;
    let err: OAuthRequestError;
    let message = rawError.message || 'Unexpected Error';
    httpCode = rawError.status || rawError.httpCode || httpCode;
    if (typeof(errorCode) !== 'undefined') {
      let Err = errors.get(errorCode) as any;
      if (Err) err = new (Err)(rawError.data);
      else err = void(0);
    } else if (rawError.  status || rawError.httpCode) {
      err = new GenericError(rawError.message, 0, httpCode, rawError);
      (err as any).httpCode = httpCode;
      (err as any).code = 0;
    }
    else if (rawError.code) {
      httpCode = (rawError as any).httpCode || httpCode || 500;
      (rawError as any).httpCode = httpCode;
      err = rawError.data || rawError;
    }

    if (!err) err = { httpCode, message, ...rawError } as IError;


    err.ensured = true;
    return err;
  }

  /**
   * Given a `PartialOAuthTokenRequest` (`OAuthTokenRequest` without the `ClientDetails)
   * ensures that a valid token is available by pulling an existing token from the cache,
   * or refreshing by using the information in the request.
   * @param $request
   * @param forceNewToken Don't pull from cache
   */
  public async ensureTokenFromPartialRequest($request: PartialOAuthTokenRequest, forceNewToken: boolean = false): Promise<UsedAccessToken> {
    return this.ensureToken(this.makeFullRequest($request), forceNewToken);
  }
  /**
   * Given a `OAuthTokenRequest` ensures that a valid token is available by pulling an existing token from the cache,
   * or refreshing by using the information in the request.
   * @param $request
   * @param forceNewToken Don't pull from cache
   */
  public async ensureToken($request: OAuthTokenRequest, forceNewToken: boolean = false): Promise<UsedAccessToken> {
    let request = { ...$request };
    let accessToken = !forceNewToken ? await this.getAccessToken(request) : null;
    // If we have a token already just return it
    if (!forceNewToken && accessToken?.access_token)
      return accessToken;

    // If a grant type is set, we don't need to do anything special
    if (!request?.grant_type) {
      if (!request) request = {
        ...this.client,
        grant_type: null as any as string
      }

      // If we have a refresh token let's use that
      if (!request.refresh_token) {
        request.grant_type = 'refresh_token';
        request.refresh_token = accessToken?.refresh_token;
      }
      // If we have the username and password, we'll go with that
      else if (!request.username && request.password) {
        request.grant_type = 'password';
      }
      // If we have client credentials, let's use that
      else if (request.username) {
        request.grant_type = 'client_credentials';
      } else {
        throw new InvalidGrantTypeError();
      }
    }

    // let fullBody = {
    //   method: 'getAccessToken',
    //   params: [
    //     request
    //   ],
    //   id: this.encoder.uniqueId(IDFormat.uuidv4String),
    //   jsonrpc: '2.0'
    // };

    // Try to get a response
    let resp = await fetch(`${this.serverUri}/auth/token`, {
      body: JSON.stringify(request
      ),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    if (resp.status !== 200) {
      if (resp.headers.get('content-type')?.indexOf('application/json') !== -1) {
        let body = await resp.json();
        throw OAuthAgent.ensureError(body, resp.status);
      } else {
        let err = new GenericError(`Unexpected error`, resp.status);
        throw OAuthAgent.ensureError(err, resp.status);
      }
    }

    if (typeof(resp.headers.get('content-type')) !== 'string' || resp.headers.get('content-type')?.indexOf('application/json') === -1) {
      let err = new GenericError(`Server returned an invalid response`, resp.status);
      throw OAuthAgent.ensureError(err, resp.status);
    }

    let body = await resp.json();

    if (body?.error) {
      throw OAuthAgent.ensureError(body, resp.status);
    }

    if (!body.access_token) {
      let err = new GenericError(`Server returned an invalid response`, 500);
      throw OAuthAgent.ensureError(err, 500);
    }

    accessToken = body as UsedAccessToken;
    accessToken.used = true;
    await this.setAccessToken(request, accessToken);
    return accessToken;
  }

  /**
   * Invokes the RPC method with the token derived from the `OAuthTokenRequest`
   * will throw an error with the `httpCode` set to `401` if no token can be obtained.
   * @param RPCClient
   * @param allowedGrants
   * @param args
   * @param method
   * @param headers
   * @param request
   * @param accessToken Provide an existing access token inline. Is useful when you don't need refreshing/caching
   * @param force Force a token refresh if possible (no cache)
   */
  public async rpcInvoke<T>({ RPCClient, allowedGrants, args, method, headers, request }: RPCInvokeOptions, accessToken?: UsedAccessToken, force?: boolean): Promise<T> {
    if (!request && !accessToken) {
        try {
          return await RPCClient.invoke(method, args as any[]) as T;
        } catch (err) {
          throw OAuthAgent.ensureError(err);
        }
      }

    let retryAuthOn = [ 401, 400 ];
    let notUsed: boolean = false;
    try {
      accessToken = (accessToken && !accessToken.used) ? accessToken : await this.ensureToken(request, force || accessToken?.used);
      notUsed = !accessToken?.used;
      accessToken.used = true;
      headers.set(`Authorization`, `Bearer ${accessToken.access_token}`);

      return await RPCClient.invoke(method, args as any[]) as T;
    } catch ($err) {
      let err =  OAuthAgent.ensureError($err) as OAuthRequestError;
      if (request && retryAuthOn.includes(err?.httpCode)) {
        if (allowedGrants.length) {
          request.grant_type = notUsed ? allowedGrants[0] : allowedGrants.shift();

          return this.rpcInvoke({headers, allowedGrants, method, args, RPCClient, request}, accessToken, true);
        } else {
          await this.deleteAccessToken(request);
        }
      }
      throw err;
    } finally {

    }
  }

  /**
   * Returns a full `OAuthTokenRequest` given a `PartialOAuthTokenRequest` by adding the `ClientDetails` from `this.client`
   * @param request
   */
  public makeFullRequest(request: PartialOAuthTokenRequest): OAuthTokenRequest {
     return { ...(request), ...this.client };
  }

  /**
   * Returns an anonymous `RPCProxy` to interface with the Attic RPC API
   * This proxy will have no login info, so calling methods that require
   * authentication will trigger a `401` or a `403`.
   * @param options
   */
  public createRPCProxy(options?: RPCProxyOptions): RPCProxyResult;
  /**
   * Returns a `RPCProxy` to interface with the Attic RPC API
   * @param options
   */
  public createRPCProxy(request: AuthorizationCodeRequest, options?: RPCProxyOptions): RPCProxyResult;
  /**
   * Returns a `RPCProxy` to interface with the Attic RPC API
   * @param options
   */
  public createRPCProxy(request: ClientCredentialsRequest, options?: RPCProxyOptions): RPCProxyResult;
  /**
   * Returns a `RPCProxy` to interface with the Attic RPC API
   * @param options
   */
  public createRPCProxy(request: PasswordRequest, options?: RPCProxyOptions): RPCProxyResult;
  /**
   * Returns a `RPCProxy` to interface with the Attic RPC API
   * @param options
   */
  public createRPCProxy(request: RefreshTokenRequest, options?: RPCProxyOptions): RPCProxyResult;
  /**
   * Returns a `RPCProxy` to interface with the Attic RPC API
   * @param options
   */
  public createRPCProxy(request: PartialOAuthTokenRequest, options?: RPCProxyOptions): RPCProxyResult;
  /**
   * Returns a `RPCProxy` to interface with the Attic RPC API
   * @param options
   */
  public createRPCProxy(request?: RPCProxyOptions|AuthorizationCodeRequest|ClientCredentialsRequest|PasswordRequest|RefreshTokenRequest|PartialOAuthTokenRequest, options?: RPCProxyOptions): RPCProxyResult {
    let oauthTokenRequest: OAuthTokenRequest;
    if (!options && (request as RPCProxyOptions)?.headers || (request as RPCProxyOptions)?.accessToken || (request as RPCProxyOptions)?.transport) {
      options = request as RPCProxyOptions;
      request = void(0);
    }
    else if (request)
      oauthTokenRequest = this.makeFullRequest(request as PartialOAuthTokenRequest);

    let serializer = new JSONSerializer();
    let headers = (options?.headers && ((options?.headers instanceof Map) ? options?.headers : new Map<string,string>(Array.from(options?.headers)))) || new Map<string, string>();

    let httpTransport = options?.transport || new HTTPClientTransport(serializer, this.serverUri+'/rpc', headers as Map<string,string>);

    let self = this;

    if (headers && !(headers instanceof Map)) {
      headers = new Map<string,string>(Array.from(headers));
    }

    const RPCClient = <Client>(new Client(httpTransport));
    const RPCProxy = new Proxy(<IRPC>{}, {
      get: function (target, property: string) {
        return async function<T> (...args: any[]) {
          return self.rpcInvoke({
            headers: headers as Map<string,string>,
            request: oauthTokenRequest,
            RPCClient: RPCClient,
            method: property,
            args: args,
            allowedGrants: self.allowedGrants.slice(0)
          }, options?.accessToken)
        }
      },
      set: () => false,
      deleteProperty: () => false
    });
    return {
      RPCClient,
      RPCProxy
    }
  }
}
