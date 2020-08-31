import {Command, flags} from '@oclif/command'
import RPCProxy from 'attic-cli-common/src/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutputFromFlags, OutputFormat} from "attic-cli-common/src/misc";

export default class UserFind extends Find {
  static description = 'finds a user via MongoDB query';

  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    id: flags.string({
      char: 'i',
      required: false
    }),
    type: flags.string({
      char: 't',
      required: false,
    }),
    disabled: flags.boolean({
      char: 'd',
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
      name: 'query'
    }
  ]


  async run() {
    const {argv, flags} = this.parse(UserFind);

    let findOptions: BasicFindOptions = this.parseFindOptions(argv, flags);

    if (!_.isEmpty(flags.type)) {
      findOptions.query.type = flags.type;
    }
    if (typeof(flags.disabled) !== 'undefined') {
      findOptions.query.disabled = flags.disabled;
    }

    let users = await RPCProxy.findUsers(findOptions);

    console.log(formatOutputFromFlags(users, flags, [ 'id', 'type', 'disabled' ]));
  }
}
