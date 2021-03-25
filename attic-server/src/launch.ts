import {loadWebServer, WebHTTPServer, webServerListen} from './Web/WebServer';
import Config from './Config';
import {loadDrivers} from "./Drivers";
import {loadModels} from "./Database";
import ApplicationContext from "./ApplicationContext";
import {loadPlugins} from "./Plugins";

(async () => {
    try {
        process.stdin.resume();
        await ApplicationContext.emitAsync('launch.start');
        await loadPlugins();
        await loadModels();
        await loadDrivers();
        await loadWebServer();
        await webServerListen();
        await ApplicationContext.emitAsync('launch.complete');
    } catch (err) {
        console.error(err.stack);
        process.exit(1);
    }
})().catch(err => {
    process.exit(1);
});