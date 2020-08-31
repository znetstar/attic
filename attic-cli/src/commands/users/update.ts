import {Command, flags} from '@oclif/command'
import RPCProxy from 'attic-cli-common/src/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutputFromFlags, OutputFormat} from "attic-cli-common/src/misc";
import Create from "../../Common/Create";
import {ILocation} from "attic-common/lib";
import * as URL from 'url';
import {default as IUser} from "attic-common/lib/IUser";

export default class LocationUpdate extends Create {
  static description = 'updates an existing location';
  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    id: flags.string({
      char: 'i',
      required: true
    }),
    username: flags.string({
      char: 'u',
      required: false
    }),
    type: flags.string({
      char: 't',
      required: true
    }),
    disabled: flags.boolean({
      char: 'd',
      required: false,
      default: false
    }),
    expiresIn: flags.integer({
      required: false,
      char: 'x'
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
    const {argv, flags} = this.parse(LocationUpdate);

    let user: IUser = !_.isEmpty(argv[0]) ? JSON.parse(argv[0]) : {};

    if (!_.isEmpty(flags.type)) {
      user.type = flags.type;
    }
    if (typeof(flags.disabled) !== 'undefined') {
      user.disabled = flags.disabled;
    }
    if (flags.expiresIn) {
      user.expiresAt = new Date((new Date()).getTime() + flags.expiresIn);
    }
    if (!_.isEmpty(flags.username) && flags.username) {
      user.username = flags.username;
    } else {
      user.username = await RPCProxy.generateUsername();
    }

    await RPCProxy.updateUser(flags.id, user);

    process.exit(0);
  }
}
