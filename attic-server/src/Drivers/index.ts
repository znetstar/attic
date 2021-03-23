import {IDriver} from "@znetstar/attic-common/lib/IDriver";
import Constructible from "../Constructible";
import { default as HTTPRedirectDriver } from "./HTTPRedirectDriver";
import ApplicationContext from "../ApplicationContext";
import HTTPReverseProxyDriver from "./HTTPReverseProxyDriver";
export const drivers = (<any>global).drivers = (<any>global).drivers || new Map<string, Constructible<IDriver>>();

export async function loadDrivers() {
    await ApplicationContext.emitAsync('loadDrivers.start');
    drivers.set('HTTPRedirectDriver', HTTPRedirectDriver);
    drivers.set('HTTPReverseProxyDriver', HTTPReverseProxyDriver);
    await ApplicationContext.emitAsync('loadDrivers.complete');
}
