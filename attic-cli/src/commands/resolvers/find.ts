import {Command, flags} from '@oclif/command'
import RPCProxy from '../../RPC';
import Find from "../../Common/Find";
import {BasicFindOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutput, formatOutputFromFlags, OutputFormat} from "../../Common/misc";
import {ensureMountPoint} from "attic-common/lib";

export default class ResolverFind extends Find {
  static description = 'conducts a MongoDB query on the Locations collection'

  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    id: flags.string({
      char: 'i',
      required: false
    }),
    mountpoint: flags.string({
      char: 'm',
      required: false
    }),
    priority: flags.integer({
      char: 'p',
      required: false
    }),
    type: flags.string({
      char: 't',
      required: false
    }),
    skip: flags.integer({
      char: 's',
      required: false
    }),
    limit: flags.integer({
      char: 'l',
      required: false
    }),
    sort: flags.string({
      char: 'o',
      required: false
    }),
    format: flags.enum<OutputFormat>({
      options: [ OutputFormat.text, OutputFormat.json ],
      default: OutputFormat.text
    }),
    verbose: flags.boolean({
      default: false,
      required: false,
      char: 'v'
    })
  }

  static args = [
    {
      name: 'query'
    }
  ]


  async run() {
    const {argv, flags} = this.parse(ResolverFind);

    let findOptions: BasicFindOptions = this.parseFindOptions(argv, flags);

    if (!_.isEmpty(flags.id)) {
      findOptions.query.id = flags.id;
    }
    if (!_.isEmpty(flags.mountpoint)) {
      findOptions.query['mountPoint.expression'] = flags.mountpoint;
    }
    if (!_.isEmpty(flags.priority) || flags.priority === 0) {
      findOptions.query.priority = flags.priority;
    }
    if (!_.isEmpty(flags.type)) {
      findOptions.query.type = flags.type;
    }

    let resolvers = await RPCProxy.findResolvers(findOptions);

    let output: string;
    if (typeof(resolvers) === 'number') {
      output = String(resolvers);
    } else {
      output = <string>formatOutputFromFlags(resolvers, flags, [ 'id', 'mountPoint.expression', 'type', 'priority' ]);
    }

    console.log(output);
  }
}
