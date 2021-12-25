import GenericError from "./GenericError";

export class CannotModifyOrDeleteEventError extends GenericError {
  public static get code(): number {
    return 38001;
  }

  public static get httpCode(): number {
    return 405;
  }

  constructor(public message: string = `Events cannot be modified or deleted`) {
    super(message, CannotModifyOrDeleteEventError.code, CannotModifyOrDeleteEventError.httpCode);
  }
}
