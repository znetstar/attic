import {Command, flags} from '@oclif/command'
import RPCProxy from '../RPC';
import {BasicFindOptions} from "attic-common/lib/IRPC";
import * as cliff from 'cliff';
import {OutputFormat} from './misc';
import Config from '../Config';
import * as _ from "lodash";

export default abstract class Create extends Command {
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
  //
  // static args = [
  //   {
  //     name: 'fields'
  //   }
  // ]

  abstract async run(): Promise<void>;

  // public parseFields(argv: any, flags: any): any {
  //   let fields = !_.isEmpty(argv[0]) ? JSON.parse(argv[0]) : {};
  //
  //   return fields;
  // }
}
