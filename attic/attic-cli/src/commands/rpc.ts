import {Command, flags} from '@oclif/command'
import RPCProxy from '@znetstar/attic-cli-common/lib/RPC';
import Config from '../Config';
import {formatOutputFromFlags, OutputFormat} from "@znetstar/attic-cli-common/lib/misc";



export default class RPCInvoke extends Command {
  static description = 'describe the command here'


  static flags = {
    method: flags.string({
      required: true,
      char: 'm'
    }),
    params: flags.string({
      required: false,
      multiple: true,
      char: 'p'
    }),
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    format: flags.enum<OutputFormat>({
      options: [OutputFormat.text, OutputFormat.json],
      default: Config.outputFormat
    }),
    verbose: flags.boolean({
      default: Config.verbose,
      required: false,
      char: 'v'
    })
  }

  async run(): Promise<void> {
    const {argv, flags} = this.parse(RPCInvoke);
    let cmdArgs = ((flags.params || []).map(p => JSON.parse(p)));

    let result = await (RPCProxy as any)[flags.method](...cmdArgs);

    console.log(result);
  }

}
