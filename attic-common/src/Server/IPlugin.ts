import {IApplicationContext} from "./IApplicationContext";

export interface IPlugin {
    applicationContext: IApplicationContext;
    init(): Promise<void>;
    name: string;
}