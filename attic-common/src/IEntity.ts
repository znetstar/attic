import ILocation from "./ILocation";

export default interface IEntity {
    id?: string;
    _id?: string;
    source: ILocation;
    type: string;
}
