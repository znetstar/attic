import {
  SimpleModelInterface,
  CreateModelInterfaceRequestBody,
  PatchModelInterfaceRequestBody
} from "@thirdact/simple-mongoose-interface";
import {IUser} from "./_user";

export interface MarketplaceAPI {
  'db:User:patch': (...args: any[]) => Promise<void>;
  'marketplace:createUser': (...args: any[]) => Promise<void>
}

export interface IHTTPError {
  httpCode: number;
  message:  string;
}

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
