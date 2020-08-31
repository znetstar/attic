import ApplicationContext from "./ApplicationContext";
import Config from "./Config";
import * as path from 'path';

export const plugins = new Map();
export default plugins;

export async function loadPlugins(){
    await ApplicationContext.emitAsync('loadPlugins.start');
    for (let pluginPath of Config.plugins) {
        let plugin = require(path.join(__dirname, '..', pluginPath));
        let name = plugin.name || pluginPath;
        plugins.set(name, plugin);
        await plugin.init(ApplicationContext);

        await ApplicationContext.emitAsync(`Plugins.${name}.init`, plugin);
    }
    await ApplicationContext.emitAsync('loadPlugins.complete');
}