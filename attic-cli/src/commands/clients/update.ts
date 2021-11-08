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
import * as URL from 'url';

export default class LocationUpdate extends Create {
  static description = 'updates an existing location, returning the url and id';
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
    hash: flags.string({
      char: 'a',
      required: false
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
    if (!_.isEmpty(flags.hash)) {
      location.hash = flags.hash;
    }

    if (flags.expiresIn) {
      location.expiresAt = (new Date((new Date()).getTime() + (flags.expiresIn as any))).toISOString() as any;
    }
    const outObject = await RPCProxy.updateLocation(flags.id, location);

    console.log(formatOutputFromFlags(outObject, flags, [ 'id', 'href' ]));
  }
}
