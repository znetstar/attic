import {Command, flags} from '@oclif/command'
import RPCProxy from '@znetstar/attic-cli-common/lib/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions} from "@znetstar/attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutputFromFlags, OutputFormat} from "@znetstar/attic-cli-common/lib/misc";
import List from "../../Common/List";

export default class DriversList extends List {
  static description = 'lists all available driver types'

  async run() {
    const {argv, flags} = this.parse(List);
    let drivers = await RPCProxy.listDrivers();

    let output: string;

    let outObj = [].concat((drivers as any) || []).map(c => ({ driver: c }));
    /* console.log(formatOutputFromFlags(outObj, flags); */);
  }
}
