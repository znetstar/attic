import mongoose from './Database';
import Config, { ConfigType } from "./Config";
import RPCServer from "./RPC";
import {RPCExpress, WebExpress} from "./Web";
import * as passport from "passport";
import {drivers} from "./Drivers";
import { EventEmitter2 as EventEmitter } from 'eventemitter2';
import plugins from "./Plugins";

export class ApplicationContextBase extends EventEmitter {
    constructor() {
        super({
            wildcard: true,
            delimiter: '.',
            newListener: true,
            removeListener: true,
            verboseMemoryLeak: false
        });
    }

    get mongoose() {
        return mongoose;
    }

    get config(): ConfigType {
        return Config as any;
    }


    get rpcServer() {
        return RPCServer;
    }

    get rpcExpress() {
        return RPCExpress();
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