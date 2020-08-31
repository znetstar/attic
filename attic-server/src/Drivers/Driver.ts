import ILocation from "@znetstar/attic-common/lib/ILocation";
import {IDriverGet, IDriverHead} from "@znetstar/attic-common";

export default abstract class Driver<T> implements IDriverGet<T>, IDriverHead<T> {
    public abstract get(location: ILocation): Promise<T>;
    public abstract head(location: ILocation): Promise<T>;
}

