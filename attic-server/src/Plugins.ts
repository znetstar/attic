import ApplicationContext from "./ApplicationContext";
import Config from "./Config";
import * as path from 'path';
import {IPlugin} from "@znetstar/attic-common/lib/Server/IPlugin";
import { Constructible } from "@znetstar/attic-common";
import * as npm from 'npm';
import {promisify} from "util";


export const plugins = new Map<string, IPlugin>();
export default plugins;

let npmLoaded = false;

export async function loadPlugins(){
    await ApplicationContext.emitAsync('launch.loadPlugins.start');
    for (let pluginPathSpec of Config.plugins) {
        ApplicationContext.logs.silly({
            method: `launch.loadPlugins.loadPlugin.start`,
            params: [
                pluginPathSpec
            ]
        });
        let Plugin: Constructible<IPlugin>, pluginModule: any;

        let pluginPath: string, pluginName: string;
        if (typeof(pluginPathSpec) === 'string') {
            pluginPath = pluginPathSpec;
            pluginName = pluginPathSpec;
        } else {
            pluginName = pluginPathSpec[0];
            pluginPath = pluginPathSpec[1];
        }

        try {
            pluginModule = require(pluginPath);
        } catch (err) {
            if (err.code !== 'MODULE_NOT_FOUND')
                throw err;
        }

        if (!pluginModule) {
            if (!npmLoaded) {
                await new Promise<void>((resolve, reject) => {
                    npm.load((err: any) => {
                        if (err) reject(err);
                        else resolve();
                    })
                });
                let cfg: any = {
                    ...(Config.npmOptions || {}),
                    save: false,
                    loglevel: 'warn'
                };
                for (let k in cfg) {
                    npm.config.set(k, cfg[k]);
                }

                npmLoaded = true;
            }
            ApplicationContext.logs.silly({
                method: `launch.loadPlugins.loadPlugin.npmInstall.start`,
                params: [
                    pluginPathSpec
                ]
            });

            await new Promise((resolve, reject) => npm.commands.install([pluginPath], (err:any) => err ? reject(err):resolve()));

            try {
                pluginModule = require(pluginPath);
            } catch (err) {
                if (err.code !== 'MODULE_NOT_FOUND')
                    throw err;
            }

            if (!pluginModule) {
                pluginModule = require(pluginPath+'/lib/Atticfile');
            }

            ApplicationContext.logs.silly({
                method: `launch.loadPlugins.loadPlugin.npmInstall.complete`,
                params: [
                    pluginPathSpec
                ]
            });
        }

        if (pluginModule && pluginModule.default) {
            pluginModule = pluginModule.default;
        }

        Plugin = pluginModule;

        // @ts-ignore
        const plugin = new Plugin(ApplicationContext);

        await plugin.init();
        plugins.set(plugin.name, plugin);

        ApplicationContext.logs.silly({
            method: `launch.loadPlugins.loadPlugin.complete`,
            params: [
                pluginPathSpec
            ]
        });

        await ApplicationContext.emitAsync(`Plugins.${plugin.name}.init`, plugin);
    }
    await ApplicationContext.emitAsync('launch.loadPlugins.complete');
}