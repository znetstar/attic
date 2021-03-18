import ILocation from "./ILocation";

export interface IDriverPut<T,B> {
    put(location: ILocation, content: B): Promise<T>;
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

export interface IDriverProxy<T> {
    proxy(location: ILocation): Promise<T>;
}


export type IDriver = IDriverGet<any>&IDriverHead<any>;
export type IDriverOf<T,B> = IDriverGet<T>&IDriverHead<T>;
export type IDriverFull = IDriverGet<any>&IDriverHead<any>&IDriverPut<any, any>&IDriverDelete<any>&IDriverList<any>&IDriverProxy<any>;
export type IDriverOfFull<T,B> = IDriverGet<T>&IDriverHead<T>&IDriverPut<T, B>&IDriverDelete<T>&IDriverList<T>&IDriverProxy<T>;

