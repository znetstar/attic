import {IDriver} from "../IDriver";
import {IPlugin} from "./IPlugin";
import Constructible from "../Constructible";
import IConfig from "./IConfig";
import IRPC from "../IRPC";


export interface IApplicationContext {
    on(event: string, handler: (...args: unknown[]) => Promise<unknown>): void;
    emit(event: string, ...args: unknown[]): void;
    emitAsync(event: string, ...args: unknown[]): Promise<unknown[]>;
    config: IConfig;
    logs: unknown;
    redis: unknown;
    rpcServer: unknown&{methods:IRPC};
    webExpress: unknown;
    passport: unknown;
    drivers: Map<string, Constructible<IDriver>>,
    plugins: Map<string, IPlugin>;
    package: unknown;
    triggerHook<T>(method: string, ...params: any[]): Promise<Array<T>>;
    triggerHookSingle<T>(method: string, ...params: any[]): Promise<T|unknown>;
    registerHook<T>(method: string, fn: (...params: any[]) => Promise<T>): void;
}