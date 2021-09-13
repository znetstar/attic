import {
  SimpleModelInterface,
  CreateModelInterfaceRequestBody,
  PatchModelInterfaceRequestBody
} from "@thirdact/simple-mongoose-interface";
import {IUser} from "./_user";

/**
 * RPC API exposed by the server
 */
export interface MarketplaceAPI {
  'db:User:patch': (...args: any[]) => Promise<void>;
  'marketplace:createUser': (...args: any[]) => Promise<void>
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
