import {Command, flags} from '@oclif/command'
import RPCProxy from 'attic-cli-common/src/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions, BasicTextSearchOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutputFromFlags, OutputFormat} from "attic-cli-common/src/misc";
import Search from "../../Common/Search";

export default class UserSearch extends Search {
  static description =  'searches for users via MongoDB text search';

  async run() {
    const {argv, flags} = this.parse(Search);

    let searchOptions: BasicTextSearchOptions = this.parseSearchOptions();
    let users = await RPCProxy.searchUsers(searchOptions);

    let output: string = <string>formatOutputFromFlags(users, flags, [ 'id', 'type', 'disabled' ]);

    console.log(output);
  }
}
