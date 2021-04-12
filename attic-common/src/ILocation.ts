
import Constructible from "./Constructible";
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
    auth?: string[];
    entity?: IEntity|string;
    driver?: string;
    search?: string;
    expiresAt?: Date;
    driverOptions?: any;
}

export function defaultLocation(): ILocation {
    return {
        href: ''
    };
}