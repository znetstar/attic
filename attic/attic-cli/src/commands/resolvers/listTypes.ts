import {Command, flags} from '@oclif/command'
import RPCProxy from '@znetstar/attic-cli-common/lib/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions} from "@znetstar/attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutput, formatOutputFromFlags, OutputFormat} from "@znetstar/attic-cli-common/lib/misc";
import List from "../../Common/List";

export default class ResolverList extends List {
  static description = 'lists all resolver types'

  async run() {
    const {argv, flags} = this.parse(List);
    let resolverTypes = await RPCProxy.listResolverTypes();

    let output: string;

    let outObj = [].concat((resolverTypes as any) || []).map(c => ({ resolverType: c }));
    output = <string>formatOutputFromFlags(outObj, flags);
    console.log(output);
  }
}
