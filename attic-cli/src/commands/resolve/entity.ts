import {Command, flags} from '@oclif/command'
import RPCProxy from 'attic-cli-common/src/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions, BasicTextSearchOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutput, formatOutputFromFlags, OutputFormat} from "attic-cli-common/src/misc";
import Search from "../../Common/Search";
import {ensureMountPoint, IEntity, ILocation, IResolver} from "attic-common/lib";
import Resolve from "../../Common/Resolve";

export default class ResolveEntity extends Resolve {
  static description = 'resolves a location to an entity'

  static args = [
    {
      name: 'entity'
    }
  ]

  async run() {
    const {argv, flags} = this.parse(Resolve);

    let location: ILocation = this.parseResolveFields(argv, flags);

    let outLocation = await RPCProxy.resolve(location,{ id:  flags.id, noCache: flags.noCache });
    let outEntity: IEntity = null as any;
    if (!_.isEmpty(outLocation) && !_.isEmpty(outLocation.entity)) {
      outEntity = await RPCProxy.findEntity({ id: outLocation.entity });
    }
    let outString = formatOutputFromFlags(outEntity, flags, [   'id', 'type', 'source.href' ])

    console.log(outString);
  }
}
