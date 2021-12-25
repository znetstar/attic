import Location, {ILocation} from '../Location';
import {getFormatsFromContext, IHTTPResponse} from "./HTTPCommon";
import {Document} from 'mongoose';
import Driver from "./Driver";
import ApplicationContext from "../ApplicationContext";
import {IDriverDelete, IDriverPut} from "@znetstar/attic-common";
import {SerializationFormat, SerializationFormatMimeTypes} from '@znetstar/encode-tools/lib/EncodeTools';
import {EncodeTools as EncodeTools} from '@znetstar/encode-tools/lib/EncodeTools';
import {GenericError} from "@znetstar/attic-common/lib/Error";
import MirroredResourceEntity, {IMirroredResourceEntity, IMirroredResourceEntityModel} from "../Entities/MirroredResourceEntity";
import {getHttpResponse} from "../Web/ResolverMiddleware";
import {HTTPMirroredLocationMustHaveDriverError, HTTPMirroredRequestMustHaveResponseError} from "@znetstar/attic-common/lib/Error/Driver";
import {BrokenLinkError} from "@znetstar/attic-common/lib/Error/GenericError";

export default class HTTPMirrorDriver<T extends IHTTPResponse, B, O> extends Driver<T> implements IDriverPut<T, B, O>, IDriverDelete<T> {
  constructor(protected encodeTools = new EncodeTools({ serializationFormat: SerializationFormat.json })) {
    super();
  }

  public async mirrorRequest(inLocation: ILocation&Document, update?: boolean): Promise<T> {
    const entity: IMirroredResourceEntity&Document = inLocation.entity as IMirroredResourceEntity&Document ;
    if (!entity) {
      throw new BrokenLinkError();
    }
    const mirrorLocations: (ILocation)[] = [ /*entity.source as ILocation,*/ ...(entity as any)._doc.mirrors ];
    let lastErr: any, lastResp: T;
    for (let mirror of mirrorLocations) {
      if ((mirror as any)._bsontype === 'ObjectID')
        // @ts-ignore
        mirror = await Location.findById(mirror).populate('entity').exec();
      if (!mirror.driver || !ApplicationContext.config.drivers.includes(mirror.driver)) {
        throw new HTTPMirroredLocationMustHaveDriverError();
      }

      try  {
        const resp = await getHttpResponse(
          inLocation.httpContext.req,
          inLocation.httpContext.res,
          mirror
        ) as T;

        if (resp && !lastResp)
          lastResp = resp;
        if (!update && (resp.status < 400))
          break;
      } catch (error) {
        lastErr = error;
      }
    }

    if (lastErr)
      throw lastErr;
    else if (lastResp)
      return lastResp;
    else
      throw new HTTPMirroredRequestMustHaveResponseError();
  }

  public async head(loc: ILocation & Document): Promise<T> {
    return this.mirrorRequest(loc, false);
  }

  public async get(loc: ILocation & Document): Promise<T> {
    return this.mirrorRequest(loc, false);
  }

  public async put(loc: ILocation & Document, content: B): Promise<T> {
    return this.mirrorRequest(loc, true);
  }

  public async delete(loc: ILocation & Document): Promise<T> {
    return this.mirrorRequest(loc, true);
  }

  public async list(loc: ILocation & Document): Promise<T> {
    return this.mirrorRequest(loc, false);
  }
}
