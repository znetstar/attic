import {
  ClientRequest,
  InternalError,
  Message,
  Request,
  Response,
  Serializer,
  ServerSideTransport,
  Transport
} from 'multi-rpc-common';
import {RPCError, Server} from 'multi-rpc';

import type {NextApiRequest, NextApiResponse} from 'next'
import {encodeOptions, makeEncoder, makeSerializer} from "./_encoder";

import {RPCInterface,} from '@thirdact/simple-mongoose-interface';
import {HTTPError, MarketplaceAPI, UnauthorizedRequest} from "./_rpcCommon";
import {getUser, MarketplaceSession} from "../api/auth/[...nextauth]";
import {getSession} from "next-auth/client";
import Redis from "ioredis";
import levelup from "levelup";
import {IORedisDown} from "@etomon/ioredisdown";
import {OAuthAgent} from "@znetstar/attic-cli-common/lib/OAuthAgent";
import {LRUMap} from 'lru_map';
import {marketplaceCreateAndMintNFT, marketplaceCreateNft, marketplaceGetNft, marketplacePatchNft, NFT} from "./_nft";
import {marketplaceCreateUser, marketplaceGetAllUsers, marketplaceGetUserById, marketplacePatchUser, UserRoles, IUser} from "./_user";
import {marketplaceBeginBuyLegalTender, marketplaceGetWallet, toWalletPojo} from "./_wallet";
import {EncodeToolsNative as EncodeTools, SerializationFormat} from "@etomon/encode-tools/lib/EncodeToolsNative";
import { Token } from './_token';
import {getWebhookSecret} from "./_stripe";

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
    let transport: RPCTransport = this;
    const clientRequest = new ClientRequest(req.headers['x-marketplace-idempotency-key'] || Transport.uniqueId(), function (response?: Response) {
      const headers: any = {};

      if (response) {
        headers["Content-Type"] = transport.serializer.content_type;

        // @ts-ignore
      if (response.error?.data)
        // @ts-ignore
        response.error.data = {
          message: response.error?.data.message,
          stack: process.env.NODE_ENV !== 'production' ? response.error?.data.stack : null,
          code: response.error?.data.code,
          httpCode: response.error?.data.httpCode
        };

      const msg = response.error?.data?.stack || response.error?.data?.message || response.error?.stack || response.error?.message;
      if (msg)
        console.error(`rpc error: ${msg}`)

        const val = transport.serializer.serialize(response);
        if (!res.headersSent) res.writeHead(200, headers);
        res.write(Buffer.from(val));
        res.end();
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
  const sessionDb = levelup(new IORedisDown('blah', void(0), { redis: sessionRedis } as any));

  const atticService =  new OAuthAgent(process.env.ATTIC_URI as string, {
    client_id: process.env.SERVICE_CLIENT_ID as string,
    client_secret: process.env.SERVICE_CLIENT_SECRET as string,
    redirect_uri: process.env.SERVICE_REDIRECT_URI as string,
  }, sessionDb, [
    'client_credentials'
  ]);

  return atticService;
}

export function atticService() {
  return createAtticService().createRPCProxy({
    grant_type: 'client_credentials',
    scope: ['.*'],
    username: process.env.SERVICE_USERNAME
  });;
}

/**
 * Creates an Attic RPC client with superuser permissions
 */
export function atticServiceRpcProxy() {
  const { RPCProxy } = atticService()

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
  'marketplace:getNFT',
  'marketplace:getAllUsers',
  'marketplace:getWallet',
  'marketplace:beginBuyLegalTender',
  'marketplace:completeBuyLegalTender',
  'marketplace:createAndMintNFT',
  'marketplace:getAllUsers',
  'marketplace:getUserById',
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

      return await super.invoke(request, clientRequest);
    } catch (err) {
      if (clientRequest?.respond)
         await clientRequest.respond(new Response(request.id,new InternalError(err)));
      // throw err;
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
export function rpcInit() {
  const {marketplaceCreateNft, marketplaceGetNft, marketplacePatchNft} = require('./_nft');
  const {marketplaceCreateUser, marketplacePatchUser} = require('./_user');
  const {marketplaceGetWallet, toWalletPojo} = require('./_wallet');

  !(rpcServer as any).methodHost.has('marketplace:createNFT') && (rpcServer as any).methodHost.set('marketplace:createNFT',  marketplaceCreateNft);
  !(rpcServer as any).methodHost.has('marketplace:patchNFT') && (rpcServer as any).methodHost.set('marketplace:patchNFT',  marketplacePatchNft);
  !(rpcServer as any).methodHost.has('marketplace:getNFT') && (rpcServer as any).methodHost.set('marketplace:getNFT',  marketplaceGetNft);
  !(rpcServer as any).methodHost.has('marketplace:getAllUsers') && (rpcServer as any).methodHost.set('marketplace:getAllUsers',  marketplaceGetAllUsers);
  !(rpcServer as any).methodHost.has('marketplace:createUser') && (rpcServer as any).methodHost.set('marketplace:createUser',  marketplaceCreateUser);
  !(rpcServer as any).methodHost.has('marketplace:patchUser') && (rpcServer as any).methodHost.set('marketplace:patchUser',  marketplacePatchUser);
  !(rpcServer as any).methodHost.has('marketplace:createAndMintNFT') && (rpcServer as any).methodHost.set('marketplace:createAndMintNFT',  async function (id: string, supply: number): Promise<void> {
    // Extract the session data
    // @ts-ignore
    const clientRequest = (this as { context: { clientRequest:  MarketplaceClientRequest } }).context.clientRequest;
    const additionalData: RequestData = clientRequest.additionalData;


    // Load user from db
    const session = await getUser(additionalData?.session);


    // If no user throw 401 (not logged in)
    if (!session) {
      throw new HTTPError(401);
    }

    const { marketplaceUser: userDoc } = session;

    // If user lacks `nftAdmin` role throw 403 (permission denied)
    if (!userDoc?.roles?.includes(UserRoles.nftAdmin)) {
      throw new HTTPError(403);
    }

    const nft = await NFT.findById(id).populate('entity supplyKey kycKey adminKey treasury').exec();
    if (!nft.tokenId) {
      nft.tokenId = await nft.cryptoCreateToken(0);
    }

    await marketplaceCreateAndMintNFT(nft, supply);
  });
  !(rpcServer as any).methodHost.has('marketplace:getWallet') && (rpcServer as any).methodHost.set('marketplace:getWallet',  async function (...args: any[]): Promise<unknown> {
    // Extract the session data
    // @ts-ignore
    const clientRequest = (this as { context: { clientRequest: MarketplaceClientRequest } }).context.clientRequest;
    const additionalData: RequestData = clientRequest.additionalData;


    const sessionMarketplaceUser = await getUser(additionalData?.session);
    if (!sessionMarketplaceUser) {
      throw new HTTPError(401);
    }

    // additionalData has the raw req/res, in addition to the session
    const {wallet} = await marketplaceGetWallet(sessionMarketplaceUser as any, ...args);
    return wallet ? toWalletPojo(wallet) : null;
  });
  !(rpcServer as any).methodHost.has('marketplace:beginBuyLegalTender') && (rpcServer as any).methodHost.set('marketplace:beginBuyLegalTender',  async function (amount: number|string): Promise<unknown> {
    // Extract the session data
    // @ts-ignore
    const clientRequest = (this as { context: { clientRequest: MarketplaceClientRequest } }).context.clientRequest;
    const additionalData: RequestData = clientRequest.additionalData;

    const sessionMarketplaceUser = await getUser(additionalData?.session);
    if (!sessionMarketplaceUser) {
      throw new HTTPError(401);
    }

    // additionalData has the raw req/res, in addition to the session
    return marketplaceBeginBuyLegalTender(sessionMarketplaceUser as any, amount);
  });

  !(rpcServer as any).methodHost.has('marketplace:completeBuyLegalTender') && (rpcServer as any).methodHost.set('marketplace:completeBuyLegalTender',  async function (amount: number|string): Promise<unknown> {
    throw new HTTPError(405);
  });
}
(rpcServer as any).methodHost.set('marketplace:createNFT', marketplaceCreateNft);
(rpcServer as any).methodHost.set('marketplace:patchNFT', marketplacePatchNft);
(rpcServer as any).methodHost.set('marketplace:getNFT', marketplaceGetNft);
(rpcServer as any).methodHost.set('marketplace:createUser', marketplaceCreateUser);
(rpcServer as any).methodHost.set('marketplace:patchUser', marketplacePatchUser);
(rpcServer as any).methodHost.set('marketplace:getAllUsers', marketplaceGetAllUsers);
(rpcServer as any).methodHost.set('marketplace:getUserById', marketplaceGetUserById);

export default rpcServer;
