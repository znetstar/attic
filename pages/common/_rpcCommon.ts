import {
  SimpleModelInterface,
  CreateModelInterfaceRequestBody,
  PatchModelInterfaceRequestBody, JSONPatchOp
} from "@thirdact/simple-mongoose-interface";
import {IUser} from "./_user";
import {INFT} from "./_nft";

/**
 * RPC API exposed by the server
 */
export interface MarketplaceAPI {
  'marketplace:patchUser': (patches: JSONPatchOp) => Promise<void>;
  'marketplace:createUser': (user: unknown) => Promise<string>;
  'marketplace:getAllUsers': () => Promise<IUser[]>;
  'marketplace:getNFT': (q: unknown, getOpts?: { limit?: number, skip?: number }) => Promise<INFT[]>;
  'marketplace:patchNFT': (id: unknown, patches: JSONPatchOp) => Promise<void>;
  'marketplace:createNFT': (nft: INFT) => Promise<string>;
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
