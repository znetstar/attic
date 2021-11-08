import {IDriver} from "@znetstar/attic-common/lib/IDriver";
import Constructible from "../Constructible";
import { default as HTTPRedirectDriver } from "./HTTPRedirectDriver";
import ApplicationContext, { drivers } from "../ApplicationContext";
import HTTPReverseProxyDriver from "./HTTPReverseProxyDriver";
import IPFSDriver from "./IPFSDriver";
import HTTPMirrorDriver from "./HTTPMirrorDriver";

export async function loadDrivers() {
    await ApplicationContext.emitAsync('launch.loadDrivers.start');
    await ApplicationContext.loadDriver(HTTPRedirectDriver, 'HTTPRedirectDriver');
    await ApplicationContext.loadDriver(HTTPReverseProxyDriver, 'HTTPReverseProxyDriver');
    await ApplicationContext.loadDriver(IPFSDriver, 'IPFSDriver');
    await ApplicationContext.loadDriver(HTTPMirrorDriver, 'HTTPMirrorDriver');
    await ApplicationContext.emitAsync('launch.loadDrivers.complete');
}
