import {ObjectId} from "mongodb";
import {Schema, Document} from "mongoose";
import mongoose from "./_database";
import {CryptoAccount, CryptoAccountSchema, ICryptoAccount} from "./_account";
import {wrapVirtual} from "./_hedera";
import {HTTPError} from "./_rpcCommon";
import MagicCrypt  from 'magiccrypt';
import {makeKeyEncoder} from "./_encoder";
import * as fs from "fs-extra";
import path from "path";
import {
  generateKeyPair
} from 'crypto';
import {AccountId, PrivateKey} from "@hashgraph/sdk";

export interface IKeyPair {
  _id: ObjectId|string;

  name?: string;

  privateKey: Buffer;
  privateKeyStr: string;
  publicKey?: Buffer;
  publicKeyStr?: string;
  encrypted: boolean;
  encryptionKey?: Buffer;
  encryptionKeyStr?: string;
  encryptionKeyLength?: number;

  getPrivateKey(): Promise<Buffer>;
  setPrivateKey(key: Buffer): Promise<void>;
  getMagicCrypt(): Promise<MagicCrypt>;
  writeToEnv(name: string, account?: ICryptoAccount): Promise<void>;
  toCryptoValue(): Promise<PrivateKey>
}

export const KeyPairSchema: Schema<IKeyPair> = (new (mongoose.Schema)({
  name: {
    type: String,
    required: false
  },
  privateKey: {
    type: Buffer,
    required: true
  },
  publicKey: {
    type: Buffer
  },
  encrypted: {
    type: Boolean, required: true, default: () => false
  },
  encryptionKeyLength: {
    type: Number, required: false, default: function (): number|undefined {
      // @ts-ignore
      return this.encrypted ? Number(process.env.DEFAULT_ENCRYPTION_KEY_LENGTH) || 256 : void(0);
    }
  },
}));

KeyPairSchema.index({ name: -1 });

KeyPairSchema.virtual('encryptionKey')
  .get(function () {
    // @ts-ignore
    return Buffer.from(this.$locals.encryptionKey);
  })
  .set(function (val: any) {
    // @ts-ignore
    this.$locals.encryptionKey = Buffer.from(val);
  });

export class NoEncryptionKeyError extends HTTPError {
  constructor() {
    super(403, `You must provide an encrypt or decrypt a private key`);
  }
}

KeyPairSchema.methods.toCryptoValue = async function () {
  return PrivateKey.fromBytes(
    await this.getPrivateKey()
  );
}

export async function getNamedAccount() {

}

export async function generateCryptoKeyPair(name?: string): Promise<Document&IKeyPair> {
  const privateKey = await PrivateKey.generate();
  const keyPair = new KeyPair({
    name,
    publicKey: Buffer.from(privateKey.publicKey.toBytes()),
    privateKey: Buffer.from(privateKey.toBytes())
  });

  return keyPair;
}

export async function generateMarketplaceKeyPair(bits: number, name?: string): Promise<Document&IKeyPair> {
  const { privateKey, publicKey } = await new Promise<{ publicKey: string, privateKey: string }>((resolve, reject) => {
    generateKeyPair('rsa',
      {   modulusLength: bits,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      }, (err, publicKey, privateKey) => err ? reject(err): resolve({
        publicKey, privateKey
      }));
  });

  return new KeyPair({
    privatKey: Buffer.from(privateKey),
    publicKey: Buffer.from(publicKey),
    name,
    encrypted: false
  })
}


export class KeyNotFoundError extends HTTPError {
  constructor(public keyName: string, public type: 'id'|'name' = 'name') {
    super(500, `Requested a key (${type} "${keyName}") that doesn't exist`);
  }
}

export type KeyAccountPair = { keyPair: IKeyPair&Document, account?: ICryptoAccount&Document };

