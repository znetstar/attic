import {loadWebServer, RPCHTTPServer, WebHTTPServer, webServerListen} from './Web/WebServer';
import Config from './Config';
import {loadDrivers} from "./Drivers";
import {loadModels} from "./Database";
import ApplicationContext from "./ApplicationContext";
import {loadPlugins} from "./Plugins";

(async () => {
    try {
        await ApplicationContext.emitAsync('launchStart');
        await loadPlugins();
        await loadModels();
        await loadDrivers();
        await loadWebServer();
        await webServerListen();
        await ApplicationContext.emitAsync('launchComplete');
    } catch (err) {
        console.error(err.stack);
        process.exit(1);
    }
})();