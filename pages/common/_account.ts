import {Decimal128, ObjectId} from "mongodb";
import {Schema, Document} from "mongoose";
import mongoose from "./_database";
import { wrapVirtual} from "./_hedera";
import {generateCryptoKeyPair, getKeyByName, IKeyPair, KeyNotFoundError, KeyPair, KeyPairSchema} from "./_keyPair";
import {AccountCreateTransaction, TokenId,Transaction as CryptoTransaction, AccountBalanceQuery, AccountId, Client, Hbar, PrivateKey, TransactionReceipt} from "@hashgraph/sdk";

import {NetworkName} from "@hashgraph/sdk/lib/client/Client";
import NodeClient from "@hashgraph/sdk/lib/client/NodeClient";
import {makeKeyEncoder} from "./_encoder";
import * as fs from 'fs-extra';
import * as path from 'path';
import {HTTPError} from "./_rpcCommon";
import CryptoQueue from "./_cryptoQueue";
import {Job, QueueEvents} from "bullmq";
import {getLegalTender} from "./_token";
import {add, dinero, toFormat} from "dinero.js";
import {USD} from "@dinero.js/currencies";
import TokenBalanceMap from "@hashgraph/sdk/lib/account/TokenBalanceMap";
import {IPOJOUser, IUser} from "./_user";
import {IPOJOWallet, IWallet} from "./_wallet";

export interface ICryptoAccount {
  _id: ObjectId|string;

  /**
   * Friendly name of the account.
   * This is mainly used for system (platform) accounts
   */
  name?: string;

  /**
   * Account ID as a `Buffer`
   */
  accountId: Buffer;
  accountIdStr: string;

  networkName: NetworkName;

  balance?: Decimal128;
  user?: IUser;
  userName?: string;

  /**
   * If absent, will assume this is an external address
   */
  keyPair?: IKeyPair
  createClient(): Promise<NodeClient>;
  toCryptoValue(): Promise<AccountId>;
  writeAccountToEnv(): Promise<void>;
  loadBalance(): Promise<void>;
}

export const CryptoAccountSchema: Schema<ICryptoAccount> = (new (mongoose.Schema)({
  accountId: { type: Buffer, required: true },
  keyPair: {
    type: Schema.Types.ObjectId,
    ref: 'KeyPair',
    required: false
  },
  networkName: { type: String, required: true, enum: [ 'mainnet', 'testnet', 'previewnet' ] },
  name: { type: String, required: false },
  balance: { type: Schema.Types.Decimal128, required: false },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  userName: {
    type: String,
    required: false
  }
}, { timestamps:true }));

CryptoAccountSchema.index({ user: -1 });

export const existingAccountsByKey: Map<string, ICryptoAccount&Document> = (global as any).existingAccountsByKey = (global as any).existingAccountsByKey || new Map<string, ICryptoAccount&Document>();
export const existingClientByAccountId: Map<string, Client> = (global as any).existingClientByAccountId = (global as any).existingClientByAccountId || new Map<string, Client>();


export class CannotCreateCryptoAccountForExternalAccountError extends HTTPError {
  constructor() {
    super(500, `Cannot create a crypto client for an account without its private key`);
  }
}

export type IPOJOCryptoAccount = ICryptoAccount&{
  balance: string;
  accountId: string;
  accountIdStr: string;
  user: string|null;
  _id: string;
}

export function toCryptoAccountPojo(account: ICryptoAccount): IPOJOCryptoAccount {
  return {
    _id: account._id.toString(),
    accountId: Buffer.from(account.accountId).toString('base64'),
    accountIdStr: AccountId.fromBytes(Buffer.from(account.accountId)).toString(),
    user: account.user?._id.toString()
  } as IPOJOCryptoAccount;
}


export async function ensureAccount(accountId: Buffer, networkName: NetworkName): Promise<ICryptoAccount&Document> {
  let account: ICryptoAccount&Document|null = await CryptoAccount.findOne({
    accountId: Buffer.from(accountId),
    networkName
  });

  if (!account) {
     account = new CryptoAccount({
       accountId,
       networkName: networkName
     });
  }

  return account as ICryptoAccount&Document;
}

CryptoAccountSchema.methods.createClient = async function () {
  let client: Client|undefined = existingClientByAccountId.get(this._id.toString());
  if (client)
    return client;

  if (!this.keyPair)
    throw new CannotCreateCryptoAccountForExternalAccountError();

  client = Client.forName(this.networkName as NetworkName);

  client.setOperator(await this.toCryptoValue(), (
    await this.keyPair.toCryptoValue()
  ));

  existingClientByAccountId.set(this._id.toString(), client);

  return client;
}


CryptoAccountSchema.methods.writeAccountToEnv = async function (name: string)  {
  if (!this.keyPair)
    throw new CannotCreateCryptoAccountForExternalAccountError();

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
  keyPair?: IKeyPair,
  userId?: ObjectId|string
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
          keyPairId?: ObjectId|string,
          userId?: ObjectId|string
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
          keyPairId: ObjectId|string,
          userId?: ObjectId|string
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
        networkName: masterAccount.networkName,
        user: opts.userId ? new ObjectId(opts.userId) : void(0)
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


export async function cryptoLoadBalance(accountId: ObjectId|string): Promise<void> {
  const masterAccount = await getCryptoAccountByKeyName('cryptoMaster');
  // @ts-ignore
  let self  = (this as ICryptoAccount&Document);
  const client = await masterAccount.createClient();
  const account  = await CryptoAccount.findById(accountId) as ICryptoAccount&Document;

  const getBalanceCommand = new AccountBalanceQuery()
    .setAccountId(AccountId.fromBytes(account.accountId));

  const balance = await getBalanceCommand.execute(client);
  // Filter out tokens that aren't legal tender
  const legalTender = await getLegalTender();
  const tenderIds = new Set<string>(Array.from(legalTender).map((x) => x.toString('base64')));

  let totalBalance = dinero({ amount: 0, currency: USD });

  for (const tokenId of Array.from(balance.tokens?.keys() || [] as TokenId[])) {
    if (!tenderIds.has(Buffer.from(tokenId.toBytes()).toString('base64'))) continue;

    const tokenBalance = dinero({
      amount: ((balance.tokens as TokenBalanceMap).get(tokenId) as any).toNumber(),
      currency: USD
    });

    totalBalance = add(totalBalance, tokenBalance);
  }

  const presentBalance: Decimal128 = new Decimal128(
    toFormat(totalBalance, ({ amount }) => amount.toString())
  );


  self.balance = presentBalance;
}

CryptoAccountSchema.pre<ICryptoAccount&Document>('save', async function () {
  if (!this.balance) {
    await this.loadBalance();
  }
  if (this.user) {
    await this.populate('user').execPopulate();
    this.userName = this.user.firstName;
  }
});

CryptoAccountSchema.methods.loadBalance = cryptoLoadBalance;

export const CryptoAccount = mongoose.models.CryptoAccount || mongoose.model<ICryptoAccount>('CryptoAccount', CryptoAccountSchema);
