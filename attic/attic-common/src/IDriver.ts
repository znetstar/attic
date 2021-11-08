import ILocation from "./ILocation";

export interface IDriverPut<T,B,O> {
    put(location: ILocation, content: B, options?: O): Promise<T>;
}

export interface IDriverDelete<T> {
    delete(location: ILocation): Promise<T>;
}

export interface IDriverGet<T> {
    get(location: ILocation): Promise<T>;
}

export interface IDriverHead<T> {
    head(location: ILocation): Promise<T>;
}

export interface IDriverList<T> {
    list(location: ILocation): Promise<T>;
}

export interface IDriverConnect<T> {
    connect(location: ILocation): Promise<T>;
}


export type IDriver = IDriverGet<any>&IDriverHead<any>;
export type IDriverOf<T,B> = IDriverGet<T>&IDriverHead<T>;
export type IDriverFull = IDriverGet<any>&IDriverHead<any>&IDriverPut<any, any, any>&IDriverDelete<any>&IDriverList<any>&IDriverConnect<any>;
export type IDriverOfFull<T,B, O> = IDriverGet<T>&IDriverHead<T>&IDriverPut<T, B, O>&IDriverDelete<T>&IDriverList<T>&IDriverConnect<T>;

