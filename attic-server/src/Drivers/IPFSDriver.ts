import Location, { LocationSchema, ILocation } from '../Location';
import Entity, {IEntity} from '../Entity';
import { IDriver} from "@znetstar/attic-common/lib/IDriver";
import { IHTTPResourceEntity } from '../Entities/HTTPResourceEntity'
import {IHTTPResponse} from "./HTTPCommon";
import { Document } from 'mongoose';
import Constructible from "../Constructible";
import Driver from "./Driver";
import * as _ from 'lodash';
import {IUser} from "../User";
import {HTTPDriverBase} from "./HTTPDriverBase";
import {create, IPFSHTTPClient, Options as IPFSOptions} from 'ipfs-http-client';
import ApplicationContext from "../ApplicationContext";
import {HTTPResourceEntity} from "../Entities";
import URL from 'url';

export default class IPFSDriver extends Driver<IHTTPResponse> {
  public get ipfsClient(): IPFSHTTPClient {
    return ApplicationContext.ipfsClient as IPFSHTTPClient;
  }
  constructor(public basePathname: string = '', public options?: IPFSOptions) {
    super();
  }

  static async connect(options?: IPFSOptions) {
    if (ApplicationContext.ipfsClient)
      return;
    await ApplicationContext.triggerHook(`IPFSDriver.connect.start`);
    ApplicationContext.ipfsClient = await create({
      url: ApplicationContext.config.ipfsUri || process.env.IPFS_URI as string,
      ...(options || {} as IPFSOptions)
    });
    await ApplicationContext.triggerHook(`IPFSDriver.connect.complete`);
  }

  public connect =  async () => {
    return IPFSDriver.connect(this.options);
  }


  public async head(location: ILocation&Document): Promise<IHTTPResponse> {
    const doc = await this.getHead(location);

    delete doc.body;
    return doc;
  }

  public async get(location: ILocation&Document): Promise<IHTTPResponse> {
    return this.getHead(location);
  }

  protected async getHead(location: ILocation&Document): Promise<IHTTPResponse> {
    const path = location.pathname.replace(this.basePathname, '');
    let iterator: any;
    let buf: Buffer[] = [];
    const files: any[] = [];
    let options: any = { archive: false };
    const q = new URL.URL(location.href);
    let contentType = 'application/octet-stream';
    for (let [k,v] of Array.from(q.searchParams.entries())) {
      options[k] = JSON.parse(v);
    }
    if (options.archive)
      contentType = 'application/gzip'
    if (path[path.length - 1] === '/') {
      contentType = 'application/json';
      iterator = await this.ipfsClient.ls(path.substr(0, path.length - 1));
      for await (const file of iterator) {
        files.push(file);
      }
      buf.push(Buffer.from(JSON.stringify(files), 'utf8'));
    } else {
      iterator = await this.ipfsClient.ls(path);
      for await (const file of iterator) {
        if (file.type === 'file') {
          iterator = await this.ipfsClient.cat(path, options);
          for await (const chunk of iterator) {
            buf.push(chunk);
          }
        } else if (file.type === 'dir') {
          iterator = await this.ipfsClient.get(path, options);
          for await (const chunk of iterator) {
            buf.push(chunk);
          }
        }

        break;
      }
    }
    const body = Buffer.concat(buf);
    try {
      const mmm = require('mmmagic'),
        Magic = mmm.Magic;
      const magic = new Magic(mmm.MAGIC_MIME_TYPE);
      contentType = await new Promise<string>((resolve, reject) => {
        magic.detectFile(body, function (err: any, result: any) {
          if (err) reject(err);
          else resolve(result);
        });
      }) || contentType;
    } catch (err) {
    }
    return {
      body: body,
      headers: new Map<string,string>([
          ...contentType ? [ [ 'Content-Type', contentType ] ] : ([] as any[]),
        [ 'Content-Length', body.byteLength.toString() ]
      ]),
      method: 'GET',
      status: !body.byteLength ? 404 :  200,
      href: location.href
    }
  }
}

ApplicationContext.registerHook('Drivers.IPFSDriver.init', async () => {
  await IPFSDriver.connect(ApplicationContext.config.ipfsOptions as IPFSOptions|undefined);
});
