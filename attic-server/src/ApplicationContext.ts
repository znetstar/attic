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

export class ApplicationContextBase extends EventEmitter {
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
    }

    onAutoLog = (...args: any[]) => {
        if (!args.length) return;

        let delta = { method: args[0], params: args.slice(1) };
        this.logger.debug(delta);
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
}

export const ApplicationContext = new ApplicationContextBase();

export default ApplicationContext;