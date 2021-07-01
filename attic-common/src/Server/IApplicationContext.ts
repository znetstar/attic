import {IDriver} from "../IDriver";
import {IPlugin} from "./IPlugin";
import Constructible from "../Constructible";
import IConfig, {LogLevels} from "./IConfig";
import IRPC from "../IRPC";

export type LogFunction = (entry: any, options?: unknown) => void;

export interface ILogger {
    log(level: LogLevels, entry: any, options?: unknown): void;
    info: LogFunction;
    silly: LogFunction;
    warn: LogFunction;
    error: LogFunction;
    verbose: LogFunction;
    debug: LogFunction;
}

export interface IApplicationHookEmitter {
  on(event: string, handler: (...args: unknown[]) => Promise<unknown>): void;
  emit(event: string, ...args: unknown[]): void;
  emitAsync(event: string, ...args: unknown[]): Promise<unknown[]>;
  triggerHook<T>(method: string, ...params: any[]): Promise<Array<T>>;
  triggerHookSingle<T>(method: string, ...params: any[]): Promise<T|unknown>;
  registerHook<T>(method: string, fn: (...params: any[]) => Promise<T>): void;
}

export type IApplicationContext = IApplicationHookEmitter&{
    config: IConfig;
    logs: ILogger;
    redis: unknown;
    rpcServer: unknown&{methods:IRPC};
    webExpress: unknown;
    drivers: Map<string, Constructible<IDriver>>,
    plugins: Map<string, IPlugin>;
    mongoose: unknown;
    package: unknown;
    webSocketServer: unknown;
    webSocketPaths: Map<string, unknown>;
    loadDriver(driver: Constructible<IDriver>, name?: string): Promise<void>;
}
