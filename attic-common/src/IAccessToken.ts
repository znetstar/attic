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
    user: IUser|string;
}

export default IAccessToken;