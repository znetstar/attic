import GenericError from "./GenericError";

export class ProtocolMustBeIPFSError extends GenericError {
  public static get code(): number {
    return 36001;
  }

  public static get httpCode(): number {
    return 409;
  }

  constructor(public message: string = `Protocol must be 'ipfs:'`) {
    super(message, ProtocolMustBeIPFSError.code, ProtocolMustBeIPFSError.httpCode);
  }
}
