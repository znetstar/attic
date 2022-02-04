import EncodeTools,{SerializationFormat, SerializationFormatMimeTypes, MimeTypesSerializationFormat,EncodingOptions} from '@znetstar/encode-tools/lib/EncodeTools';

import {AtticS3ApplicationContext as ApplicationContext} from "./Atticfile";
import {IHTTPResponse as IHTTPResponseBase, unwrapPut,getFormatsFromContext} from '@znetstar/attic-common/lib/IRPC';
import {IDriver, IDriverDelete, IDriverOf, IDriverOfFull, IDriverPut} from "@znetstar/attic-common/lib/IDriver";
import {createEntityFromLocation, IS3ResourceEntity, objectRefs} from "./S3ResourceEntity";
import {ILocation} from "@znetstar/attic-common";
export type IHTTPResponse = IHTTPResponseBase&{ body?: Buffer };
import  { Document } from 'mongoose';
import * as Minio from "minio";

type IHttpContext = any;

export default class MinioDriver implements IDriverOf<IHTTPResponse, Buffer>, IDriverPut<IHTTPResponse, Buffer, Minio.ItemBucketMetadata>, IDriverDelete<IHTTPResponse>  {
  constructor() {

  }

  static async getObject(bucket: string, key: string): Promise<Buffer> {
    const stream = await ApplicationContext.minio.getObject(bucket, key);

    return new Promise<Buffer>((resolve, reject) => {
      let arr: Buffer[] = [];
      stream.on('data', (chunk) => arr.push(chunk));
      stream.once('error', (err) => reject(err));
      stream.once('end', () => resolve(Buffer.concat(arr)));
    });
  }

  static async createEntityFromLocation(loc: ILocation): Promise<IS3ResourceEntity&Document|null> {
    const { Location, S3ResourceEntity } = (ApplicationContext.mongoose as any).models;

    if (loc.entity) return loc.entity as IS3ResourceEntity&Document;
    let existingEntity = await S3ResourceEntity.findOne({ 'source.href': loc.href }).exec();
    if (existingEntity) return existingEntity;

    let obj: any = {};

    try {
      const ref = objectRefs(loc.href);
      obj = await MinioDriver.getObject(ref.Bucket, ref.Key)
    } catch (err) {
      if (err.code !== 'NoSuchKey') {
        throw err;
      }
    }

    const source = new Location({ href: loc.href });
    const entity = await S3ResourceEntity.create({
      ...objectRefs(loc.href),
      ...obj,
      source
    });

    return entity;
  }

  protected async getEntity(loc: ILocation&Document): Promise<IS3ResourceEntity&Document|null> {
    const entity: (IS3ResourceEntity&Document)|null = (loc.entity || await MinioDriver.createEntityFromLocation(loc)) as IS3ResourceEntity&Document;
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


    const content = await ApplicationContext.minio.statObject(objectRefs(entity.source.href).Bucket, objectRefs(entity.source.href).Key);

    return {
      href: loc.href,
      status: 200,
      method: 'HEAD',
      headers: new Map<string,string>([
        [ 'Content-Type', (content.metaData || {})['Content-Type'] as string ],
        [ 'Content-Length', content.size.toString() as string ],
        [ 'ETag', content.etag as string ]
      ])
    }
  }

  public async get(loc: ILocation & Document): Promise<IHTTPResponse> {
    const entity = await this.getEntity(loc);

    if (!entity) {
      return { href: loc.href, status: 404, method: 'GET' };
    }

    const [content, body] = await Promise.all([
      ApplicationContext.minio.statObject(objectRefs(entity.source.href).Bucket, objectRefs(entity.source.href).Key),
      MinioDriver.getObject(objectRefs(entity.source.href).Bucket, objectRefs(entity.source.href).Key)
    ]);

    return {
      href: loc.href,
      status: 200,
      method: 'GET',
      body: Buffer.from(body),
      headers: new Map<string,string>([
        [ 'Content-Type', (content.metaData || {})['Content-Type'] as string ],
        [ 'Content-Length', content.size.toString() as string ],
        [ 'ETag', content.etag as string ]
      ])
    }
  }

  public async put(loc: ILocation & Document, data: Buffer, options?: Minio.ItemBucketMetadata): Promise<IHTTPResponse> {
    const entity = await this.getEntity(loc);

    if (!entity) {
      return { href: loc.href, status: 404, method: 'PUT' };
    }

    const content = await ApplicationContext.minio.putObject(
      objectRefs(entity.source.href).Bucket,
      objectRefs(entity.source.href).Key,
      data,
      {
        'Content-Type': (loc as any).httpContext.req.headers['content-type'],
        ...(options || {})
      }
    );

    return {
      href: loc.href,
      status: 201,
      method: 'PUT',
      headers: new Map<string,string>([
        [ 'Location', loc.href ],
        [ 'ETag', content.etag ]
      ])
    }
  }

  public async delete(loc: ILocation & Document): Promise<IHTTPResponse> {
    const entity = await this.getEntity(loc);

    if (!entity) {
      return { href: loc.href, status: 404, method: 'DELETE' };
    }

    await ApplicationContext.minio.removeObject(
      objectRefs(entity.source.href).Bucket,
      objectRefs(entity.source.href).Key
    );

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

    const stream = await ApplicationContext.minio.listObjects(
      objectRefs(entity.source.href).Bucket,
      objectRefs(entity.source.href).Key
    );

    const objects = await new Promise<Minio.BucketItem[]>((resolve, reject) => {
      const objects: Minio.BucketItem[] = [];
      stream.on('data', (obj) => objects.push(obj));
      stream.once('error', (err) => reject(err));
      stream.once('end', () => resolve(objects));
    });

    const body = Buffer.from(EncodeTools.WithDefaults.serializeObject(objects, outFormat));

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
