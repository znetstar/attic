import {IDriver} from "@znetstar/attic-common/lib/IDriver";
import Constructible from "../Constructible";
import { default as HTTPRedirectDriver } from "./HTTPRedirectDriver";
import ApplicationContext from "../ApplicationContext";
import HTTPReverseProxyDriver from "./HTTPReverseProxyDriver";
export const drivers = (<any>global).drivers = (<any>global).drivers || new Map<string, Constructible<IDriver>>();

export async function loadDriver (driver: Constructible<IDriver>, name?: string) {
    name = name || driver.name;
    drivers.set(name, driver);
    await ApplicationContext.emitAsync(`Drivers.${name}.init`, driver);
}


export async function loadDrivers() {
    await ApplicationContext.emitAsync('launch.loadDrivers.start');
    await loadDriver(HTTPRedirectDriver, 'HTTPRedirectDriver');
    await loadDriver(HTTPReverseProxyDriver, 'HTTPReverseProxyDriver');
    await ApplicationContext.emitAsync('launch.loadDrivers.complete');
}
