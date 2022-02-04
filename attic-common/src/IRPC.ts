import ILocation from "./ILocation";
import IResolver, {IMountPoint} from "./IResolver";
import IEntity from "./IEntity";
import IClient from "./IClient";
import {
  AccessTokenSet,
  AuthorizedScopePair,
  FormalAccessTokenSet,
  IAccessToken,
  IFormalAccessToken
} from "./IAccessToken";
import IUser from "./IUser";
import {IIdentityEntity} from "./IIdentity";
import {EncodingOptions, MimeTypesSerializationFormat, SerializationFormat} from "@znetstar/encode-tools/lib/EncodeTools";
import {default as EncodeTools} from "@znetstar/encode-tools/lib/EncodeTools";
import { Buffer } from 'buffer';
import IEvent from "./IEvent";
export interface BasicTextSearchQueryOptions {
    skip?: number;
    limit?: number;
    terms: string;
    populate?: string|string[];
}

export interface BasicTextSearchQueryOptionAdditions {
    count?: boolean;
}

export type BasicTextSearchOptions = BasicTextSearchQueryOptions&BasicTextSearchQueryOptionAdditions;

export interface BasicFindQueryOptions {
    skip?: number;
    limit?: number;
    query?: any;
    sort?: any;
    populate?: string|string[];
}

export interface BasicFindQueryOptionAdditions {
    count?: boolean;
}

export type BasicFindOptions = BasicFindQueryOptions&BasicFindQueryOptionAdditions;

export interface ResolveOptions {
    id?: string;
    noCache?: boolean;
}

export interface CreateLocationResponse {
    id: string;
    href: string;
}

export interface OAuthTokenForm {
    grantType: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    originalState?: string;
    code?: string;
    refreshTokenCode?: string;
    username?: string;
    password?: string;
    scope?: string|string[];
}

export interface OAuthTokenRequest {
    grant_type: string;
    client_id: string;
    client_secret: string;
    redirect_uri: string;
    state?: string;
    code?: string;
    refresh_token?: string;
    username?: string;
    password?: string;
    scope?: string|string[];
}

export interface IHTTPResponse {
    href: string;
    headers?: Map<string, string>;
    status: number;
    body?: Uint8Array;
    method: string;
}

export interface IHttpContext {
  req: unknown;
  res: unknown;
  scopeContext?: unknown;
}

export interface IPutEnvelope {
  data: Uint8Array|string;
  options?: unknown;
}

export function unwrapPut(body: Uint8Array, context: IHttpContext) {
  const { inFormat } = getFormatsFromContext(context);
  // @ts-ignore
  const delta: IPutEnvelope = body instanceof Uint8Array ? EncodeTools.WithDefaults.deserializeObject(body, inFormat) : body;

  return delta;
}


export function wrapPut(envelope: IPutEnvelope, context: IHttpContext) {
  const { outFormat } = getFormatsFromContext(context);
  const body: Uint8Array = EncodeTools.WithDefaults.serializeObject(envelope, outFormat) as Uint8Array;

  return body;
}
export function getFormatsFromContext(httpContext: IHttpContext, defaultEncodeOptions: EncodingOptions = { serializationFormat: SerializationFormat.json }) {
  const inType = ((httpContext as IHttpContext) ? ((httpContext as IHttpContext ).req as any).headers.accept || '' : '').split(';').shift();
  const outType = ((httpContext as IHttpContext) ? ((httpContext as IHttpContext).req as any).headers['content-type'] || '' :'').split(';').shift();

  const inFormat = MimeTypesSerializationFormat.get(inType) || defaultEncodeOptions.serializationFormat;
  const outFormat = MimeTypesSerializationFormat.get(outType) || defaultEncodeOptions.serializationFormat;

  return {
    inFormat,
    outFormat
  };
}


export type FindEntitiesResult = IEntity[]|number;
export type RPCContext = {
  accessToken: IAccessToken,
  user: IUser,
  formalAccessToken: IFormalAccessToken,
  availableScopes: string[]
};


export default interface IRPC {
    listDrivers(): Promise<string[]>;
    generateId(size?: number): Promise<string>;

    findLocations(query: BasicFindOptions): Promise<ILocation[]|number>;
    findLocation(query: any): Promise<ILocation>;
    searchLocations(query: BasicTextSearchOptions): Promise<ILocation[]|number>;
    createLocation(location: ILocation): Promise<CreateLocationResponse>;
    updateLocation(id: string, fields: any): Promise<CreateLocationResponse>
    deleteLocations(query: BasicFindQueryOptions): Promise<void>;
    deleteLocation(query: any): Promise<void>;
    authenticateLocation(locationId: string, userId: string): Promise<boolean>;
    getUserByLocationAuth(locationId: string): Promise<IUser[]>;

    findResolvers(query: BasicFindOptions): Promise<IResolver[]|number>;
    findResolver(query: any): Promise<IResolver>;
    searchResolvers(query: BasicTextSearchOptions): Promise<IResolver[]|number>;
    createResolver(Resolver: IResolver): Promise<string>;
    updateResolver(id: string, fields: any): Promise<void>
    deleteResolvers(query: BasicFindQueryOptions): Promise<void>;
    deleteResolver(query: any): Promise<void>;
    listResolverTypes(): Promise<string[]>;

