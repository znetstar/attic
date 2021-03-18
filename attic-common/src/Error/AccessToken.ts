import GenericError from "./GenericError";
import {IError} from "./IError";
import {IGetTokenResponse} from "../IUser";

export class MalformattedTokenRequestError extends GenericError {
    public static get code(): number {
        return 1000;
    }

    public static get httpCode(): number {
        return 400;
    }

    constructor(public message: string = 'Malformatted token request, please check for missing fields') {
        super(message, MalformattedTokenRequestError.code, MalformattedTokenRequestError.httpCode);
    }

}



export class InvalidResponseTypeError extends GenericError {
    public static get code(): number {
        return 1001;
    }

    public static get httpCode(): number {
        return 400;
    }

    constructor(public message: string = 'Invalid response type') {
        super(message, InvalidResponseTypeError.code, InvalidResponseTypeError.httpCode);
    }

}

export class InvalidClientOrProviderError extends GenericError {
    public static get code(): number {
        return 1002;
    }

    public static get httpCode(): number {
        return 403;
    }

    constructor(public message: string = 'Invalid client or provider') {
        super(message, InvalidClientOrProviderError.code, InvalidClientOrProviderError.httpCode);
    }

}


export class ErrorGettingTokenFromProviderError extends GenericError {
    public static get code(): number {
        return 1003;
    }

    public static get httpCode(): number {
        return 500;
    }

    constructor(public innerError: IError|Error, public message: string = 'Error getting token from provider') {
        super(message, ErrorGettingTokenFromProviderError.code, ErrorGettingTokenFromProviderError.httpCode);
    }

}

export class ProviderDoesNotAllowRegistrationError extends GenericError {
    public static get code(): number {
        return 1004;
    }

    public static get httpCode(): number {
        return 403;
    }

    constructor(public message: string = 'Provider does not allow registration') {
        super(message, ProviderDoesNotAllowRegistrationError.code, ProviderDoesNotAllowRegistrationError.httpCode);
    }

}

export class CouldNotFindTokenForScopeError extends GenericError {
    public static get code(): number {
        return 1005;
    }

    public static get httpCode(): number {
        return 403;
    }

    constructor(public query: IGetTokenResponse, public message: string = 'Could not find a token for this scope') {
        super(message, CouldNotFindTokenForScopeError.code, CouldNotFindTokenForScopeError.httpCode);
    }

}

export class CouldNotLocateStateError extends GenericError {
    public static get code(): number {
        return 1006;
    }

    public static get httpCode(): number {
        return 403;
    }

    constructor(public message: string = 'Could not locate OAuth state, please check the authorization code') {
        super(message, CouldNotLocateStateError.code, CouldNotLocateStateError.httpCode);
    }

}