import {Command, flags} from '@oclif/command'
import RPCProxy from 'attic-cli-common/src/RPC';
import Config from '../Config';
import Find from "../Common/Find";
import {BasicFindOptions, BasicTextSearchOptions} from "attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutput, formatOutputFromFlags, OutputFormat} from "attic-cli-common/src/misc";
import Search from "../Common/Search";
import {ensureMountPoint, ILocation, IResolver} from "attic-common/lib";

export default abstract class Resolve extends Command {
  static description = 'de'

  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    id: flags.string({
      char: 'i',
      required: false
    }),
    noCache: flags.boolean({
      char: 'C',
      required: false,
      default: false
    }),
    href: flags.string({
      char: 'r',
      required: false
    }),
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

  static args = [
    {
      name: 'property'
    }
  ]


  protected parseResolveFields(argv: any, flags: any) {
    let location: ILocation = !_.isEmpty(argv[0]) ? JSON.parse(argv[0]) : {};

    if (!_.isEmpty(flags.href)) {
      location.href = <string>flags.href;
    }

    return location;
  }

  abstract async run(): Promise<void>;
}

