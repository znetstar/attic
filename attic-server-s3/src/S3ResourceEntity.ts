import IEntity, {IHTTPResourceEntity} from "@znetstar/attic-common/lib/IEntity";
import {Document, Schema} from "mongoose";
import { S3 } from 'aws-sdk';
import {GenericError} from "@znetstar/attic-common/lib/Error/GenericError";
import {ILocation} from "@znetstar/attic-common";
import {AtticS3ApplicationContext as ApplicationContext} from "./Atticfile";
export interface IS3Resource {
  Bucket?: string;
  Key?: string;
  ContentLength?: number;
  ContentType?: string;
  LastModified?: Date;
  Metadata?: unknown;
  VersionId?: string;
  objectRefs(): { Bucket: string, Key: string };

  load(): Promise<void>;
}


export class ProtocolMustBeS3Error extends GenericError {
  constructor() { super('Protocol must be "s3:"', 0, 400); }
}

export type IS3ResourceEntity = IS3Resource&IHTTPResourceEntity;
export const S3ResourceEntitySchema = <Schema<IEntity&IS3ResourceEntity>>(new (Schema)({
  ContentLength: {
    type: Number,
    required: false
  },
  ContentType: {
    type: String,
    required: false
  },
  LastModified: {
    type: Date,
    required: false
  },
  Metadata: {
    type: Schema.Types.Mixed,
    required: false
  },
  VersionId: {
    type: String,
    required: false
  },
  Bucket: {
    type: String,
    required: false
  },
  Key: {
    type: String,
    required: false
  },
  headers: {
    type: Map,
    required: false
  },
  body: {
    type: Buffer,
    required: false
  },
  method: {
    type: String,
    required: false
  },
  status: {
    type: Number,
    required: false
  }
}));

S3ResourceEntitySchema.pre<IS3ResourceEntity&Document>([ 'save', 'init' ] as any, async function () {
  if (this?.source?.href) this.Bucket = objectRefs(this.source.href).Bucket;
  if (this?.source?.href) this.Key = objectRefs(this.source.href).Key;
});

export function  objectRefs(href: string): { Bucket: string, Key: string, [ name: string ]: any } {
  const url = require('url').parse(href);

  if (url.protocol !== 's3:')
    throw new ProtocolMustBeS3Error();

  return {
    Bucket: url.host as string,
    Key: (url.pathname as string).substr(1),
    ...require('querystring').parse(url.query)
  } as any
}

S3ResourceEntitySchema.methods.objectRef = function (): { Bucket: string, Key: string } {
  return objectRefs(this.source.href);
}

export async function createEntityFromLocation(loc: ILocation): Promise<IS3ResourceEntity&Document|null> {
  const { Location, S3ResourceEntity } = (ApplicationContext.mongoose as any).models;

  if (loc.entity) return loc.entity as IS3ResourceEntity&Document;
  let existingEntity = await S3ResourceEntity.findOne({ 'source.href': loc.href }).exec();
  if (existingEntity) return existingEntity;

  let obj: any = {};

  try {
    obj = await ApplicationContext.s3.getObject({
      ...objectRefs(loc.href)
    }).promise();
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
