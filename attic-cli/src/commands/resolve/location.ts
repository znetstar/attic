import {Command, flags} from '@oclif/command'
import RPCProxy from '@znetstar/attic-cli-common/lib/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions, BasicTextSearchOptions} from "@znetstar/attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutput, formatOutputFromFlags, OutputFormat} from "@znetstar/attic-cli-common/lib/misc";
import Search from "../../Common/Search";
import {ensureMountPoint, ILocation, IResolver} from "@znetstar/attic-common/lib";
import Resolve from "../../Common/Resolve";

export default class ResolveLocation extends Resolve {
  static description = 'resolves a location to a location'

  static args = [
    {
      name: 'location'
    }
  ]

  async run() {
    const {argv, flags} = this.parse(Resolve);

    let location: ILocation = this.parseResolveFields(argv, flags);

    let outLocation = await RPCProxy.resolve(location, { id:  flags.id, noCache: flags.noCache});
    let outString = formatOutputFromFlags(outLocation, flags, [ 'id', 'href' ])

    /* console.log(outString); */
  }
}
