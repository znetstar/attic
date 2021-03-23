import ILocation from "./ILocation";

export default interface IEntity {
    id?: string;
    _id?: string;
    source: ILocation;
    type: string;
}

export interface IHTTPResource {
    headers?: [string, string][];
    body?: Uint8Array;
    method?: string;
    status?: number;
}

export type IHTTPResourceEntity = IEntity&IHTTPResource;