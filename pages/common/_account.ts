import {ObjectId} from "mongodb";
import {Schema, Document} from "mongoose";
import mongoose from "./_database";
import { wrapVirtual} from "./_hedera";
import {generateCryptoKeyPair, getKeyByName, IKeyPair, KeyNotFoundError, KeyPair, KeyPairSchema} from "./_keyPair";
import {AccountCreateTransaction, AccountId, Client, Hbar, PrivateKey, TransactionReceipt} from "@hashgraph/sdk";

import {NetworkName} from "@hashgraph/sdk/lib/client/Client";
import NodeClient from "@hashgraph/sdk/lib/client/NodeClient";
import {makeKeyEncoder} from "./_encoder";
import * as fs from 'fs-extra';
import * as path from 'path';
import {HTTPError} from "./_rpcCommon";
import CryptoQueue from "./_cryptoQueue";
import {Job, QueueEvents} from "bullmq";

export interface ICryptoAccount {
  _id: ObjectId|string;

  name?: string;

  accountId: Buffer;
  accountIdStr: string;
  networkName: NetworkName;

  keyPair: IKeyPair
  createClient(): Promise<NodeClient>;
  toCryptoValue(): Promise<AccountId>;

  writeAccountToEnv(): Promise<void>;
}

export const CryptoAccountSchema: Schema<ICryptoAccount> = (new (mongoose.Schema)({
  accountId: { type: Buffer, required: true },
  keyPair: {
    type: Schema.Types.ObjectId,
    ref: 'KeyPair',
    required: true
  },
  networkName: { type: String, required: true, enum: [ 'mainnet', 'testnet', 'previewnet' ] },
  name: { type: String, required: false }
}, { timestamps:true }));

export const existingAccountsByKey: Map<string, ICryptoAccount&Document> = (global as any).existingAccountsByKey = (global as any).existingAccountsByKey || new Map<string, ICryptoAccount&Document>();
export const existingClientByAccountId: Map<string, Client> = (global as any).existingClientByAccountId = (global as any).existingClientByAccountId || new Map<string, Client>();

CryptoAccountSchema.methods.createClient = async function () {
  let client: Client|undefined = existingClientByAccountId.get(this._id.toString());
  if (client)
    return client;

  client = Client.forName(this.networkName as NetworkName);

  client.setOperator(await this.toCryptoValue(), (
    await this.keyPair.toCryptoValue()
  ));

  existingClientByAccountId.set(this._id.toString(), client);

  return client;
}


CryptoAccountSchema.methods.writeAccountToEnv = async function (name: string)  {
  await this.keyPair.writeToEnv(name, this);
}

wrapVirtual(CryptoAccountSchema, 'accountId');


export class NoCryptoAccountError extends HTTPError {
  constructor(name: string) {
    super(500, `Keys for ${name} not found`);
  }
}

export class AccountCouldNotBeCreated extends HTTPError {
  constructor() {
    super(500, `Account could not be created from the required info`);
  }
}


export async function getCryptoAccountByKeyName(keyName: string): Promise<ICryptoAccount&Document> {
  const keys = await getKeyByName(keyName);
  if (!keys || !keys.account)
    throw new NoCryptoAccountError(keyName);

  return keys.account;
}

export async function createCryptoAccount(initialBalance: number = 1000, opts: {
  name?: string;
  keyPair?: IKeyPair
} = {}): Promise<ICryptoAccount&Document> {
  const queue = CryptoQueue.createCryptoQueue(
    'crypto:createAccount',
    async (job: Job) => {
      let  {
        initialBalance,
        opts
      }: {
        initialBalance: number,
        opts?: {
          name?: string,
          keyPairId?: ObjectId|string
        }
      } = job.data;

      const masterAccount = await getCryptoAccountByKeyName('cryptoMaster');
      const client = await masterAccount.createClient();
      const keyPairId: ObjectId|string|undefined =  opts?.keyPairId;
      let keyPair: IKeyPair&Document;
      if (!keyPairId) {
        keyPair = await generateCryptoKeyPair();

        await keyPair.save();
      } else {
        keyPair = await KeyPair.findById(keyPairId).exec();
        if (!keyPair) {
          throw new KeyNotFoundError(keyPairId.toString(), 'id');
        }
      }

      job.data.opts = {
        ...job.data.opts,
        keyPairId: keyPair._id.toString()
      };

      const newAccountTransactionResponse = await new AccountCreateTransaction()
        .setKey(await keyPair.toCryptoValue())
        .setInitialBalance(Hbar.fromTinybars(initialBalance))
        .execute(client);

      return newAccountTransactionResponse.transactionId;
    },
    async (job: Job, getReceipt: TransactionReceipt) => {
      let  {
        opts
      }: {
        initialBalance: number,
        opts: {
          name?: string,
          keyPairId: ObjectId|string
        }
      } = job.data;

      const masterAccount = await getCryptoAccountByKeyName('cryptoMaster');
      const client = await masterAccount.createClient();

      const keyPair = await KeyPair.findById(opts.keyPairId).exec();
      if (!keyPair) {
        throw new KeyNotFoundError(keyPair.toString(), 'id');
      }

      if (!getReceipt.accountId)
        throw new AccountCouldNotBeCreated();

      const account = new CryptoAccount({
        name: opts.name,
        keyPair,
        accountId: Buffer.from(getReceipt.accountId.toBytes()),
        networkName: masterAccount.networkName
      });

      await account.save();

      return account._id.toString();
    }
  );


  const job = await queue.addJob('beforeConfirm', {
    initialBalance,
    opts
  }, true);

  return (await CryptoAccount.findById(job.returnvalue)) as ICryptoAccount&Document;
}

CryptoAccountSchema.methods.toCryptoValue = async function (): Promise<AccountId> {
  return AccountId.fromBytes(Buffer.from(this.accountId));
}

export const CryptoAccount = mongoose.models.CryptoAccount || mongoose.model<ICryptoAccount>('CryptoAccount', CryptoAccountSchema);

