import { IUser} from "./IUser";
import { default as IAccessToken } from "./IAccessToken";

export enum IClientRole {
    provider = 'provider',
    consumer = 'consumer',
    registration = 'registration'
}

export interface IClient {
    _id: string;
    id: string;
    preferExistingUser?: boolean;
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
    authorizeUri?: string;
    name?: string;
    tokenUri?: string;
    role: (IClientRole|string)[];
    scope: string[];
    expireAccessTokenIn?: number;
    expireRefreshTokenIn?: number;
    refreshTokenUri?: string;
    uriSubstitutions?: [string,string][];
    scopeJoin?: string
    sendStateWithRedirectUri?: boolean;
    defaultUser?: string|IUser;
    defaultUsername?: string;
}

export default IClient;
