import {Command, flags} from '@oclif/command'
import RPCProxy from '@znetstar/attic-cli-common/lib/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions} from "@znetstar/attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {OutputFormat} from "@znetstar/attic-cli-common/lib/misc";
import Delete from "../../Common/Delete";

export default class EntityDelete extends Delete {
  static description = 'deletes an entity'

  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    id: flags.string({
      char: 'i',
      required: false
    }),
    source: flags.string({
      char: 's',
      required: true
    }),
    type: flags.string({
      char: 't',
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
    const {argv, flags} = this.parse(EntityDelete);

    let findOptions: BasicFindOptions = this.parseFindOptions(argv, flags);

    if (!_.isEmpty(flags.id)) {
      findOptions.query.id = flags.id;
    }
    if (!_.isEmpty(flags.source)) {
      findOptions.query['source.href'] = flags.source;
    }
    if (!_.isEmpty(flags.type)) {
      findOptions.query.type = flags.type;
    }

    await RPCProxy.deleteEntities(findOptions);

    process.exit(0);
  }
}
