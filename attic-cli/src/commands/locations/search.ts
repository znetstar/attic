import {Command, flags} from '@oclif/command'
import RPCProxy from '../../RPC';
import Find from "../../Common/Find";
import {BasicFindOptions, BasicTextSearchOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutputFromFlags, OutputFormat} from "../../Common/misc";
import Search from "../../Common/Search";

export default class LocationSearch extends Search {
  static description = 'conducts a MongoDB text search on the Locations collection'

  async run() {
    const {argv, flags} = this.parse(Search);

    let searchOptions: BasicTextSearchOptions = this.parseSearchOptions();
    let locs = await RPCProxy.searchLocations(searchOptions);

    let output: string = <string>formatOutputFromFlags(locs, flags, [ 'id', 'href', 'driver' ]);

    console.log(output);
  }
}
