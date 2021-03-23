import {Command, flags} from '@oclif/command'
import RPCProxy from '@znetstar/attic-cli-common/lib/RPC';
import Config from '../../Config';
import Find from "../../Common/Find";
import {BasicFindOptions, BasicTextSearchOptions, OAuthTokenRequest} from "@znetstar/attic-common/lib/IRPC";
import * as cliff from "cliff";
import * as _ from 'lodash';
import {formatOutputFromFlags, OutputFormat} from "@znetstar/attic-cli-common/lib/misc";
import Search from "../../Common/Search";

export default class Login extends Command {
  static description =  'attempts to log in with provided credentials';
  static aliases = [ 'login' ]
  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    username: flags.string({
      char: 'u',
      required: false,
      dependsOn: [ 'password' ]
    }),
    password: flags.string({
      char: 'p',
      required: false,
      dependsOn: [ 'username' ]
    }),
    refreshToken: flags.string({
      char: 'r',
      required: false,
      default: Config.refreshToken
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
      default: [ '.*' ]
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
      client_id: flags.clientId,
      client_secret: flags.clientSecret,
      redirect_uri: redirectUri
    } as any as OAuthTokenRequest;

    if (flags.username && flags.password) {
      tokenRequest = {
        ...tokenRequest,
        grant_type: 'password',
        username: flags.username,
        password: flags.password,
        scope: flags.scope
      }
    } else if (flags.refreshToken) {
      tokenRequest = {
        ...tokenRequest,
        grant_type: 'refresh_token',
        refresh_token: flags.refreshToken
      }
    } else {
      throw new Error(`Must provide refresh token or username/password`);
    }

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
