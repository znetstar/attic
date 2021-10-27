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

export interface IIPFSResource {
  cid: Uint8Array;
  path?: string;
  mode?: number|string;
  mtime?: number;
}

export interface IMirroredResource {
  mirrors: ILocation[];
}

export type IHTTPResourceEntity = IEntity&IHTTPResource;
export type IIPFSResourceEntity = IEntity&IIPFSResource;
export type IMirroredResourceEntity = IEntity&IMirroredResource;
