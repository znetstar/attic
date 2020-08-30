import {Command, flags} from '@oclif/command'
import RPCProxy from '../../RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions, BasicTextSearchOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutputFromFlags, OutputFormat} from "../../Common/misc";
import Search from "../../Common/Search";

export default class LocationSearch extends Search {
  static description =  'searches an entity via MongoDB text query'

  async run() {
    const {argv, flags} = this.parse(Search);

    let searchOptions: BasicTextSearchOptions = this.parseSearchOptions();
    let ents = await RPCProxy.searchEntities(searchOptions);

    let output: string;
    if (typeof(ents) === 'number') {
      output = String(ents);
    } else {
      output = <string>formatOutputFromFlags(ents, flags, [ 'id', 'source.href', 'type' ]);
    }

    console.log(output);
  }
}
