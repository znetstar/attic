import {IIdentity} from "./IIdentity";
import {IAccessToken} from "./IAccessToken";
export interface IUser {
   id: string;
   _id: string|any;
   identities: (any|IIdentity)[];
   scope: string[];
   username: string;
   disabled?: boolean;
}

export interface IGetTokenResponse {
   token: IAccessToken|null;
   scope: string;
}

export default IUser;