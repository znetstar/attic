import {IError} from "./IError";

export class GenericError extends Error implements IError {
    public code: number;
    public httpCode: number;
    constructor(public message: string, code?: number, httpCode?: number) {
        super(message);

        if (typeof(code) === 'undefined')
            this.code = (this as any).__proto__.code;
        if (typeof(httpCode) === 'undefined')
            this.httpCode = (this as any).__proto__.httpCode;
    }

    public static get code(): number {
        return 0;
    }

    public static get httpCode(): number {
        return 500;
    }
}

export default GenericError;