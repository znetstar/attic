import {IIdentity} from "./IIdentity";
import {IFormalAccessToken, IAccessToken} from "./IAccessToken";
export interface IUser {
   id: string;
   _id: string|any;
   identities: (any|IIdentity)[];
   scope: string[];
   username: string;
   disabled?: boolean;
   password?: string;
   groups?: string[];
   photo?: Uint8Array
}

export default IUser;
