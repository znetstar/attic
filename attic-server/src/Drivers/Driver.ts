import ILocation from "attic-common/lib/ILocation";
import {IDriverGet, IDriverHead} from "attic-common";

export default abstract class Driver<T> implements IDriverGet<T>, IDriverHead<T> {
    public abstract get(location: ILocation): Promise<T>;
    public abstract head(location: ILocation): Promise<T>;
}

