import {
  SimpleModelInterface,
  CreateModelInterfaceRequestBody,
  PatchModelInterfaceRequestBody, JSONPatchOp
} from "@thirdact/simple-mongoose-interface";
import {IPOJOUser, IUser} from "./_user";
import {IListedNFT, INFT} from "./_nft";
import {IPOJOWallet} from "./_wallet";
import {User} from "../api/auth/[...nextauth]";

/**
 * RPC API exposed by the server
 */
export interface MarketplaceAPI {
  'marketplace:patchUser': (patches: JSONPatchOp) => Promise<void>;
  'marketplace:createUser': (user: unknown) => Promise<string>;
  'marketplace:getAllUsers': () => Promise<IPOJOUser[]>;
  'marketplace:getNFT': (q: unknown, getOpts?: { limit?: number, skip?: number }) => Promise<IListedNFT[]>;
  'marketplace:getUserById': (id: unknown) =>Promise<IUser>;
  'marketplace:patchNFT': (id: unknown, patches: JSONPatchOp) => Promise<void>;
  'marketplace:createNFT': (nft: INFT) => Promise<string>;
  'marketplace:createAndMintNFT': (tokenId: string, supply: number) => Promise<void>;

  'marketplace:getWallet': (userId?: string) => Promise<IPOJOWallet>;
  'marketplace:beginBuyLegalTender': (amount: number|string) => Promise<string>;
}

/**
 * Generic error returned by the RPC server
 */
export interface IHTTPError {
  /**
   * HTTP code that would have been returned if the error were returned via REST
   */
  httpCode: number;
  message:  string;
}

/**
 * A generic HTTP error object
 */
export class HTTPError extends Error implements IHTTPError {
  public message: string;
  constructor(public httpCode: number, message?: string) {
    super(
      message || `HTTP Error ${httpCode}`
    );

    this.message = message || `HTTP Error ${httpCode}`;
  }
}

export class UnauthorizedRequest extends HTTPError {
  constructor(public message: string = 'Unauthorized') {
    super(403, message);
  }
}

export enum TokenType {
  token = 0,
  nft = 1
}

export enum TokenSupplyType {
  infinite = 0,
  finite =1
}