export async function keyFromEnv(envVarName: string): Promise<KeyAccountPair> {
  const {
    [`${envVarName}_PRIVATE_KEY`]: privateKeyStr,
    [`${envVarName}_PUBLIC_KEY`]: publicKeyStr,
    [`${envVarName}_ACCOUNT`]: accountObjectIdStr,
    [`${envVarName}_ACCOUNT_ID`]: accountIdStr,
    [`${envVarName}_ACCOUNT_NETWORK_NAME`]: networkName
  } = process.env;

  if (!privateKeyStr)
    throw new KeyNotFoundError(envVarName);

  const privateKey = makeKeyEncoder().decodeBuffer(privateKeyStr);
  let publicKey: Buffer|undefined;

  if (publicKeyStr)
    publicKey = makeKeyEncoder().decodeBuffer(privateKeyStr);

  let account: ICryptoAccount&Document|undefined;

  const keyPair =  new KeyPair({
    name: envVarName.split('_').map((k,i) => !i ? k.toLowerCase() : k[0].toUpperCase() + k.substr(1).toLowerCase()).join(''),
    privateKey,
    publicKey
  });

  let aId = AccountId.fromString(accountIdStr as string);

  if (accountObjectIdStr) {
    account = await CryptoAccount.findById(accountObjectIdStr).populate('keyPair') || void(0);
  } else if (accountIdStr) {
    account = new CryptoAccount({
      accountId: Buffer.from(aId.toBytes()),
      keyPair,
      networkName
    });
  }

  return {
    keyPair,
    account
  }
}

export async function getKeyByName(name: string, generateIfNotFound?: boolean): Promise<KeyAccountPair> {
  let keyPair: Document&IKeyPair|undefined;
  let account: Document&ICryptoAccount|undefined;

  try {
    let envName: string =  '';
    for (let c of name.split('')) {
      if (c.toUpperCase() === c) {
        envName += '_';
      }
      envName += c.toUpperCase();
    }
    const { keyPair: x, account: y } = await keyFromEnv(envName);
    account = y;
    keyPair = x;
    if (y) y.keyPair = x;
  } catch (err) {
    if (!(err instanceof KeyNotFoundError)) {
      throw err;
    }
  } finally {
    if (!keyPair) {
      keyPair = await KeyPair.findOne({ name });
      if (!keyPair) {
        if (!generateIfNotFound)
          throw new KeyNotFoundError(name);
        keyPair = await generateMarketplaceKeyPair(process.env.DEFAULT_ENCRYPTION_KEY_LENGTH ? Number(
          process.env.DEFAULT_ENCRYPTION_KEY_LENGTH
        ) : 256, name);

        await keyPair.writeToEnv(name, account);
      }
    }

    return {
      keyPair,
      account
    };
  }
}

async function encryptionKeyToString(key: Buffer): Promise<string> {
  const privateKeyPrivateKey = await getKeyByName('privateKeyEncryption', true);
  const masterKey = await privateKeyPrivateKey.keyPair.getPrivateKey();

  return makeKeyEncoder().encodeBuffer(Buffer.concat([
    masterKey,
    key
  ])).toString();
}

KeyPairSchema.methods.getMagicCrypt = async function () {
  if (!this.encryptionKey)
    throw new NoEncryptionKeyError();

  const key = await encryptionKeyToString(
    this.encryptionKey
  );

  return new MagicCrypt(key, this.encryptionKeyLength as any);
}

KeyPairSchema.methods.getPrivateKey = async function (): Promise<Buffer> {
  if (this.encrypted) {
    const mc = await this.getMagicCrypt();
    return mc.decryptData(Buffer.from(this.privateKey).toString('base64'));
  }

  return this.privateKey;
}
KeyPairSchema.methods.setPrivateKey = async function (key: Buffer): Promise<void> {
  if (this.encrypted) {
    const mc = await this.getMagicCrypt();
    this.privateKey = Buffer.from(mc.encryptData(this.privateKey), 'base64');
  } else {
    this.privateKey = key;
  }
}

KeyPairSchema.methods.writeToEnv = async function (name: string, account?: ICryptoAccount)  {
  let envName: string =  '';
  for (let c of name.split('')) {
    if (c.toUpperCase() === c.toLowerCase()) {
      envName += '_';
    }
    envName += c.toUpperCase();
  }
  let fn = (k: string,v:string) =>  fs.appendFile(path.join(__dirname, '..', '..', '.env'), `${name}_${k}=${v}`);
  await fn('PRIVATE_KEY', this.privateKeyStr);
  if (this.publicKeyStr) await fn('PRIVATE_KEY', this.publicKeyStr);
  if (account) {
    await fn('ACCOUNT_ID', account.accountIdStr);
    await fn('ACCOUNT_NETWORK_NAM', account.networkName);
  }
}

wrapVirtual(KeyPairSchema, 'privateKey');
wrapVirtual(KeyPairSchema, 'publicKey');
wrapVirtual(KeyPairSchema, 'encryptionKey');

export const KeyPair = mongoose.models.KeyPair || mongoose.model<IKeyPair>('KeyPair', KeyPairSchema);
