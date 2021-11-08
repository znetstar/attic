import Location, {ILocation, LocationSchema} from '../Location';
import { IEntity, default as Entity } from '../Entity';
import { Mongoose, Schema, Document } from 'mongoose';
import config from '../Config';
import mongoose from '../Database';
import { ObjectId } from 'mongodb';
import { IMirroredResourceEntity as IMirroredResourceEntityBase } from '@znetstar/attic-common/lib/IEntity'
import ApplicationContext from "../ApplicationContext";

export interface IMirroredResourceEntityModel {
  mirrors: ILocation[];
}

export type IMirroredResourceEntity = IMirroredResourceEntityBase&IMirroredResourceEntityModel;

export const MirroredResourceEntitySchema = <Schema<IEntity&IMirroredResourceEntity>>(new (mongoose.Schema)({
  mirrors: {
    type: [
      {
        ref: 'Location',
        type: Schema.Types.ObjectId
      }
    ]
  }
}));

let MirroredResourceEntity = Entity.discriminator('MirroredResourceEntity', MirroredResourceEntitySchema);

export default MirroredResourceEntity;
