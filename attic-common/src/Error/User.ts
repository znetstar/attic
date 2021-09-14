import GenericError from "./GenericError";

export class UserAlreadyExistsError extends GenericError {
  public static get code(): number {
    return 87001;
  }

  public static get httpCode(): number {
    return 410;
  }

  constructor(public message: string = 'Cannot create user. User with the requested username already exists') {
    super(message, UserAlreadyExistsError.code, UserAlreadyExistsError.httpCode);
  }
}
