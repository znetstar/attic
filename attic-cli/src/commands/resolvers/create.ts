import {Command, flags} from '@oclif/command'
import RPCProxy from '../../RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutput, formatOutputFromFlags, OutputFormat} from "../../Common/misc";
import Create from "../../Common/Create";
import {ensureMountPoint, ILocation, IResolver} from "attic-common/lib";
import * as URL from 'url';

export default class ResolverCreate extends Create {
  static description = 'creates a resolver returning a resolver id'
  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    mountpoint: flags.string({
      char: 'm',
      required: true
    }),
    priority: flags.integer({
      char: 'p',
      required: false
    }),
    type: flags.string({
      char: 't',

required: true
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

  static args = [
    {
      name: 'fields'
    }
  ]


  async run() {
    const {argv, flags} = this.parse(ResolverCreate);

    let resolver: IResolver = !_.isEmpty(argv[0]) ? JSON.parse(argv[0]) : {};

    if (flags.mountpoint) {
      resolver.mountPoint = ensureMountPoint(flags.mountpoint);
    }

    if (flags.type) {
      resolver.type = flags.type;
    }
    resolver.priority = typeof (flags.priority) !== 'undefined' ? flags.priority :
      await RPCProxy.getNextResolverPriority(resolver.mountPoint);

    let resolverId = await RPCProxy.createResolver(resolver);
    let output = formatOutputFromFlags(
      {id: resolverId, 'mountPoint': resolver.mountPoint, priority: resolver.priority},
      flags,
      ['id', 'mountPoint.expression', 'priority']
    );

    console.log((output));
  }
}
