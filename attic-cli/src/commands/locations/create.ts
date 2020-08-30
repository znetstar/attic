import {Command, flags} from '@oclif/command'
import RPCProxy from '../../RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutputFromFlags, OutputFormat} from "../../Common/misc";
import Create from "../../Common/Create";
import {ILocation} from "attic-common/lib";
import * as URL from 'url';

export default class LocationCreate extends Create {
  static description = 'creates a location returning a location id'
  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    href: flags.string({
      char: 'r',
      required: true
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
    const {argv, flags} = this.parse(LocationCreate);

    let location: ILocation = !_.isEmpty(argv[0]) ? JSON.parse(argv[0]) : {};

    let url = URL.parse(flags.href);
    if (flags.short) {
      url.pathname = '/'+(await RPCProxy.generateId());
    }
    let href = location.href = URL.format(url);

    if (!_.isEmpty(flags.auth)) {
      location.auth = flags.auth;
    }
    if (!_.isEmpty(flags.entity)) {
      location.entity = flags.entity;
    }
    if (!_.isEmpty(flags.driver)) {
      location.driver = flags.driver;
    }

    let output: string;
    let locationId = await RPCProxy.createLocation(location);

    let outObject = { id: locationId, href };

    console.log(formatOutputFromFlags(outObject, flags, [ 'id', 'href' ]));
  }
}
