import ILocation from "./ILocation";


export default interface ICacheItem {
    source: ILocation;
    target: ILocation;
    expiresAt: Date;
    disabled?: boolean;
    id: string;
    _id: string;
}