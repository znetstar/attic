export interface IError {
    message: string;
    code: number;
    httpCode: number;
    innerError?: Error|IError;
}
