import EncodeTools,{SerializationFormat, SerializationFormatMimeTypes, MimeTypesSerializationFormat,EncodingOptions} from '@etomon/encode-tools/lib/EncodeTools';

import {AtticS3ApplicationContext as ApplicationContext} from "./Atticfile";
import {IHTTPResponse as IHTTPResponseBase, unwrapPut,getFormatsFromContext} from '@znetstar/attic-common/lib/IRPC';
import {IDriver, IDriverDelete, IDriverOf, IDriverOfFull, IDriverPut} from "@znetstar/attic-common/lib/IDriver";
import {createEntityFromLocation, IS3ResourceEntity, objectRefs} from "./S3ResourceEntity";
import {ILocation} from "@znetstar/attic-common";
export type IHTTPResponse = IHTTPResponseBase&{ body?: Buffer };
import  { Document } from 'mongoose';
import {S3} from "aws-sdk";


type IHttpContext = any;


export default class S3Driver implements IDriverOf<IHTTPResponse, Buffer>, IDriverPut<IHTTPResponse, Buffer, S3.PutObjectRequest>, IDriverDelete<IHTTPResponse>  {
  constructor() {
  }

  protected async getEntity(loc: ILocation&Document): Promise<IS3ResourceEntity&Document|null> {
    const entity: (IS3ResourceEntity&Document)|null = (loc.entity || await createEntityFromLocation(loc)) as IS3ResourceEntity&Document;
    if (!entity) {
      return null
    }
    return entity;
  }

  public async head(loc: ILocation & Document): Promise<IHTTPResponse> {
    const entity = await this.getEntity(loc);

    if (!entity) {
      return { href: loc.href, status: 404, method: 'HEAD' };
    }


    const content = await ApplicationContext.s3.headObject(objectRefs(entity.source.href)).promise();

    return {
      href: loc.href,
      status: 200,
      method: 'HEAD',
      headers: new Map<string,string>([
        [ 'Content-Type', content.ContentType as string ],
        [ 'Content-Length', content.ContentLength.toString() as string ],
        [ 'ETag', content.ETag as string ]
      ])
    }
  }

  public async get(loc: ILocation & Document): Promise<IHTTPResponse> {
    const entity = await this.getEntity(loc);

    if (!entity) {
      return { href: loc.href, status: 404, method: 'GET' };
    }

    const content = await ApplicationContext.s3.getObject(objectRefs(entity.source.href)).promise();
    return {
      href: loc.href,
      status: 200,
      method: 'GET',
      body: Buffer.from(content.Body as Uint8Array),
      headers: new Map<string,string>([
        [ 'Content-Type', content.ContentType as string ],
        [ 'Content-Length', content.ContentLength.toString() as string ],
        [ 'ETag', content.ETag as string ]
      ])
    }
  }

  public async put(loc: ILocation & Document, data: Buffer, options?:  S3.PutObjectRequest): Promise<IHTTPResponse> {
    const entity = await this.getEntity(loc);

    if (!entity) {
      return { href: loc.href, status: 404, method: 'PUT' };
    }

      const content = await ApplicationContext.s3.putObject({
      ...objectRefs(entity.source.href),
      ContentType: (loc as any).httpContext.req.headers['content-type'] || void(0),
      ...(options as any || {}),
      Body: data
    }).promise();

    return {
      href: loc.href,
      status: 201,
      method: 'PUT',
      headers: new Map<string,string>([
        [ 'Location', loc.href ],
        [ 'ETag', content.ETag ]
      ])
    }
  }

  public async delete(loc: ILocation & Document): Promise<IHTTPResponse> {
    const entity = await this.getEntity(loc);

    if (!entity) {
      return { href: loc.href, status: 404, method: 'DELETE' };
    }

    await ApplicationContext.s3.deleteObject({
      ...objectRefs(entity.source.href)
    }).promise();

    return {
      href: loc.href,
      status: 204,
      method: 'DELETE',
      headers: new Map<string,string>([
      ])
    }
  }

  public async list(loc: ILocation & Document): Promise<IHTTPResponse> {
    const entity = await this.getEntity(loc);

    const {  inFormat, outFormat }  = getFormatsFromContext((loc as any).httpContext);

    if (!entity) {
      return { href: loc.href, status: 404, method: 'GET' };
    }

    const objects = await ApplicationContext.s3.listObjects({
      ...objectRefs(entity.source.href)
    }).promise();

    const body = Buffer.from(EncodeTools.WithDefaults.serializeObject(objects.Contents, outFormat));

    return {
      href: loc.href,
      status: 200,
      method: 'GET',
      headers: new Map<string,string>([
        [ 'Content-Type', SerializationFormatMimeTypes.get(outFormat) as string ],
        [ "Content-Length", body.byteLength.toString() ]
      ]),
      body
    }
  }


}
