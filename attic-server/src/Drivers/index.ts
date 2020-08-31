import {IDriver} from "attic-common/lib/IDriver";
import Constructible from "../Constructible";
import { default as HTTPRedirectDriver } from "./HTTPRedirectDriver";
import ApplicationContext from "../ApplicationContext";
export const drivers = (<any>global).drivers = (<any>global).drivers || new Map<string, Constructible<IDriver>>();

export async function loadDrivers() {
    await ApplicationContext.emitAsync('loadDrivers.start');
    drivers.set('HTTPRedirectDriver', HTTPRedirectDriver);
    await ApplicationContext.emitAsync('loadDrivers.complete');
}
