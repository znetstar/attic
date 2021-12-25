import {Command, flags} from '@oclif/command'
import RPCProxy from '@znetstar/attic-cli-common/lib/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions} from "@znetstar/attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutputFromFlags, OutputFormat} from "@znetstar/attic-cli-common/lib/misc";

export default class EntityFind extends Find {
  static description = 'finds an entity via MongoDB query'

  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    id: flags.string({
      char: 'i',
      required: false
    }),
    source: flags.string({
      char: 's',
      required: false
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

  static args = [
    {
      name: 'query'
    }
  ]


  async run() {
    const {argv, flags} = this.parse(EntityFind);

    let findOptions: BasicFindOptions = this.parseFindOptions(argv, flags);

    if (!_.isEmpty(flags.id)) {
      findOptions.query.id = flags.id;
    }
    if (!_.isEmpty(flags.type)) {
      findOptions.query.type = flags.type;
    }
    if (!_.isEmpty(flags.source)) {
      findOptions.query['source.href'] = flags.source;
    }

    let ents = await RPCProxy.findEntities(findOptions);

    let output: string;
    if (typeof(ents) === 'number') {
      output = String(ents);
    } else {
      output = <string>formatOutputFromFlags(ents, flags, [ 'id', 'type', 'source.href' ]);
    }

    /* console.log(output); */
  }
}
