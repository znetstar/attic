
import Constructible from "./Constructible";
import {default as ICredentials} from "./ICredentials";
import IEntity from "./IEntity";
import IResolver from "./IResolver";

export default interface ILocation {
    id?: any;
    _id?: any;
    protocol?: string;
    host?: string;
    hostname?: string;
    port?:  string;
    pathname?: string;
    path?: string;
    href: string;
    auth?: ICredentials|string;
    entity?: IEntity|string;
    driver?: string;
    search?: string;
}

export function defaultLocation(): ILocation {
    return {
        href: ''
    };
}