
import GenericError from "./GenericError";

export class HTTPMirroredLocationMustHaveDriverError extends GenericError {
  public static get code(): number {
    return 37001;
  }

  public static get httpCode(): number {
    return 400;
  }

  constructor(public message: string = `Mirrored locations must have a driver`) {
    super(message, HTTPMirroredLocationMustHaveDriverError.code, HTTPMirroredLocationMustHaveDriverError.httpCode);
  }
}

export class HTTPMirroredRequestMustHaveResponseError extends GenericError {
  public static get code(): number {
    return 37002;
  }

  public static get httpCode(): number {
    return 400;
  }

  constructor(public message: string = `Mirrored requests must have a response`) {
    super(message, HTTPMirroredRequestMustHaveResponseError.code, HTTPMirroredRequestMustHaveResponseError.httpCode);
  }
}

