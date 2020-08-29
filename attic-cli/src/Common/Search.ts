import {Command, flags} from '@oclif/command'
import RPCProxy from '../RPC';
import {BasicFindOptions, BasicTextSearchOptions} from "attic-common/lib/IRPC";
import * as cliff from 'cliff';
import {OutputFormat} from './misc';
import * as _ from "lodash";

export default abstract class Search extends Command {
  static description = 'describe the command here'

  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    skip: flags.integer({
      char: 's',
      required: false
    }),
    limit: flags.integer({
      char: 'l',
      required: false
    }),
    count: flags.boolean({
      char: 'c',
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
      name: 'terms'
    }
  ]

  abstract async run(): Promise<void>;

  public parseSearchOptions(): BasicTextSearchOptions {
    const {argv, flags} = this.parse(Search);

    let searchOptions: BasicTextSearchOptions = {
      count: flags.count,
      limit: flags.limit,
      terms: !_.isEmpty(argv[0]) ? String(argv[0]) : '',
      skip: flags.skip
    };

    return searchOptions;
  }
}
