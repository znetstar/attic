import {Command, flags} from '@oclif/command'
import RPCProxy from '../../RPC';
import Find from "../../Common/Find";
import {BasicFindOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {OutputFormat} from "../../Common/misc";
import Create from "../../Common/Create";
import {ILocation} from "attic-common/lib";
import * as URL from 'url';

export default class LocationUpdate extends Create {
  static description = 'updates an existing location, returning nothing';
  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    id: flags.string({
      char: 'i',
      required: true
    }),
    href: flags.string({
      char: 'r',
      required: false
    }),
    auth: flags.string({
      char: 'u',
      required: false
    }),
    entity: flags.string({
      char: 'e',
      required: false
    }),
    driver: flags.string({
      char: 'd',
      required: false
    }),
    short: flags.boolean({
      char: 's',
      required: false,
      default: false
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

  async run() {
    const {argv, flags} = this.parse(LocationUpdate);

    let location: ILocation = !_.isEmpty(argv[0]) ? JSON.parse(argv[0]) : {};

    if (!_.isEmpty(flags.href) && flags.href) {
      let url = URL.parse(flags.href);
      if (flags.short) {
        url.pathname = '/' + (await RPCProxy.generateId());
      }
      let href = URL.format(url);
      location.href = href;
    }

    if (!_.isEmpty(flags.auth)) {
      location.auth = flags.auth;
    }
    if (!_.isEmpty(flags.entity)) {
      location.entity = flags.entity;
    }
    if (!_.isEmpty(flags.driver)) {
      location.driver = flags.driver;
    }

    await RPCProxy.updateLocation(flags.id, location);

    process.exit(0);
  }
}
