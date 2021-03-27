/**
 * This component is licensed separately from the main program
 * @module attic-server/ApplicationContext
 * @license LGPL-3.0
 * Copyright (C) 2021 Zachary R.T. Boyd <zachary@zacharyboyd.nyc>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 *  You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import mongoose, { redis } from './Database';
import Config, { ConfigType } from "./Config";
import RPCServer from "./RPC";
import {WebExpress} from "./Web";
import * as passport from "passport";
import {drivers} from "./Drivers";
import { EventEmitter2 as EventEmitter } from 'eventemitter2';
import plugins from "./Plugins";
import {createLogger} from "./Logs";
import {IError} from "@znetstar/attic-common/lib/Error/IError";
import  * as fs from 'fs-extra';
import * as path from 'path';
import {  Notification } from 'multi-rpc';
import {IApplicationContext} from "@znetstar/attic-common/lib/Server";

export interface ListenStatus {
    urls: string[];
}

export class ApplicationContextBase extends EventEmitter implements IApplicationContext{
    protected logger = createLogger();
    constructor() {
        super({
            wildcard: true,
            delimiter: '.',
            newListener: true,
            removeListener: true,
            verboseMemoryLeak: false
        });

        if (this.config.autoLogEvents) {
            this.onAny(this.onAutoLog);
        }

        this.logs.on('data', this.onLog);


        if (this.config.logListening)
            this.on('Web.webServerListen.complete', this.onWebServerListen);

        this.once('launch.complete', () => {
            this.logs.verbose({
                method: 'launch.complete',
                params: [
                    {
                        name: this.package.name,
                        version: this.package.version,
                        contributors: this.package.contributors.map((c: any) => `${c.name} <${c.email}>`)
                    }
                ]
            })
        });
    }

    onWebServerListen = (status: ListenStatus) => {
        this.logger.verbose({
            method: 'Web.webServerListen',
            params: [ status ]
        });
    }

    onAutoLog = (...args: any[]) => {
        if (!args.length || (args[0] && args[0].indexOf('log.') !== -1))
            return;

        let delta = { method: args[0], params: args.slice(1) };
        this.logger.debug(delta);
    }

    onLog = (log: any) => {
        this.emit(`log.${log.level}`, log);
        // this.rpcServer.sendTo(new Notification(`log.${log.level}`, log)).catch(err => { console.error(err.stack) });
    }

    onErrorLog = (error: IError) => {
        this.logs.error({ error });
    }

    get mongoose() {
        return mongoose;
    }

    get redis() { return redis; }

    get config(): ConfigType {
        return Config as any;
    }

    get logs() {
        return this.logger;
    }

    get rpcServer() {
        return RPCServer;
    }


    get webExpress() {
        return WebExpress();
    }

    get passport() {
        return passport;
    }

    get drivers() {
        return drivers;
    }

    get plugins() {
        return plugins;
    }

    get package() {
        return fs.readJSONSync(path.join(__dirname, '..', 'package.json'));
    }

    async triggerHook<T>(method: string, ...params: any[]): Promise<Array<T>> {
        this.logs.silly({
            method: `ApplicationContext.triggerHook.start`,
            params: [
                method, ...params
            ]
        });
        let result = (await this.emitAsync(method, ...params) || []).filter(Boolean) as Array<T>;

        result.reverse();

        this.logs.silly({
            method: `ApplicationContext.triggerHook.complete`,
            params: [
                result
            ]
        });
        return result;
    }

    async triggerHookSingle<T>(method: string, ...params: any[]): Promise<T|undefined> {
        return (await this.triggerHook<T>(method, ...params))[0];
    }

    registerHook<T>(method: string, fn: (...params: any[]) => Promise<T>): void {
        this.on(method, fn);
    }
}

export const ApplicationContext = new ApplicationContextBase();

export default ApplicationContext;