import {Command, flags} from '@oclif/command'
import RPCProxy from '@znetstar/attic-cli-common/lib/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions} from "@znetstar/attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {OutputFormat} from "@znetstar/attic-cli-common/lib/misc";
import Create from "../../Common/Create";
import {IEntity, ILocation} from "@znetstar/attic-common/lib";
import * as URL from 'url';

export default class EntityUpdate extends Create {
  static description = 'updates an existing entity';
  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    id: flags.string({
      char: 'i',
      required: true
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
    const {argv, flags} = this.parse(EntityUpdate);

    let entity: IEntity = !_.isEmpty(argv[0]) ? JSON.parse(argv[0]) : {};

    if (!_.isEmpty(flags.source) && flags.source) {
      let url = URL.parse(flags.source);
      let href = URL.format(url);
      entity.source = { href: href };
    }

    if (!_.isEmpty(flags.type) && flags.type) {
      entity.type = flags.type;
    }

    await RPCProxy.updateEntity(flags.id, entity);

    process.exit(0);
  }
}
