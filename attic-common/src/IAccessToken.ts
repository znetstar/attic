import {IUser} from "./IUser";
import IClient from "./IClient";

export enum TokenTypes {
    Bearer = 'bearer',
    RefreshToken = 'refresh_token'
};

export interface IAccessToken {
    tokenType: TokenTypes;
    expiresAt: Date;
    token: string;
    scope: string[];
    client: IClient|string;
    clientName: string;
    user?: IUser|string;
    otherFields?: any;
}

export interface IFormalAccessToken {
    access_token: string;
    token_type: TokenTypes,
    expires_in: number;
    refresh_token?: string;
    scope?: string;
}

export type AuthorizedScopePair = [ string, string[] ];
export type ScopeAccessTokenPair = [ string, IAccessToken ];
export type ScopeFormalAccessTokenPair = [ string, IFormalAccessToken ];
export type FormalAccessTokenSet = ScopeFormalAccessTokenPair[];
export type AccessTokenSet = ScopeAccessTokenPair[];

export default IAccessToken;
