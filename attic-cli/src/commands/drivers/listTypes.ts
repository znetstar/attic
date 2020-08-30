import {Command, flags} from '@oclif/command'
import RPCProxy from 'attic-cli-common/src/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutputFromFlags, OutputFormat} from "attic-cli-common/src/misc";
import List from "../../Common/List";

export default class DriversList extends List {
  static description = 'lists all available driver types'

  async run() {
    const {argv, flags} = this.parse(List);
    let drivers = await RPCProxy.listDrivers();

    let output: string;

    let outObj = [].concat((drivers as any) || []).map(c => ({ driver: c }));
    console.log(formatOutputFromFlags(outObj, flags));
  }
}
