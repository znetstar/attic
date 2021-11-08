import {IError} from "../Error";

export interface ConstructibleError<T extends IError> {
  new(...args: any[]): IError;
  code: number;
  httpCode: number;
}

export interface PartialIError {
  code?: number,
  name?: string
}

export interface IErrorBroker {
  setError(error: ConstructibleError<IError>, opts?: PartialIError): void;
  getErrorByCode(code: number): ConstructibleError<IError>|void;
  getErrorByCode<T extends IError>(code: number): ConstructibleError<T>|void;
  getErrorByName(name: string): ConstructibleError<IError>|void
  getErrorByName<T extends IError>(name: string): ConstructibleError<T>|void;
}
