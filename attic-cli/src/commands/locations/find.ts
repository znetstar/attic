import {Command, flags} from '@oclif/command'
import RPCProxy from '../../RPC';
import Find from "../../Common/Find";
import {BasicFindOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutputFromFlags, OutputFormat} from "../../Common/misc";

export default class LocationFind extends Find {
  static description = 'conducts a MongoDB query on the Locations collection'

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

    let locs = await RPCProxy.findLocations(findOptions);


    console.log(formatOutputFromFlags(locs, flags, [ 'id', 'href', 'driver' ]));
  }
}
