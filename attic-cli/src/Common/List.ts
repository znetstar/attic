import {Command, flags} from '@oclif/command'
import {OutputFormat} from 'attic-cli-common/src/misc';
import Config from '../Config';

export default abstract class List extends Command {
  static description = 'describe the command here'

  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
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

  abstract async run(): Promise<void>;
}
