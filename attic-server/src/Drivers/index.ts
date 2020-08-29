import {IDriver} from "attic-common/lib/IDriver";
import Constructible from "../Constructible";
import { default as HTTPRedirectDriver } from "./HTTPRedirectDriver";

export { default as HTTPRedirectDriver } from './HTTPRedirectDriver';
export const drivers = (<any>global).drivers = (<any>global).drivers || new Map<string, Constructible<IDriver>>();
drivers.set('HTTPRedirectDriver', HTTPRedirectDriver);

