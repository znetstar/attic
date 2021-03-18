import {IIdentity} from "./IIdentity";

export interface IUser {
   id: string;
   _id: string|any;
   identities: (any|IIdentity)[];
   scope: string[];
   username: string;
   disabled?: boolean;
}

export default IUser;