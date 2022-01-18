import {IUser} from "./IUser";
import {IHTTPResourceEntity} from "./IEntity";
import IClient from "./IClient";

export interface IIdentity {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    _id: string;
    id: string;
    otherFields?: any;
    externalId: any;
    photo?: Uint8Array;
}

export type IIdentityEntity = IHTTPResourceEntity&IHTTPResourceEntity&{ clientName: string, client: string|IClient, user: string|IUser }&IIdentity;

export default IIdentity;
