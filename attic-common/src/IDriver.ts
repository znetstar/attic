import ILocation from "./ILocation";

export interface IDriverPut<T> {
    put(location: ILocation, content: T): Promise<T>;
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


export type IDriver = IDriverGet<any>&IDriverHead<any>;
export type IDriverOf<T> = IDriverGet<T>&IDriverHead<T>;
export type IDriverFull = IDriverGet<any>&IDriverHead<any>&IDriverPut<any>&IDriverDelete<any>&IDriverList<any>;
export type IDriverOfFull<T> = IDriverGet<T>&IDriverHead<T>&IDriverPut<T>&IDriverDelete<T>&IDriverList<T>;

export default abstract class Driver<T> implements IDriverGet<T>, IDriverHead<T> {
    public abstract get(location: ILocation): Promise<T>;
    public abstract head(location: ILocation): Promise<T>;
}

