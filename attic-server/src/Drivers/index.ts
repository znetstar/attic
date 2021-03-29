import {IDriver} from "@znetstar/attic-common/lib/IDriver";
import Constructible from "../Constructible";
import { default as HTTPRedirectDriver } from "./HTTPRedirectDriver";
import ApplicationContext, { drivers } from "../ApplicationContext";
import HTTPReverseProxyDriver from "./HTTPReverseProxyDriver";

export async function loadDrivers() {
    await ApplicationContext.emitAsync('launch.loadDrivers.start');
    await ApplicationContext.loadDriver(HTTPRedirectDriver, 'HTTPRedirectDriver');
    await ApplicationContext.loadDriver(HTTPReverseProxyDriver, 'HTTPReverseProxyDriver');
    await ApplicationContext.emitAsync('launch.loadDrivers.complete');
}
