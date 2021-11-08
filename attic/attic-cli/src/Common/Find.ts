import {Command, flags} from '@oclif/command'
import RPCProxy from '@znetstar/attic-cli-common/lib/RPC';
import {BasicFindOptions} from "@znetstar/attic-common/lib/IRPC";
import * as cliff from 'cliff';
import {OutputFormat} from '@znetstar/attic-cli-common/lib/misc';
import * as _ from "lodash";
import Config from '../Config';

export default abstract class Find extends Command {
  static description = 'describe the command here'

  static args = [
    {
      name: 'query'
    }
  ]

  abstract async run(): Promise<void>;

  public parseFindOptions(argv: any, flags: any): BasicFindOptions {
    let findOptions: BasicFindOptions = {
      count: flags.count,
      limit: flags.limit,
      query: !_.isEmpty(argv[0]) ? JSON.parse(argv[0]) : {},
      skip: flags.skip,
      sort: flags.sort
    };

    return findOptions;
  }
}
