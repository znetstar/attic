/**
 * This component is licensed separately from the main program
 * @module attic-server/ApplicationContext
 * @license LGPL-3.0
 * Copyright (C) 2021 Zachary R.T. Boyd <zachary@zacharyboyd.nyc>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or.
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
import Config, { ConfigType } from "./Config";
import mongoose, { redis } from './Database';
import RPCServer from "./RPC";
import {WebExpress} from "./Web";
import { EventEmitter2 as EventEmitter } from 'eventemitter2';
import plugins from "./Plugins";
import {createLogger} from "./Logs";
import {IError} from "@znetstar/attic-common/lib/Error/IError";
import  * as fs from 'fs-extra';
import * as path from 'path';
import {  Notification } from 'multi-rpc';
import {IApplicationContext} from "@znetstar/attic-common/lib/Server";
import Constructible from "./Constructible";
import {IDriver} from "@znetstar/attic-common/lib/IDriver";
import {WebSocketPaths, WebSocketServer} from "./Web/WebServer";
import * as ws from 'ws';
import {DBInitRecordMongo, DBInitRecordMongoose} from "@znetstar/attic-common/lib/Server/IConfig";

export interface ListenStatus {
    urls: string[];
}

export const drivers: Map<string, Constructible<IDriver>> = (<any>global).drivers = (<any>global).drivers || new Map<string, Constructible<IDriver>>();

export class ApplicationContextBase extends EventEmitter implements IApplicationContext{
    protected logger: any;
    constructor() {
        super({
            wildcard: true,
            delimiter: '.',
            newListener: true,
            removeListener: true,
            verboseMemoryLeak: false
        });

        this.logger = createLogger(this);

        if (this.config.autoLogEvents) {
            this.onAny(this.onAutoLog);
        }

        this.logs.on('data', this.onLog);


        if (this.config.logListening)
            this.on('Web.webServerListen.complete', this.onWebServerListen);

        this.once('launch.complete', this.onLaunchCompleteLog);
        this.once('launch.complete', this.onLaunchCompleteDbInit);
    }

    onLaunchCompleteDbInit = async () =>  {
      try {
        if (this.config.dbInit) {
          for (const dbInitRecord of this.config.dbInit) {
            const q = dbInitRecord.query || (dbInitRecord.document._id ? { _id: dbInitRecord.document._id } : null);
            if ((dbInitRecord as DBInitRecordMongo<any>).collection) {
              if (q) {
                if (dbInitRecord.replace) {
                  await this.mongoose.connection.db.collection((dbInitRecord as DBInitRecordMongo<any>).collection).replaceOne(
                    q,
                    dbInitRecord.document
                  );
                } else {
                  await this.mongoose.connection.db.collection((dbInitRecord as DBInitRecordMongo<any>).collection).updateOne(
                    q,
                    {
                      $set: {
                        ...dbInitRecord.document,
                      },
                      ...(dbInitRecord.document._id ? ({$setOnInit: {_id: dbInitRecord.document._id}}) : {})
                    },
                    {
                      upsert: true
                    }
                  );
                }
              } else {
                await this.mongoose.connection.db.collection((dbInitRecord as DBInitRecordMongo<any>).collection).insertOne(
                  dbInitRecord.document
                );
              }
            } else if ((dbInitRecord as DBInitRecordMongoose<any>).model) {
              if (q) {
                if (dbInitRecord.replace) {
                  await this.mongoose.models[(dbInitRecord as DBInitRecordMongoose<any>).model].replaceOne(q, dbInitRecord.document);
                } else {
                  await this.mongoose.models[(dbInitRecord as DBInitRecordMongoose<any>).model].updateOne(q, {
                    $set: {
                      ...dbInitRecord.document,
                    },
                    ...(dbInitRecord.document._id ? ({$setOnInit: {_id: dbInitRecord.document._id}}) : {})
                  }, {
                    upsert: true
                  });
                }
              } else {
                await this.mongoose.models[(dbInitRecord as DBInitRecordMongoose<any>).model].create(dbInitRecord.document);
              }
            }
          }
        }
      } catch (err) {
        this.logs.error({
          method: 'launch.complete',
          params: [
            { message: err.stack }
          ]
        });
        process.exit(1);
      }
    }

    onLaunchCompleteLog = () => {
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
        this.logger.silly(delta);
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

    get webSocketServer() {
      return WebSocketServer;
    }

    get webSocketPaths(): Map<string, ws.Server> {
      return WebSocketPaths;
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

    async loadDriver(driver: Constructible<IDriver>, name?: string): Promise<void> {
        name = name || driver.name;
        this.drivers.set(name, driver);
        await this.emitAsync(`Drivers.${name}.init`, driver);
    }
}

export const ApplicationContext = (global as any).ApplicationContext = new ApplicationContextBase();

export default ApplicationContext;