    findEntities(query: BasicFindOptions): Promise<FindEntitiesResult>;
    searchEntities(query: BasicTextSearchOptions): Promise<FindEntitiesResult>;
    createEntity(Entity: IEntity): Promise<string>;
    updateEntity(id: string, fields: any): Promise<void>
    deleteEntities(query: BasicFindQueryOptions): Promise<void>;
    deleteSelfEntities(query: BasicFindQueryOptions): Promise<void>;
    deleteEntity(query: any): Promise<void>;
    listEntityTypes(): Promise<string[]>;
    findIdentityEntity(query: any): Promise<IEntity>;
    getIdentityEntity(query: any): Promise<IEntity>;
    findSelfEntities(query: BasicFindOptions): Promise<FindEntitiesResult>;

    getNextResolverPriority(mountPoint: IMountPoint): Promise<number>;

    resolveLocation(location: ILocation): Promise<ILocation>;
    resolve(location: ILocation|string, options: ResolveOptions): Promise<ILocation>;

    getHttpResponse(location: ILocation, body: unknown): Promise<IHTTPResponse>;

    findUsers(query: BasicFindOptions): Promise<IUser[]|number>;
    findUser(query: any): Promise<IUser>;
    searchUsers(query: BasicTextSearchOptions): Promise<IUser[]|number>;
    createUser(User: IUser): Promise<string>;
    updateUser(id: string, fields: any): Promise<void>
    deleteUsers(query: BasicFindQueryOptions): Promise<void>;
    deleteUser(query: any): Promise<void>;
    listUserTypes(): Promise<string[]>;
    generateUsername(): Promise<string>;
    deleteAccessTokens(query: any, deleteLinked?: boolean): Promise<void>;
    deleteSelfAccessTokens(query: any, deleteLinked?: boolean): Promise<void>;
    addUserToGroup(userId: string, group: string[]): Promise<void>;
    removeUserFromGroup(userId: string, group: string[]): Promise<void>;

    addSelfToGroup(group: string[]): Promise<void>;
    removeSelfFromGroup(group: string[]): Promise<void>;

    accessTokenAuthorizedScopes(q: any, scope: string[]|string): Promise<AuthorizedScopePair[]>
    isAccessTokenAuthorizedToDo(q: any, scope: string[]|string): Promise<boolean>

    selfAccessTokenAuthorizedScopes(scope: string[]|string): Promise<AuthorizedScopePair[]>
    isSelfAccessTokenAuthorizedToDo(scope: string[]|string): Promise<boolean>;

    userAuthorizedScopes(id: string, scope: string[]|string): Promise<AuthorizedScopePair[]>
    isUserAuthorizedToDo(id: string, scope: string[]|string): Promise<boolean>

    selfUserAuthorizedScopes(scope: string[]|string): Promise<AuthorizedScopePair[]>;
    isSelfUserAuthorizedToDo(scope: string[]|string): Promise<boolean>;

    listUserAuthorizedScopes(id: string): Promise<string[]>
    listSelfUserAuthorizedScopes(): Promise<string[]>;

    findClients(query: BasicFindOptions): Promise<IClient[]|number>;
    findClient(query: any): Promise<IClient>;
    createClient(Cliengt: IClient): Promise<string>;
    updateClient(id: string, fields: any): Promise<void>
    deleteClients(query: BasicFindQueryOptions): Promise<void>;
    deleteClient(query: any): Promise<void>;
    getSelfIdentityEntityByAccessToken(accessTokenId: string): Promise<IIdentityEntity>;
    getIdentityEntityByAccessToken(accessTokenId: string): Promise<IIdentityEntity>;
    getSelfUser(): Promise<IUser|null>;

    getAccessTokenForm(req: OAuthTokenRequest): Promise<OAuthTokenForm>;
    getAccessToken(req: OAuthTokenRequest): Promise<IFormalAccessToken>;
    getAccessTokensForScope(userId: string, scope: string[]|string): Promise<AccessTokenSet>;
    getFormalAccessTokensForScope(userId: string, scope: string[]|string): Promise<FormalAccessTokenSet>;
    accessTokenFromRefresh(id: string): Promise<IAccessToken|null>;
    selfAccessTokenFromRefresh(id: string): Promise<IAccessToken|null>;
    updateAccessToken(id: string, fields: any): Promise<void>;
    updateAccessTokenByToken(token: string, fields: any): Promise<void>;

    findAccessTokens(query: BasicFindOptions): Promise<IAccessToken[]|number>;
    findSelfAccessTokens(query: BasicFindOptions): Promise<IAccessToken[]|number>;
    getRPCContext(): Promise<RPCContext>;

    accessTokenToFormal(id: string): Promise<IFormalAccessToken|null>;
    selfAccessTokenToFormal(id: string): Promise<IFormalAccessToken|null>;

    redisFlushAll(): Promise<void>;

    createIPFSEntityFromLocation(loc: ILocation, pin?: boolean): Promise<string|null>;
    pinIPFSEntity(id: string): Promise<void>;
    unpinIPFSEntity(id: string): Promise<void>;
    copyLocationToNewIPFSEntity(inLoc: string, pin?: boolean): Promise<string>;

    findEvents<T>(query: BasicFindOptions): Promise<IEvent<T>[]|number>;
    findEvent<T>(query: any): Promise<IEvent<T>>;
    createEvent<T>(type: string, event?: Partial<IEvent<T>>): Promise<string>;
}
