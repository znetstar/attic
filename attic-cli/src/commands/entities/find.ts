import {Command, flags} from '@oclif/command'
import RPCProxy from '../../RPC';
import Find from "../../Common/Find";
import {BasicFindOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutputFromFlags, OutputFormat} from "../../Common/misc";

export default class EntityFind extends Find {
  static description = 'conducts a MongoDB query on the Entities collection'

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

    let ents = await RPCProxy.findEntity(findOptions);

    let output: string;
    if (typeof(ents) === 'number') {
      output = String(ents);
    } else {
      output = <string>formatOutputFromFlags(ents, flags, [ 'id', 'type', 'source.href' ]);
    }

    console.log(output);
  }
}
