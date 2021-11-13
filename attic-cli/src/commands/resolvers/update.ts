import {Command, flags} from '@oclif/command'
import RPCProxy from '@znetstar/attic-cli-common/lib/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions} from "@znetstar/attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {OutputFormat} from "@znetstar/attic-cli-common/lib/misc";
import Create from "../../Common/Create";
import {ensureMountPoint, ILocation, IResolver} from "@znetstar/attic-common/lib";
import * as URL from 'url';

export default class ResolverUpdate extends Create {
  static description = 'updates an existing resolver';

  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    id: flags.string({
      char: 'i',
      required: true
    }),
    mountPoint: flags.string({
      char: 'm',
      required: false
    }),
    priority: flags.integer({
      char: 'u',
      required: false
    }),
    type: flags.string({
      char: 'e',
      required: false
    }),
    format: flags.enum<OutputFormat>({
      options: [ OutputFormat.text, OutputFormat.json ],
      default: Config.outputFormat
    }),
    verbose: flags.boolean({
      default: Config.verbose,
      required: false,
      char: 'v'
    })
  }

  async run() {
    const {argv, flags} = this.parse(ResolverUpdate);

    let resolver: IResolver = !_.isEmpty(argv[0]) ? JSON.parse(argv[0]) : {};

    if (!_.isEmpty(flags.mountPoint)) {
      resolver.mountPoint = ensureMountPoint(flags.mountPoint as string);
    }

    if (!_.isEmpty(resolver.mountPoint) && (_.isEmpty(flags.priority) || flags.priority !== 0)) {
      resolver.priority = await RPCProxy.getNextResolverPriority(resolver.mountPoint);
    } else {
      resolver.priority = flags.priority;
    }
    if (!_.isEmpty(flags.type)) {
      resolver.type = flags.type;
    }

    await RPCProxy.updateResolver(flags.id, resolver);

    process.exit(0);
  }
}
