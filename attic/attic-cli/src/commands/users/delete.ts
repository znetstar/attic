import {Command, flags} from '@oclif/command'
import RPCProxy from '@znetstar/attic-cli-common/lib/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions} from "@znetstar/attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {OutputFormat} from "@znetstar/attic-cli-common/lib/misc";
import Delete from "../../Common/Delete";

export default class UserDelete extends Delete {
  static description = 'deletes a user'

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
      required: false,
      default: false
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

  async run() {
    const {argv, flags} = this.parse(UserDelete);

    let findOptions: BasicFindOptions = this.parseFindOptions(argv, flags);

    if (!_.isEmpty(flags.type)) {
      findOptions.query.type = flags.type;
    }
    if (typeof(flags.disabled) !== 'undefined') {
      findOptions.query.disabled = flags.disabled;
    }

    await RPCProxy.deleteUser(findOptions);

    process.exit(0);
  }
}
