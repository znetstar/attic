import {ILocation} from '../Location';
import {getFormatsFromContext, IHTTPResponse} from "./HTTPCommon";
import {Document} from 'mongoose';
import Driver from "./Driver";
import ApplicationContext from "../ApplicationContext";
import {IDriverDelete, IDriverPut} from "@znetstar/attic-common";
import IPFSResourceEntity, {
  createEntityFromFile,
  createEntityFromLocation,
  IIPFSResourceEntity
} from "../Entities/IPFSResourceEntity";


import { IIPFSResourceEntity as IIPFSResourceEntityBase } from "@znetstar/attic-common/lib/IEntity";
import {SerializationFormat, SerializationFormatMimeTypes} from '@znetstar/encode-tools/lib/EncodeTools';
import {EncodeTools as EncodeTools} from '@znetstar/encode-tools/lib/EncodeTools';
import {GenericError} from "@znetstar/attic-common/lib/Error";
import {IPutEnvelope, unwrapPut} from "@znetstar/attic-common/lib/IRPC";

export class ProtocolMustBeIPFSError extends GenericError {
  constructor() { super('Protocol must be "ipfs:"', 0, 400); }
}

export default class IPFSDriver extends Driver<IHTTPResponse> implements IDriverPut<IHTTPResponse, Buffer, any>, IDriverDelete<IHTTPResponse> {

  constructor(protected encodeTools = new EncodeTools({ serializationFormat: SerializationFormat.json })) {
    super();
  }
  public async getHead(loc: ILocation & Document): Promise<[ IIPFSResourceEntity&Document, IHTTPResponse ] > {
    let entity: (IIPFSResourceEntity&Document)|null = (loc.entity || await createEntityFromLocation(loc)) as IIPFSResourceEntity&Document;
    if (!entity) {
      return [entity, { href: loc.href, status: 404, method: 'HEAD' } ];
    }

    const headers = new Map<string, string>();
    if (typeof(entity.size) !== 'undefined')  {
      headers.set('Content-Length', entity.size.toString());
    }
    return [
      entity, {
        href: loc.href,
        status: 200,
        method: 'HEAD',
        headers
      }
    ];
  }

  public async head(loc: ILocation & Document): Promise<IHTTPResponse> {
    const [ entity, httpResp ] = await this.getHead(loc);

    return httpResp;
  }

  public async get(loc: ILocation & Document): Promise<IHTTPResponse> {
    const [ entity, httpResp ] = await this.getHead(loc);

    let body: Buffer[] = [];
    for await (const buf of ApplicationContext.ipfsClient.cat(entity.getCid())) {
      body.push(Buffer.from(buf));
    }
    httpResp.body = Buffer.concat(body);

    return httpResp;
  }

  public async put(loc: ILocation & Document, data: Buffer, options?: unknown): Promise<IHTTPResponse> {
    const file = await ApplicationContext.ipfsClient.add(data as any, options);

    const ipfsEntity = new IPFSResourceEntity({
      ...file,
      cid: Buffer.from(file.cid.bytes)
    });

    await ipfsEntity.save();

    // @ts-ignore
    loc.entity = ipfsEntity;
    await loc.save();

    return {
      href: loc.href,
      status: 201,
      method: 'PUT',
      headers: new Map([
        [ 'Location', `ipfs://${file.cid.toString()}${ file.path ? file.path : '' }` ]
      ])
    };
  }

  public async delete(loc: ILocation & Document): Promise<IHTTPResponse> {
    const [ entity, resp ] =  await this.getHead(loc);

    if (resp.status !== 200) {
      return resp;
    }

    await ApplicationContext.ipfsClient.files.rm(entity.getCid());
    return {
      href: loc.href,
      status: 204,
      method: 'DELETE'
    };
  }

  public async list(loc: ILocation & Document): Promise<IHTTPResponse> {
    const { outFormat } = getFormatsFromContext(loc.httpContext, this.encodeTools.options);
    const files: (IIPFSResourceEntity&Document)[] = [];
    const iterator = await ApplicationContext.ipfsClient.ls(loc.pathname);

    for await (const file of iterator) {
      files.push(await createEntityFromFile(file));
    }

    const result = files.map(f => f.toJSON());
    const body = await this.encodeTools.serializeObject(result, outFormat);

    return {
      href: loc.href,
      status: 200,
      method: 'GET',
      headers: new Map<string, string>([
        [ 'Content-Length', body.byteLength.toString() ],
        [ 'Content-Type', SerializationFormatMimeTypes.get(outFormat) as string]
      ]),
      body
    };
  }
}
