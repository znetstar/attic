import {
  EncodeToolsSerializer,
  Transport,
  ServerSideTransport,
  ClientRequest,
  Serializer,
  Response,
  Message,
  Request, InternalError
} from 'multi-rpc-common';
import * as _ from 'lodash';
import {
  Server
} from 'multi-rpc';

import type { NextApiRequest, NextApiResponse } from 'next'
import {encodeOptions, makeSerializer} from "./_encoder";

import {
  RPCInterface,
} from '@thirdact/simple-mongoose-interface';
import {HTTPError, MarketplaceAPI, UnauthorizedRequest} from "./_rpcCommon";
import {MarketplaceSession} from "../api/auth/[...nextauth]";
import {getSession} from "next-auth/client";
import Redis from "ioredis";
import levelup from "levelup";
import {IORedisDown} from "@etomon/ioredisdown";
import {OAuthAgent} from "@znetstar/attic-cli-common/lib/OAuthAgent";
import {LRUMap} from 'lru_map';
import {marketplaceCreateNft, marketplaceGetNft} from "./_ntf-collection";
import {marketplaceCreateUser, marketplacePatchUser} from "./_user";

export type RequestData = {
  req: NextApiRequest,
  res: NextApiResponse<Response>,
  session: MarketplaceSession
}

export  type MarketplaceClientRequest = ClientRequest&{
  additionalData: RequestData
}


/**
 * `multi-rpc` ExpressTransport object, modified for use in Next.js
 * @author znetstar - https://github.com/znetstar/multi-rpc-express-transport
 */
export class RPCTransport extends Transport implements ServerSideTransport {
  /**
   * Creates an express router transport
   * @param serializer - Serializer
   * @param router - Underlying express router, will create if not given.
   */
  constructor(public serializer: Serializer) {
    super(serializer);
  }

  /**
   * A list of unique ids given to each request to prevent accidental re-runs
   * @protected
   */
  protected requestIds = new LRUMap(1e3);

  /**
   * Services each request from Next.js
   * @param req
   * @param res
   */
  public async onRequest(req: NextApiRequest, res: NextApiResponse<Response>) {
    if (req.headers['x-marketplace-idempotency-key'] && this.requestIds.has(req.headers['x-marketplace-idempotency-key'])) {
      res.statusCode = 409;
      res.end();

      return;
    }

    this.requestIds.set(req.headers['x-marketplace-idempotency-key'], true);

    const jsonData = await new Promise<Buffer>((resolve, reject) => {
      let buf: Buffer[] = [];
      req.on('data', (chunk: Buffer) =>   { buf.push(Buffer.from(chunk)); });
      req.once('error', (err) => reject(err));
      req.once('end', () => resolve(Buffer.concat(buf)));
    })

    const rawReq = new Uint8Array(jsonData);
    const clientRequest = new ClientRequest(req.headers['x-marketplace-idempotency-key'] || Transport.uniqueId(), (response?: Response) => {
      const headers: any = {};

      if (response) {
        headers["Content-Type"] = this.serializer.content_type;

        // @ts-ignore
      if (response.error?.data)
        // @ts-ignore
        response.error.data = JSON.parse(JSON.stringify(response.error?.data));

        const val = this.serializer.serialize(response);
        res.writeHead(200, headers);
        res.end(val);
      } else {
        res.writeHead(204, headers);
        res.end();
      }
    }, { req, res, session: await getSession({  req }) });

    this.receive(rawReq, clientRequest);
  }

  public send(message: Message): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public async listen(): Promise<void> {
    return;
  }

  public async close(): Promise<void> {
    return;
  }
}

/**
 * Creates an Attic `OAuthAgent` with superuser permissions
 */
export function createAtticService() {
  const sessionRedis = new Redis(process.env.SERVICE_OAUTH_REDIS_URI);
  const sessionDb = levelup(new IORedisDown('blah', encodeOptions() as any, { redis: sessionRedis } as any));

  const atticService =  new OAuthAgent(process.env.ATTIC_URI as string, {
    client_id: process.env.SERVICE_CLIENT_ID as string,
    client_secret: process.env.SERVICE_CLIENT_SECRET as string,
    redirect_uri: process.env.SERVICE_REDIRECT_URI as string,
  }, sessionDb, [
    'client_credentials'
  ]);

  return atticService;
}

/**
 * Creates an Attic RPC client with superuser permissions
 */
export function atticServiceRpcProxy() {
  const { RPCProxy } =  createAtticService().createRPCProxy({
    grant_type: 'client_credentials',
    scope: ['.*'],
    username: process.env.SERVICE_USERNAME
  });

  return RPCProxy;
}

export type MarketplaceAPIMethods = MarketplaceAPI&{ [name: string]: Function };

/**
 * Important!
 *
 * These are the RPC methods the user is allowed to access AFTER logging one
 */
const authorizedMethods = [
  /**
   * Allows the user to update their profile
   */
  'marketplace:patchUser',
  'marketplace:createNFT',
  'marketplace:patchNFT',
  'marketplace:deleteNFT',
  'marketplace:getNFT'
]

/**
 * Important!
 *
 * These are the RPC methods the user is allowed to access BEFORE logging one
 */
const anonymousMethods: string[] = [
  /**
   * Allows the user to create a new account
   */
  'marketplace:createUser',
  'marketplace:getNFT'
]

/**
 * `multi-rpc` RPC server modified for the marketplace
 */
export class MarketplaceRPCServer extends Server {
  public get methods(): MarketplaceAPIMethods {
    return this.createMethodsObject() as any;
  }

  protected async invoke(request: Request, clientRequest?: MarketplaceClientRequest): Promise<void> {
    try {

      if (!clientRequest) {
        throw new HTTPError(400);
      }
      // Do auth stuff here
      if (!authorizedMethods.concat(anonymousMethods).includes(request.method)) {
        throw new UnauthorizedRequest(`Unauthorized request: ${request.method}`);
      }

      if (!anonymousMethods.includes(request.method) && !clientRequest) {
        throw new HTTPError(403);
      }

      const res = await super.invoke(request, clientRequest);
    } catch (err) {
      if (!clientRequest || !clientRequest.respond) throw err;
      const resp = new Response(request.id, new InternalError(err));
      clientRequest.respond(resp);
    }
  }
}


export const rpcTransport = new RPCTransport(makeSerializer());
export const rpcServer: MarketplaceRPCServer = new MarketplaceRPCServer(rpcTransport as any) as MarketplaceRPCServer;

/**
 * Allows clients to interact with the mongoose model via the RPC interface
 * @param modelName
 * @param simpleInterface
 */
export function exposeModel(modelName: string, simpleInterface: any) {
  new RPCInterface(simpleInterface as any, rpcServer as Server, 'db:');
  for (let k of Object.getOwnPropertyNames((simpleInterface as any).__proto__)) {
    if (k === 'constructor' || k === 'execute') continue;
    // @ts-ignore
    const fn: any =  (simpleInterface as any)[k];
    if (typeof(fn) !== 'function') continue;
    // @ts-ignore
    (rpcServer as any).methodHost.set(`db:${modelName}:${k}`, fn.bind(simpleInterface));
  }
}

(rpcServer as any).methodHost.set('marketplace:createNFT', marketplaceCreateNft);
(rpcServer as any).methodHost.set('marketplace:getNFT', marketplaceGetNft);
(rpcServer as any).methodHost.set('marketplace:createUser', marketplaceCreateUser);
(rpcServer as any).methodHost.set('marketplace:patchUser', marketplacePatchUser);

export default rpcServer;
