import {OAuthTokenRequest} from "@znetstar/attic-common/lib/IRPC";
import {IRPC} from "@znetstar/attic-common";
import {Client, HTTPClientTransport, JSONSerializer,RPCError} from "multi-rpc";
import Config from "./Config/Config";
import {IFormalAccessToken} from "@znetstar/attic-common/lib/IAccessToken";
import {InvalidGrantTypeError} from "@znetstar/attic-common/lib/Error/AccessToken";
import {GenericError, IError} from "@znetstar/attic-common/lib/Error";
import {LevelUp} from 'levelup';
import fetch from 'cross-fetch';

import {
  BinaryEncoding,
  EncodeTools,
  HashAlgorithm,
  IDFormat,
  SerializationFormat
} from '@etomon/encode-tools/lib/EncodeTools';


export interface ClientDetails {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

export interface RPCProxyOptions {
  headers: Map<string, string>;
  transport: HTTPClientTransport;
}

export interface PartialOAuthTokenRequest {
  grant_type: string;
  state?: string;
  code?: string;
  refresh_token?: string;
  username?: string;
  password?: string;
  scope?: string|string[];
}

export interface RefreshTokenRequest {
  grant_type: 'refresh_token';
  state?: string;
  refresh_token: string;
  scope?: string|string[];
}

export interface ClientCredentialsRequest {
  grant_type: 'client_credentials';
  state?: string;
  username: string;
  scope?: string|string[];
}

export interface PasswordRequest {
  grant_type: 'password';
  state?: string;
  username: string;
  password: string;
  scope?: string|string[];
}

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



export interface AuthorizationCodeRequest  {
  grant_type: 'authorization_code';
  state?: string;
  code: string;
  scope?: string|string[];
}


export interface RPCProxyResult {
  RPCClient: Client,
  RPCProxy: IRPC
}

enum GrantTypeList {
  clientCredentials= 'client_credentials',
  password = 'password',
  authorizationCode = 'authorization_code',
  refreshToken = 'refresh_token'
}

export type GrantType = (GrantTypeList|string);

export interface RPCInvokeOptions {
  method: string,
  args: unknown[],
  noLoop?: boolean;
  RPCClient: Client;
  headers: Map<string, string>;
  request?: OAuthTokenRequest
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

export const DEFAULT_ALLOWED_GRANTS = [ GrantTypeList.refreshToken, GrantTypeList.password, GrantTypeList.authorizationCode ];

export type OAuthRequestError = (OAuthRPCError|IError)&{ ensured?: boolean };

export class OAuthAgent {
  constructor(public serverUri: string, public client: ClientDetails, public cache?: LevelUp,  public allowedGrants: GrantType[] = DEFAULT_ALLOWED_GRANTS, protected encoder: EncodeTools = new EncodeTools({
    binaryEncoding: BinaryEncoding.nodeBuffer,
    hashAlgorithm: HashAlgorithm.xxhash64,
    serializationFormat: SerializationFormat.msgpack,
    uniqueIdFormat: IDFormat.uuidv4String
  })) {
    this.cache = this.cache || OAuthAgent.createDefaultCache();
  }

  public static createDefaultCache(): LevelUp {
    return require('levelup')(require('memdown')());
  }

  public async makeAccessTokenKey(request: OAuthTokenRequest):Promise<Buffer> {
    let key = {
      refresh_token: request.refresh_token,
      client_id: request.client_id,
      redirect_uri: request.redirect_uri,
      scope: request.scope
    }

    return (await this.encoder.hashObject(key));
  }

  public async getAccessToken(request: OAuthTokenRequest): Promise<IFormalAccessToken|null> {
    if (!this.cache)
      return null;

    let key = await this.makeAccessTokenKey(request);
    try {
      let cachedObjectRaw = await this.cache.get(key);
      let cachedObject = this.encoder.deserializeObject<IFormalAccessToken>(cachedObjectRaw);
      return cachedObject;
    }  catch (err) {
      if (err.notFound) {
        return null;
      } else {
        throw err;
      }
    }
  }

