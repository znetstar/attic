import {Command, flags} from '@oclif/command'
import RPCProxy from '../RPC';
import {BasicFindOptions, BasicFindQueryOptions} from "attic-common/lib/IRPC";
import * as cliff from 'cliff';
import {OutputFormat} from './misc';
import Config from '../Config';
import * as _ from "lodash";

export default abstract class Find extends Command {
  static description = 'describe the command here'

  static args = [
    {
      name: 'query'
    }
  ]

  abstract async run(): Promise<void>;

  public parseFindOptions(argv: any, flags: any): BasicFindQueryOptions {
    let findOptions: BasicFindQueryOptions = {
      limit: flags.limit,
      query: !_.isEmpty(argv[0]) ? JSON.parse(argv[0]) : {},
      skip: flags.skip
    };

    return findOptions;
  }
}
