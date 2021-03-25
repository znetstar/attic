import {loadWebServer, WebHTTPServer, webServerListen} from './Web/WebServer';
import Config from './Config';
import {loadDrivers} from "./Drivers";
import {loadModels} from "./Database";
import ApplicationContext from "./ApplicationContext";
import {loadPlugins} from "./Plugins";

export async function launch() {
    await ApplicationContext.emitAsync('launch.start');
    await loadPlugins();
    await loadModels();
    await loadDrivers();
    await loadWebServer();
    await webServerListen();
    await ApplicationContext.emitAsync('launch.complete');
}

export default launch;