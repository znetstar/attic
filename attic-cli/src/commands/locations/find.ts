import {Command, flags} from '@oclif/command'
import RPCProxy from '@znetstar/attic-cli-common/lib/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions} from "@znetstar/attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutputFromFlags, OutputFormat} from "@znetstar/attic-cli-common/lib/misc";

export default class LocationFind extends Find {
  static description = 'finds a location via MongoDB query';

  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    id: flags.string({
      char: 'i',
      required: false
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
    hash: flags.string({
      char: 'a',
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
    const {argv, flags} = this.parse(LocationFind);

    let findOptions: BasicFindOptions = this.parseFindOptions(argv, flags);

    if (!_.isEmpty(flags.id)) {
      findOptions.query.id = flags.id;
    }
    if (!_.isEmpty(flags.href)) {
      findOptions.query.href = flags.href;
    }
    if (!_.isEmpty(flags.auth)) {
      findOptions.query.auth = flags.auth;
    }
    if (!_.isEmpty(flags.entity)) {
      findOptions.query.entity = flags.entity;
    }
    if (!_.isEmpty(flags.driver)) {
      findOptions.query.driver = flags.driver;
    }
    if (!_.isEmpty(flags.hash)) {
      // @ts-ignore
      location.hash = flags.hash;
    }

    let locs = await RPCProxy.findLocations(findOptions);


    console.log(formatOutputFromFlags(locs, flags, [ 'id', 'href', 'driver', 'expiresAt' ]));
  }
}
