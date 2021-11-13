
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
    auth?: string[]|string;
    entity?: IEntity|string;
    driver?: string;
    search?: string;
    expiresAt?: Date;
    driverOptions?: any;
    cacheExpireIn?: number;
}

export function defaultLocation(): ILocation {
    return {
        href: ''
    };
}
