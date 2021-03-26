import {IError} from "./IError";

export class GenericError extends Error implements IError {
    public code: number;
    public httpCode: number;
    public innerError?: Error|IError;
    constructor(public message: string, code?: number, httpCode?: number, innerError?: Error|IError) {
        super(message);

        if (typeof(code) === 'undefined')
            this.code = (this as any).__proto__.code;
        if (typeof(httpCode) === 'undefined')
            this.httpCode = (this as any).__proto__.httpCode;
        if (typeof(innerError) !== 'undefined') {
            this.innerError = innerError;
        }
    }

    public static get code(): number {
        return 0;
    }

    public static get httpCode(): number {
        return 500;
    }
}

export class NotFoundError extends GenericError {
    public static get code(): number {
        return 1;
    }

    public static get httpCode(): number {
        return 404;
    }

    constructor(public message: string = 'Could not find resource requested') {
        super(message, NotFoundError.code, NotFoundError.httpCode);
    }
}



export default GenericError;