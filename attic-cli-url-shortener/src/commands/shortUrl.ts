import {Command, flags} from '@oclif/command'
import {formatOutputFromFlags, OutputFormat, RPCProxy} from "@znetstar/attic-cli-common";
import * as  URL from "url";
import Config from "@znetstar/attic-cli-common/lib/Config";
import {ILocation, IEntity} from "@znetstar/attic-common/lib";

export default class ShortUrl extends Command {
  static description = 'shortens an existing URI, returning the new short url'


  static flags = {
    help: flags.help({char: 'h'}),
    source: flags.string({
      char: 's',
      required: true
    }),
    href: flags.string({
      char: 'r',
      required: true
    }),
    auth: flags.string({
      char: 'u',
      required: false
    }),
    dontGenerate: flags.boolean({
      char: 'G',
      required: false
    }),
    length: flags.integer({
      char: 'n',
      required: false
    }),
    expiresIn: flags.integer({
      char: 'x',
      required: false
    }),
    driver: flags.string({
      char: 'd',
      required: true,
      default: 'HTTPRedirectDriver'
    }),
    quiet: flags.boolean(({
      required: false
    })),
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
    await this.config.runHook('config', {});
    const {args, flags} = this.parse(ShortUrl);

    let url = URL.parse(flags.href);
    let location: ILocation = null as any;

    // Check for existing entity
    let entityId: any = await RPCProxy.findEntity({ 'source.href': flags.source });

    // If it exists return the existing location
    if (entityId) {
      entityId = entityId.id;
      location = await RPCProxy.findLocation({
        host: url.host,
        port: url.port,
        auth: url.auth,
        protocol: url.protocol,
        entity: entityId
      })
    }
    else {
      // If it doesn't exist create it
      entityId = await RPCProxy.createEntity({
        'source': {
          href: flags.source
        },
        type: 'HTTPResourceEntity'
      });
    }

    let outLocation: ILocation = location;
    if (!location) {
      if (!flags.dontGenerate) {
        url.pathname = '/' + (await RPCProxy.generateId(flags.length));
      }
      if (flags.auth) {
        url.auth = flags.auth;
      }
      let href = URL.format(url);

      location = {
        href,
        entity: entityId,
        driver: flags.driver.trim()
      };

      if (flags.expiresIn) {
        location.expiresAt = (new Date((new Date()).getTime() + (flags.expiresIn as any))).toISOString() as any;
      }

      outLocation = await RPCProxy.createLocation(location);
      outLocation.entity = entityId;
    }

    let outString = formatOutputFromFlags(outLocation, flags, [ 'id', 'href', 'entity' ])

    if (!flags.quiet) /* console.log(outString); */
    return outString;
  }
}
