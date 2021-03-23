import GenericError from "./GenericError";
import {IError} from "./IError";

export class CouldNotLocateUserError extends GenericError {
    public static get code(): number {
        return 2000;
    }

    public static get httpCode(): number {
        return 401;
    }

    constructor(public message: string = 'Could not locate a user, please login') {
        super(message, CouldNotLocateUserError.code, CouldNotLocateUserError.httpCode);
    }
}

export class CouldNotLocateIdentityError extends GenericError {
    public static get code(): number {
        return 2001;
    }

    public static get httpCode(): number {
        return 401;
    }

    constructor(public message: string = 'Could not locate an identity for this access token') {
        super(message, CouldNotLocateIdentityError.code, CouldNotLocateIdentityError.httpCode);
    }
}

