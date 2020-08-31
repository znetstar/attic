import {Command, flags} from '@oclif/command'
import RPCProxy from '@znetstar/attic-cli-common/lib/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions, BasicTextSearchOptions} from "@znetstar/attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutput, OutputFormat} from "@znetstar/attic-cli-common/lib/misc";
import Search from "../../Common/Search";
import {ensureMountPoint} from "@znetstar/attic-common/lib";

export default class ResolverSearch extends Search {
  static description = 'searches for a resolver via MongoDB text search';

  async run() {
    const {argv, flags} = this.parse(Search);

    let searchOptions: BasicTextSearchOptions = this.parseSearchOptions();
    let resolvers = await RPCProxy.searchResolvers(searchOptions);

    let output: string;
    if (typeof(resolvers) === 'number') {
      output = String(resolvers);
    } else {
      output = <string>formatOutput(resolvers, flags.format, [ 'id', 'mountPoint.expression', 'type', 'priority' ]);
    }

    console.log(output);
  }
}
