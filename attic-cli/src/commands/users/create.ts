import {Command, flags} from '@oclif/command'
import RPCProxy from '@znetstar/attic-cli-common/lib/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions} from "@znetstar/attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutputFromFlags, OutputFormat} from "@znetstar/attic-cli-common/lib/misc";
import Create from "../../Common/Create";
import {ILocation} from "@znetstar/attic-common/lib";
import { default as IUser } from '@znetstar/attic-common/lib/IUser';
import * as URL from 'url';

export default class UserCreate extends Create {
  static description = 'creates a user returning a user id'
  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    type: flags.string({
      char: 't',
      required: true
    }),
    username: flags.string({
      char: 'u',
      required: false
    }),
    disabled: flags.boolean({
      char: 'd',
      required: false,
      default: false
    }),
    password: flags.string({
      required: false,
      char: 'p'
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
    const {argv, flags} = this.parse(UserCreate);

    let user: IUser = !_.isEmpty(argv[0]) ? JSON.parse(argv[0]) : {};


    if (typeof(flags.disabled) !== 'undefined') {
      user.disabled = flags.disabled;
    }
    if (flags.password) {
      user.password = flags.password;
    }

    if (!_.isEmpty(flags.username) && flags.username) {
      user.username = flags.username;
    } else {
      user.username = await RPCProxy.generateUsername();
    }

    let output: string;
    let userId = await RPCProxy.createUser(user);

    let outObject = { id: userId, username: user.username };

    console.log(formatOutputFromFlags(outObject, flags, [ 'id', 'username' ]));
  }
}
