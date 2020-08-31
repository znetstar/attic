import {Hook} from '@oclif/config'
import Config from '@znetstar/attic-cli-common/lib/Config';

const hook: Hook<'init'> = async function (opts) {
  return Config;
}

export default hook
