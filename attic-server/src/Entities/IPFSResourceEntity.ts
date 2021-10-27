import { IEntity, default as Entity } from '../Entity';
import { Schema, Document } from 'mongoose';
import mongoose from '../Database';
import { IIPFSResourceEntity as IIPFSResourceEntityBase } from '@znetstar/attic-common/lib/IEntity'
import {IHTTPResourceEntity} from "./HTTPResourceEntity";
import Location, {ILocation} from "../Location";
import ApplicationContext from "../ApplicationContext";
import {GenericError, HTTPMirroredLocationMustHaveDriverError} from "@znetstar/attic-common/lib/Error";
import RPCServer from "../RPC";
const CID = require('cids');

import {ProtocolMustBeIPFSError} from "@znetstar/attic-common/lib/Error/Entity";

export interface IIPFSResourceEntityModel {
  cid: Buffer;
  path?: string;
  mode?: number|string;
  mtime?: Date;
  name?: string;
  size?: number;
  autopin?: boolean;

  getCid(): typeof CID.prototype;
  pin(): Promise<void>;
  unpin(): Promise<void>;
  load(): Promise<void>;
}

export type IIPFSResourceEntity = IIPFSResourceEntityBase&IIPFSResourceEntityModel&IEntity&IHTTPResourceEntity;

export const IPFSResourceEntitySchema = <Schema<IEntity&IIPFSResourceEntity>>(new (mongoose.Schema)({
  autopin: {
    type: Boolean,
    required: false
  },
  cid: {
    type: Buffer,
    required: true,
    validate: (v: Buffer) => (new CID(v))
  },
  path: {
    type: String
  },
  mode: {
    type: Schema.Types.Mixed,
    required: false
  },
  mtime: {
    type: Date,
    required: false
  },
  name: {
    type: String,
    required: false
  },
  size: {
    type: Number,
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

IPFSResourceEntitySchema.methods.load = async function () {
  for await (const file of ApplicationContext.ipfsClient.ls(this.getCid())) {
    const delta = {
      size: file.size,
      path: file.path,
      mode: file.mode,
      name: file.name,
      mtime: file.mtime ? new Date(file.mtime.secs*1e3) : void(0),
    };
    for (let k in delta) {
      this[k] = (delta as any)[k];
    }

    break;
  }
}

IPFSResourceEntitySchema.methods.getCid = function (): typeof CID {
  return new CID(Buffer.from(this.cid));
}

IPFSResourceEntitySchema.methods.pin = async function (){
  const cid = this.getCid();

  await ApplicationContext.ipfsClient.pin.add(cid);
}

IPFSResourceEntitySchema.methods.unpin = async function (){
  const cid = this.getCid();

  await ApplicationContext.ipfsClient.pin.rm(cid);
}

IPFSResourceEntitySchema.pre<IIPFSResourceEntity&Document>('save', async function () {
  const self: IIPFSResourceEntity&Document = this;
  if (self.isNew && self.autopin) {
    await self.pin();
  }
});

IPFSResourceEntitySchema.index({ cid: 1 }, {});
IPFSResourceEntitySchema.index({ cid: 1, path: 1 }, { unique: true });

export async function copyLocationToNewEntity(inLoc: ILocation&Document, pin?: boolean): Promise<IIPFSResourceEntity&Document> {
  if (!inLoc.driver || !ApplicationContext.config.drivers.includes(inLoc.driver)) {
    throw new HTTPMirroredLocationMustHaveDriverError();
  }

  await inLoc.populate('entity').execPopulate();

  const Driver = inLoc.getDriver();
  const driver = new Driver();

  const buf = await driver.get(inLoc);
  const file = await ApplicationContext.ipfsClient.add(buf.body, { pin });
  return createEntityFromFile(file, pin, true);
}

export async function createEntityFromFile(file: any, pin?: boolean, noLoad?: boolean): Promise<IIPFSResourceEntity&Document> {
  const entity = new IPFSResourceEntity({
    source: {
      href: `ipfs://ipfs/${file.cid.toString()}${ file.path ? file.path : '' }`
    },
    cid: Buffer.from(file.cid.bytes),
    status: 200,
    method: 'GET',
    type:  'IPFSResourceEntity',
    autopin: pin
  }) as IIPFSResourceEntity&Document;

  if (!noLoad) await entity.load();

  return entity;
}

export async function createEntityFromLocation(inLoc: ILocation, pin?: boolean): Promise<IIPFSResourceEntity&Document|null> {
  if (inLoc.entity) return inLoc.entity as IIPFSResourceEntity&Document;
  let existingEntity = await IPFSResourceEntity.findOne({ 'source.href': inLoc.href }).exec();
  if (existingEntity) return existingEntity as IIPFSResourceEntity&Document;

  const location = require('url').parse(inLoc.href);
  if (location.protocol !== 'ipfs:')
    throw new ProtocolMustBeIPFSError();
  const files = ApplicationContext.ipfsClient.ls(location.pathname.substr(1));
  for await (const file of files) {
    if (file.type !== 'file')
      continue;

    return createEntityFromFile(file, pin);
  }

  return null;
}

RPCServer.methods.createIPFSEntityFromLocation = async function (loc: ILocation, pin?: boolean): Promise<string|null> {
  const entity = await createEntityFromLocation(loc, pin);

  await entity.save();

  if (entity) return entity._id.toString();
  return null;
}


RPCServer.methods.pinIPFSEntity = async function (id: string): Promise<void> {
  const ipfsEntity: IIPFSResourceEntity&Document = await IPFSResourceEntity.findById(id).exec() as IIPFSResourceEntity&Document;
  await ipfsEntity.pin();
}

RPCServer.methods.unpinIPFSEntity = async function (id: string): Promise<void> {
  const ipfsEntity: IIPFSResourceEntity&Document = await IPFSResourceEntity.findById(id).exec() as IIPFSResourceEntity&Document;
  await ipfsEntity.unpin();
}

RPCServer.methods.copyLocationToNewIPFSEntity = async function (location: any, pin?: boolean): Promise<string|null> {
  const inLoc = await Location.hydrate(location).populate('entity').execPopulate();

  if (!inLoc) return null;
  let entity = await copyLocationToNewEntity(inLoc, pin);
  let existingEntity: IIPFSResourceEntity&Document|undefined = await IPFSResourceEntity.findOne({
    cid: entity.cid
  }).exec() as IIPFSResourceEntity&Document|undefined ;
  if (!existingEntity) {
    await entity.save();
  } else {
    entity = existingEntity;
  }
  return entity._id.toString();
}

const IPFSResourceEntity = Entity.discriminator('IPFSResourceEntity', IPFSResourceEntitySchema)
export default IPFSResourceEntity;
