import {Command, flags} from '@oclif/command'
import RPCProxy, {authAgent} from '@znetstar/attic-cli-common/lib/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions, BasicTextSearchOptions, OAuthTokenRequest} from "@znetstar/attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutputFromFlags, OutputFormat} from "@znetstar/attic-cli-common/lib/misc";
import Search from "../../Common/Search";
import {DEFAULT_ALLOWED_GRANTS, OAuthAgent} from "@znetstar/attic-cli-common/lib/OAuthAgent";


export default class Login extends Command {
  static description =  'attempts to log in with provided credentials';
  static aliases = [ 'login' ]
  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    username: flags.string({
      char: 'u',
      default: Config.username,
      required: false
    }),
    clientId: flags.string({
      char: 'i',
      required: true,
      default: Config.clientId,
      dependsOn: [ 'clientSecret' ]
    }),
    clientSecret: flags.string({
      char: 's',
      required: true,
      default: Config.clientSecret,
      dependsOn: [ 'clientId' ]
    }),
    scope: flags.string({
      multiple: true,
      required: false,
      default: [ '.*', 'group.service' ]
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
    const {argv, flags} = this.parse(Login);

    let redirectUri = Config.redirectUri ? Config.redirectUri : ( Config.serverUri );
    let tokenRequest: OAuthTokenRequest = {
      client_id: flags.clientId || process.env.CLIENT_ID,
      client_secret: flags.clientSecret || process.env.CLIENT_SECRET,
      redirect_uri: redirectUri || process.env.REDIRECT_URI || process.env.SERVER_URI,
      username: flags.username || process.env.USERNAME,
      scope: flags.scope,
      grant_type: 'client_credentials'
    } as any as OAuthTokenRequest;

    const { RPCProxy }  = authAgent.createRPCProxy(tokenRequest);

    let token = await RPCProxy.getAccessToken(tokenRequest);

    Config.set('accessToken', token.access_token);
    Config.set('refreshToken', token.refresh_token);
    Config.set('redirectUri', redirectUri);

    // @ts-ignore
    Config.save();

    let output: string = <string>formatOutputFromFlags(token, flags, [ 'access_token', 'refresh_token', 'scope' ]);

    console.log(output);
  }
}
