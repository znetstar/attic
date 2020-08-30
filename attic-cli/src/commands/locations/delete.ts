import {Command, flags} from '@oclif/command'
import RPCProxy from 'attic-cli-common/src/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {OutputFormat} from "attic-cli-common/src/misc";
import Delete from "../../Common/Delete";

export default class LocationDelete extends Delete {
  static description = 'deletes a location'

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
      default: Config.outputFormat
    }),
    verbose: flags.boolean({
      default: Config.verbose,
      required: false,
      char: 'v'
    })
  }

  async run() {
    const {argv, flags} = this.parse(LocationDelete);

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

    await RPCProxy.deleteLocations(findOptions);

    process.exit(0);
  }
}
