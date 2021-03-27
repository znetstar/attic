import {IDriver} from "../IDriver";
import {IPlugin} from "./IPlugin";
import Constructible from "../Constructible";


export interface IApplicationContext {
    on(event: string, handler: (...args: unknown[]) => Promise<unknown>): void;
    emit(event: string, ...args: unknown[]): void;
    emitAsync(event: string, ...args: unknown[]): Promise<unknown[]>;
    config: unknown;
    logs: unknown;
    redis: unknown;
    rpcServer: unknown;
    webExpress: unknown;
    passport: unknown;
    drivers: Map<string, Constructible<IDriver>>,
    plugins: Map<string, IPlugin>;
    package: unknown;
    triggerHook<T>(method: string, ...params: any[]): Promise<Array<T>>;
    triggerHookSingle<T>(method: string, ...params: any[]): Promise<T|unknown>;
    registerHook<T>(method: string, fn: (...params: any[]) => Promise<T>): void;
}