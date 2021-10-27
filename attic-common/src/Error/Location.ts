import GenericError from "./GenericError";

export class LocationCopyDestinationMustHavePutError extends GenericError {
  public static get code(): number {
    return 56001;
  }

  public static get httpCode(): number {
    return 400;
  }

  constructor(public message: string = `Destination in location copy must have a driver capable of put`) {
    super(message, LocationCopyDestinationMustHavePutError.code, LocationCopyDestinationMustHavePutError.httpCode);
  }
}

export class CopyLocationsMustHaveDriverError extends GenericError {
  public static get code(): number {
    return 56002;
  }

  public static get httpCode(): number {
    return 400;
  }

  constructor(public message: string = `All locations in location copy must have a driver`) {
    super(message, CopyLocationsMustHaveDriverError.code, CopyLocationsMustHaveDriverError.httpCode);
  }
}
