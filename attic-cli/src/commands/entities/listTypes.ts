import {Command, flags} from '@oclif/command'
import RPCProxy from '../../RPC';
import Find from "../../Common/Find";
import {BasicFindOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {OutputFormat} from "../../Common/misc";
import List from "../../Common/List";

export default class EntityList extends List {
  static description = 'lists all Resolver types'

  async run() {
    const {argv, flags} = this.parse(List);
    let entityTypes = await RPCProxy.listEntityTypes();

    let output: string;

    let outObj = [].concat((entityTypes as any) || []).map(c => ({ entityType: c }));
    if (flags.format === OutputFormat.text) {
      output = cliff.stringifyObjectRows(outObj, [ 'entityType' ]);
    } else {
      output = JSON.stringify(outObj, null, 4);
    }
    console.log(output);
  }
}
