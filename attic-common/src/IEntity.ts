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

export interface IPFSResource {
  cid: Uint8Array
}

export type IHTTPResourceEntity = IEntity&IHTTPResource;
export type IIPFSResourceEntity = IEntity&IPFSResource;
