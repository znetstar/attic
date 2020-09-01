
import Constructible from "./Constructible";
import {default as IUser} from "./IUser";
import IEntity from "./IEntity";
import IResolver from "./IResolver";

export default interface ILocation {
    id?: any;
    _id?: any;
    protocol?: string;
    host?: string;
    hostname?: string;
    port?:  string;
    hash?: string;
    pathname?: string;
    path?: string;
    href: string;
    auth?: string;
    entity?: IEntity|string;
    driver?: string;
    search?: string;
    expiresAt?: Date;
}

export function defaultLocation(): ILocation {
    return {
        href: ''
    };
}