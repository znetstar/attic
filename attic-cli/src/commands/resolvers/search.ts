import {Command, flags} from '@oclif/command'
import RPCProxy from '../../RPC';
import Find from "../../Common/Find";
import {BasicFindOptions, BasicTextSearchOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutput, OutputFormat} from "../../Common/misc";
import Search from "../../Common/Search";
import {ensureMountPoint} from "attic-common/lib";

export default class ResolverSearch extends Search {
  static description = 'conducts a MongoDB text search on the Resolvers collection'

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