  public async setAccessToken(request: OAuthTokenRequest, token: IFormalAccessToken): Promise<void> {
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

  public static fromConfig(config: Config): OAuthAgent {
    return new OAuthAgent(config.serverUri, {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri
    });
  }

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
      err = new (errors.get(errorCode) as any)(rawError.error.data);
    } else if (rawError.status || rawError.httpCode) {
      err = new GenericError(rawError.message, 0, httpCode, rawError);
      (err as any).httpCode = httpCode;
      (err as any).code = 0;
    }
    else if (rawError.code) {
      httpCode = (rawError as any).httpCode || httpCode || 500;
      (rawError as any).httpCode = httpCode;
      err = rawError.data || rawError;
    } else {
      err = { httpCode, message, ...rawError } as IError;
    }

    err.ensured = true;
    return err;
  }

  public async ensureToken($request: OAuthTokenRequest, forceNewToken: boolean = false): Promise<IFormalAccessToken> {
    let request = { ...$request };
    let accessToken = await this.getAccessToken(request);
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

    accessToken = body as IFormalAccessToken;
    await this.setAccessToken(request, accessToken);
    return accessToken;
  }

  public async rpcInvoke<T>({ RPCClient, allowedGrants, args, method, headers, request }: RPCInvokeOptions, accessToken?: IFormalAccessToken): Promise<T> {
    if (!request) {
      try {
        return await RPCClient.invoke(method, args as any[]) as T;
      } catch (err) {
        throw OAuthAgent.ensureError(err);
      }
    }

    let retryAuthOn = [ 401, 400 ];
    try {
      accessToken = await this.ensureToken(request);
      headers.set(`Authorization`, `Bearer ${accessToken.access_token}`);
      return await RPCClient.invoke(method, args as any[]) as T;
    } catch ($err) {
      let err =  OAuthAgent.ensureError($err) as OAuthRequestError;
      if (retryAuthOn.includes(err?.httpCode)) {
        if (allowedGrants.length) {
          request.grant_type = allowedGrants.shift();

          return this.rpcInvoke({headers, allowedGrants, method, args, RPCClient, request}, accessToken)
        } else {
          await this.deleteAccessToken(request);
        }
      }
      throw err;
    } finally {

    }
  }
  public createRPCProxy(options?: RPCProxyOptions): RPCProxyResult;
  public createRPCProxy(request: AuthorizationCodeRequest, options?: RPCProxyOptions): RPCProxyResult;
  public createRPCProxy(request: ClientCredentialsRequest, options?: RPCProxyOptions): RPCProxyResult;
  public createRPCProxy(request: PasswordRequest, options?: RPCProxyOptions): RPCProxyResult;
  public createRPCProxy(request: RefreshTokenRequest, options?: RPCProxyOptions): RPCProxyResult;
  public createRPCProxy(request: PartialOAuthTokenRequest, options?: RPCProxyOptions): RPCProxyResult;
  public createRPCProxy(request?: RPCProxyOptions|AuthorizationCodeRequest|ClientCredentialsRequest|PasswordRequest|RefreshTokenRequest|PartialOAuthTokenRequest, options?: RPCProxyOptions): RPCProxyResult {
    let oauthTokenRequest: OAuthTokenRequest;
    if (!options && (request as RPCProxyOptions)?.headers || (request as RPCProxyOptions)?.transport) {
      options = request as RPCProxyOptions;
    }
    else if (request)
      oauthTokenRequest = { ...(request as PartialOAuthTokenRequest), ...this.client };

    let serializer = new JSONSerializer();
    let headers = options?.headers || new Map<string, string>();
    let httpTransport = options?.transport || new HTTPClientTransport(serializer, this.serverUri+'/rpc', headers);

    let self = this;

    const RPCClient = <Client>(new Client(httpTransport));
    const RPCProxy = new Proxy(<IRPC>{}, {
      get: function (target, property: string) {
        return async function<T> (...args: any[]) {
          return self.rpcInvoke({
            headers,
            request: oauthTokenRequest,
            RPCClient: RPCClient,
            method: property,
            args: args,
            allowedGrants: self.allowedGrants.slice(0)
          })
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
