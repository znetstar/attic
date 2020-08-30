import {Hook} from '@oclif/config'
import Config from 'attic-cli-common';

const hook: Hook<'init'> = async function (opts) {
  return Config;
}

export default hook
