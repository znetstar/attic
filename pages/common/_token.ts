import {ObjectId} from "mongodb";
import mongoose from "./_database";
import {Document, Schema} from "mongoose";
import {generateCryptoKeyPair, IKeyPair, KeyNotFoundError, KeyPair, KeyPairSchema} from "./_keyPair";
import {
  AccountCouldNotBeCreated, CannotCreateCryptoAccountForExternalAccountError,
  createCryptoAccount,
  CryptoAccount, ensureAccount,
  getCryptoAccountByKeyName,
  ICryptoAccount, NoCryptoAccountError
} from "./_account";
import {wrapVirtual} from "./_hedera";
import * as _ from 'lodash';
import {
  Job,
  Queue,
  Worker,
  QueueScheduler,
  WorkerOptions,
  JobsOptions,
  QueueOptions,
  QueueSchedulerOptions,
  QueueEvents
} from "bullmq"
import {
  AccountCreateTransaction,
  Hbar,
  PrivateKey, TokenBurnTransaction,
  TokenCreateTransaction, TokenId,
  TokenGrantKycTransaction,
  TransactionId,
  TokenMintTransaction,
  TransactionReceipt,
  TokenDeleteTransaction,

  TransferTransaction, AccountId, Transaction, TokenAssociateTransaction, Status, StatusError
} from '@hashgraph/sdk';
import CryptoQueue, {CryptoError} from "./_cryptoQueue";
import {HTTPError} from "./_rpcCommon";
import {bullRedis} from "./_bull";
import stripe from "./_stripe";
import {Stripe} from "stripe";
import {makeInternalCryptoEncoder} from "./_encoder";
import {NetworkName} from "@hashgraph/sdk/lib/client/Client";
import {IUser, User} from "./_user";
import NodeClient from "@hashgraph/sdk/lib/client/NodeClient";
import {client} from "websocket";

export enum TokenType {
  token = 'FUNGIBLE_COMMON',
  nft = 'NON_FUNGIBLE_UNIQUE'
}

export enum TokenSupplyType {
  infinite = 'INFINITE',
  finite = 'FINITE'
}

export type IToken = {
  _id: ObjectId|string;
  name: string;
  symbol: string;
  adminKey?: string;
  kycKey?: IKeyPair;
  freezeKey?: IKeyPair;
  wipeKey?: IKeyPair;
  supplyKey?: IKeyPair;
  feeScheduleKey?: IKeyPair;
  treasury: ICryptoAccount;
  tokenType: TokenType;
  memo?: string;
  tokenId?: Buffer;
  minted: number;

  cryptoCreateToken(initalSupply: number, extraFields?: { [name: string]: unknown }): Promise<Buffer>;
  cryptoMintToken(amount: number, metadatas?: Buffer[]): Promise<void>
  cryptoBurnToken(amount: number): Promise<void>;
  cryptoTransferFungible(executingAccountId: ObjectId|string, lines: Map<{ to: Buffer, from?: Buffer }, number>): Promise<void>;
  cryptoAssociate(accountId: ObjectId|string): Promise<void>;
  cryptoGrantKyc(accountId: ObjectId|string): Promise<void>;
}&(
  {
    supplyType: TokenSupplyType.infinite
  }|{
    supplyType: TokenSupplyType.finite,
    maxSupply: number;
    decimals: number;
  }
)

export const TokenSchema: Schema<IToken> = (new (mongoose.Schema)({
  name: {
    type: String,
    required: true,
    unique: true
  },
  symbol: {
    type: String,
    required: true,
    unique: true
  },
  memo: {
    type: String,
    required: false
  },
  adminKey: {
    type: Schema.Types.ObjectId,
    ref: 'KeyPair'
  },
  kycKey: {
    type: Schema.Types.ObjectId,
    ref: 'KeyPair'
  },
  freezeKey: {
    type: Schema.Types.ObjectId,
    ref: 'KeyPair'
  },
  wipeKey: {
    type: Schema.Types.ObjectId,
    ref: 'KeyPair'
  },
  supplyKey: {
    type: Schema.Types.ObjectId,
    ref: 'KeyPair'
  },
  feeScheduleKey: {
    type: Schema.Types.ObjectId,
    ref: 'KeyPair'
  },
  tokenType: {
    type: String,
    required: true,
    enum: [
      TokenType.nft,
      TokenType.token
    ]
  },
  supplyType: {
    type: String,
    required: true,
    enum: [
      TokenSupplyType.infinite,
      TokenSupplyType.finite
    ]
  },
  treasury: {
    type: Schema.Types.ObjectId,
    ref: 'CryptoAccount',
    required: true
  },
  maxSupply: {
    type: Number,
    required: false,
    // @ts-ignore
    validate: function (x?: number): boolean {
      // @ts-ignore
      return this.supplyType === TokenSupplyType.finite ? !Number.isNaN(Number(x)) : typeof(x) === 'undefined';
    }
  },
  decimals: {
    type: Number,
    required: false,
    // @ts-ignore
    default: function (x?: number): boolean {
      // @ts-ignore
      return this.supplyType === TokenSupplyType.finite ? 2 : undefined;
    },
    // @ts-ignore
    validate: function (x?: number): boolean {
      // @ts-ignore
      return this.supplyType === TokenSupplyType.finite ? !Number.isNaN(Number(x)) : undefined;
    }
  },
  tokenId: {
    type: Buffer,
    required: false
  },
  minted: {
    type: Number,
    required: true,
    default: () => 0
  }
}, { timestamps:true ,discriminatorKey: 'tokenType' }));

TokenSchema.pre<IToken>('save', async function () {
  this.treasury = this.treasury || (await  CryptoAccount.findOne({
    name: 'marketplaceTreasury'
  }) as ICryptoAccount&Document);
})

export class NoTokenIdInReceiptError extends HTTPError {
  constructor() {
    super(500, `No token id in receipt`)
  }
}

export class TokenNotFoundError extends HTTPError {
  constructor(id: string|ObjectId) {
    super(404, `Token ${id.toString()} not found in db`)
  }
}

export class SymbolNotFoundError extends HTTPError {
  constructor(symbol: string) {
    super(404, `Token with symbol ${symbol} not found`)
  }
}

export class CannotInteractWithTokenNotCreatedError extends HTTPError {
  constructor(id: string|ObjectId) {
    super(400, `Token ${id.toString()} has not been created on the crypto network, so you cannot interact with it`)
  }
}
export class MissingKeyError extends HTTPError {
  constructor(id: string|ObjectId, key: string) {
    super(400, `Token ${id.toString()} is missing ${key} key, so cannot perform this operation`)
  }
}
export class WrongTokenTypeError extends HTTPError {
  constructor() {
    super(400, `The requested operation cannot take place on a token of this typee`)
  }
}

TokenSchema.methods.cryptoCreateToken = async function (
  initialSupply: number,
  extraFields?: { [name: string]: unknown }
): Promise<Buffer> {
  if (this.tokenId)
    return this.tokenId;

  const queue = CryptoQueue.createCryptoQueue(
    'crypto:createToken',
    async (job: Job) => {
      let  {
        initialSupply,
        extraFields,
        id
      }: {
        initialSupply: number,
        extraFields?: { [name: string]: unknown },
        id: string
      } = job.data;

      const token = await Token.findById(id).populate('adminKey kycKey freezeKey wipeKey supplyKey feeScheduleKey treasury').exec();

      if (!token)
        throw new TokenNotFoundError(id);

      const masterAccount = await getCryptoAccountByKeyName('cryptoMaster');
      const client = await masterAccount.createClient();


      let transaction: any = (new TokenCreateTransaction());

      let allFields = { ...(token as any)._doc, ...(extraFields || {}) };

      await token.populate('treasury.keyPair').execPopulate();
      const treasuryKey = await token.treasury.keyPair.toCryptoValue();
      let keys: PrivateKey[] = [  ];
      for (let $fieldName of Object.keys(allFields)) {
        for (let setName of [
          `set${ $fieldName[0].toUpperCase()+ $fieldName.substr(1)}`,
          `setToken${ $fieldName[0].toUpperCase()+ $fieldName.substr(1)}`,
          `set${ $fieldName[0].toUpperCase()+ $fieldName.substr(1)}AccountId`
        ]) {
          const rawValue = allFields[$fieldName];
          if ((transaction as any)[setName] && rawValue) {
            let value: any = rawValue;
            if (rawValue.toCryptoValue) {
              value = await rawValue.toCryptoValue();
              if (value.publicKey)
                keys.push(value);
            }

            (transaction as any)[setName](value);
            break;
          }
        }
      }
      transaction = transaction.freezeWith(client);
      keys.push(treasuryKey);

      let tx: any = transaction;
      for (const key of keys) {
        tx = await tx.sign(key);
      }
      const txResponse = await tx.execute(client);
      return txResponse.transactionId;
    },
    async (job: Job, getReceipt: TransactionReceipt) => {
      let  {
        initialSupply,
        extraFields,
        id
      }: {
        initialSupply: number,
        extraFields?: { [name: string]: unknown }
        id: string
      } = job.data;

      const tokenDoc = await Token.findOne({
        _id: new ObjectId(id)
      });

      if (!tokenDoc)
        throw new TokenNotFoundError(id);

      if  (!getReceipt.tokenId)
        throw new NoTokenIdInReceiptError();

      const tokenId = Buffer.from(getReceipt.tokenId.toBytes());
      const treasury = await CryptoAccount.findById(tokenDoc.treasury).populate('keyPair');

      console.debug(`💵 created new token ${tokenDoc.symbol} (${getReceipt.tokenId.toString()}) on ${treasury.networkName}`)

      await Promise.all([
        Token.collection.updateOne({
          _id: tokenDoc._id
        }, {
          $set: {
            tokenId,
            updatedAt: new Date()
          },
          $inc: {
            __v: 1
          }
        }),
        CryptoAccount.collection.updateOne({
          _id: treasury._id
        }, {
          $addToSet: {
            associatedTokens: tokenDoc._id,
            kycGrantedTokens: tokenDoc._id
          },
          $set: {
            updatedAt: new Date()
          },
          $inc: {
            __v: 1
          }
        })
      ])

      return makeInternalCryptoEncoder().encodeBuffer(tokenId);
    }
  );

  const job = await queue.addJob('beforeConfirm', {
    initialSupply,
    extraFields,
    id: this._id.toString()
  }, true);

  // @ts-ignore
  const tokenId = makeInternalCryptoEncoder().decodeBuffer(job.returnvalue);
  return tokenId;
}

TokenSchema.methods.cryptoMintToken = async function (
  amount: number,
  metadatas?: Buffer[]
): Promise<void> {
  if (!this.tokenId) {
    throw new CannotInteractWithTokenNotCreatedError(this.id);
  }

  const queue = CryptoQueue.createCryptoQueue(
    'crypto:mintToken',
    async (job: Job) => {
      let  {
        amount,
        id,
        metadatas
      }: {
        amount: number,
        metadatas?: string[],
        id: string
      } = job.data;

      const tokenDoc: IToken&Document = await Token.findById(id).populate('supplyKey treasury').exec();

      if (!tokenDoc)
        throw new TokenNotFoundError(id);

      if (!tokenDoc.tokenId) {
        throw new CannotInteractWithTokenNotCreatedError(tokenDoc.id);
      }

      if (!tokenDoc.supplyKey) {
        throw new MissingKeyError(tokenDoc.id, 'supplyKey');
      }


      const masterAccount = await getCryptoAccountByKeyName('cryptoMaster');
      const client = await masterAccount.createClient();

      let transaction = new TokenMintTransaction();

      transaction
        .setTokenId(TokenId.fromBytes(tokenDoc.tokenId))
        .setAmount(amount);

      if (metadatas) {
        for (let metadata  of metadatas)
          transaction.addMetadata(
            makeInternalCryptoEncoder().decodeBuffer(metadata)
          );
      }

      transaction
        .freezeWith(client);

      const signTx = await transaction.sign(await tokenDoc.supplyKey?.toCryptoValue() as PrivateKey);

      const txResponse = await signTx.execute(client);
      return txResponse.transactionId;
    },
    async (job: Job, getReceipt: TransactionReceipt) => {
      let  {
        amount,
        id
      }: {
        amount: number,
        metadatas?: string[],
        id: string
      } = job.data;

      const tokenDoc = await Token.findById(id).populate('treasury').exec();

      if (!tokenDoc)
        throw new TokenNotFoundError(id);

      console.debug(`⛏ minted ฿${amount}`);

      await Promise.all([
        (tokenDoc.treasury as ICryptoAccount&Document).loadBalance(),
        Token.collection.updateOne({
          _id: tokenDoc._id
        }, {
          $set: {
            updatedAt: new Date()
          },
          $inc: {
            __v: 1,
            minted: amount
          }
        }),
        CryptoAccount.collection.updateOne({
          _id: tokenDoc.treasury._id
        }, {
          $addToSet: {
            associatedTokens: tokenDoc._id,
            kycGrantedTokens: tokenDoc._id
          },
          $set: {
            updatedAt: new Date()
          },
          $inc: {
            __v: 1
          }
        })
      ]);
    }
  );

  await queue.addJob('beforeConfirm', {
    amount,
    metadatas: (
      metadatas ? metadatas.map((x) => makeInternalCryptoEncoder().encodeBuffer(x)) : void(0)
    ),
    id: this._id.toString()
  }, true);
}

export class CannotBurnTokenBecauseCannotTransferError extends HTTPError {
  constructor(){
    super(500, 'Could not access the crypto account provided, so could not transfer token amount back to treasury, so cannot burn')
  }
}


TokenSchema.methods.cryptoAssociate = async function (accountId: ObjectId|string): Promise<void> {
  let token: IToken&Document = this;

  if (!token.tokenId) throw new CannotInteractWithTokenNotCreatedError(token._id);
  if (token.tokenType !== TokenType.token) {
    throw new WrongTokenTypeError();
  }

  const account: ICryptoAccount&Document|null = await CryptoAccount.findById(accountId);

  if (!account)
    throw new NoCryptoAccountError(accountId.toString());

  if (account.associatedTokens?.map((x: any) => ( x._id ? x._id.toString() : x.toString() )).includes(this._id.toString())) {
    return;
  }

  const queue = CryptoQueue.createCryptoQueue(
    'crypto:associate',
    async (job: Job): Promise<TransactionId> => {
      const { accountId: accountIdStr, tokenId: tokenIdStr }: { accountId: string, tokenId: string } = job.data;
      const accountId = Buffer.from(accountIdStr, 'base64');
      const tokenId = Buffer.from(tokenIdStr, 'base64');

      const [feePayer, account]: [ICryptoAccount & Document,ICryptoAccount & Document] = await Promise.all([
        getCryptoAccountByKeyName('cryptoMaster'),
        CryptoAccount.findOne({ accountId }).populate('keyPair')
      ])


      const client = await feePayer.createClient();

      const transaction = await new TokenAssociateTransaction()
        .setAccountId(AccountId.fromBytes(accountId))
        .setTokenIds([TokenId.fromBytes(tokenId)])
        .freezeWith(client);

      const signedTx = await transaction.sign(await (account.keyPair as IKeyPair).toCryptoValue());

      const  res = await signedTx.execute(client);
      return res.transactionId;
    },
    async (job: Job, getReceipt: TransactionReceipt) => {
      const { accountId, tokenId }: { accountId: string, tokenId: string } = job.data;
      await CryptoAccount.collection.updateOne(
        { _id: new ObjectId(accountId) },
        {
          $addToSet: {
            associatedTokens: new ObjectId(tokenId)
          },
          $set: {
            updatedAt: new Date()
          },
          $inc: {
            __v: 1
          }
        }
      );
    }
  )

  const job = await queue.addJob('beforeConfirm', {
    accountId: Buffer.from(account.accountId).toString('base64'),
    tokenId: Buffer.from(token.tokenId).toString('base64')
  }, true);

  queue.once(CryptoQueue.errorEventName(job, 'catch'), async (job: Job, err: StatusError) => {
    if (err.status !== Status.TokenAlreadyAssociatedToAccount)
      throw err;
  });
}


TokenSchema.methods.cryptoGrantKyc = async function (accountId: ObjectId|string): Promise<void> {
  let token: IToken&Document = this;

  if (!token.tokenId) throw new CannotInteractWithTokenNotCreatedError(token._id);
  if (token.tokenType !== TokenType.token) {
    throw new WrongTokenTypeError();
  }

  const account: ICryptoAccount&Document|null = await CryptoAccount.findById(accountId);

  if (!account)
    throw new NoCryptoAccountError(accountId.toString());

  if (account.kycGrantedTokens?.map((x: any) => ( x._id ? x._id.toString() : x.toString() )).includes(this._id.toString())) {
    return;
  }

  const queue = CryptoQueue.createCryptoQueue(
    'crypto:grantTokenKyc',
    async (job: Job): Promise<TransactionId> => {
      const { accountId: accountIdStr, tokenId: tokenIdStr }: { accountId: string, tokenId: string } = job.data;
      const accountId = Buffer.from(accountIdStr, 'base64');
      const tokenId = Buffer.from(tokenIdStr, 'base64');

      const [feePayer, token]: [ICryptoAccount & Document,IToken & Document] = await Promise.all([
        getCryptoAccountByKeyName('cryptoMaster'),
        Token.findOne({ tokenId }).populate('kycKey')
      ])


      const client = await feePayer.createClient();

      const transaction = await new TokenGrantKycTransaction()
        .setAccountId(AccountId.fromBytes(accountId))
        .setTokenId(TokenId.fromBytes(tokenId))
        .freezeWith(client);

      const signedTx = await transaction.sign(
        await (token.kycKey as IKeyPair).toCryptoValue()
      );

      const  res = await signedTx.execute(client);
      return res.transactionId;
    },
    async (job: Job, getReceipt: TransactionReceipt) => {
      const { accountId, tokenId }: { accountId: string, tokenId: string } = job.data;
      await CryptoAccount.collection.updateOne(
        { _id: new ObjectId(accountId) },
        {
          $addToSet: {
            kycGrantedTokens: new ObjectId(tokenId)
          },
          $set: {
            updatedAt: new Date()
          },
          $inc: {
            __v: 1
          }
        }
      );
    }
  )

  await queue.addJob('beforeConfirm', {
    accountId: Buffer.from(account.accountId).toString('base64'),
    tokenId: Buffer.from(token.tokenId).toString('base64')
  }, true);
}

/**
 *
 * @param rawLines
 * @param feePayer
 */
TokenSchema.methods.cryptoTransferFungible = async function (
  executingAccountId: ObjectId|string,
  lines: Map<{ to: Buffer, from?: Buffer }, number>
): Promise<void> {
  // @ts-ignore
  let token: IToken&Document = this;

  if (!token.tokenId) throw new CannotInteractWithTokenNotCreatedError(token._id);
  if (token.tokenType !== TokenType.token) {
    throw new WrongTokenTypeError();
  }

  const queue = CryptoQueue.createCryptoQueue(
    'crypto:transferFungible',
    async (job: Job) => {
      // try {
        let {
          executingAccountId,
          rawLines,
          tokenId
        }: {
          executingAccountId: string,
          rawLines: [{ to: Buffer, from?: Buffer }, number][],
          tokenId: string
        } = job.data;

        const [executingAccount, token]: [ICryptoAccount & Document, IToken & Document] = await Promise.all([
          CryptoAccount.findById(executingAccountId).exec() as any as Promise<ICryptoAccount & Document>,
          Token.findById(tokenId).exec() as any as Promise<IToken & Document>
        ]);

        if (!token) {
          throw new TokenNotFoundError(tokenId);
        }


        let treasury: ICryptoAccount & Document | undefined;
        const getTreasury = (async () => {
          if (treasury) return treasury;
          // @ts-ignore
          await token.populate('treasury').execPopulate();
          treasury = token.treasury as ICryptoAccount & Document;

          return treasury;
        });

        const feePayer: ICryptoAccount & Document = await getCryptoAccountByKeyName('cryptoMaster');

        const lines = new Map<{ to: ICryptoAccount & Document, from: ICryptoAccount & Document }, number>(await Promise.all<[{ to: ICryptoAccount & Document, from: ICryptoAccount & Document }, number]>(
          Array.from(rawLines).map(async ([accountId, amount]) => {
            const [to, from] = await Promise.all([
              ensureAccount(accountId.to, feePayer.networkName),
              accountId.from ? ensureAccount(accountId.from, feePayer.networkName) : getTreasury()
            ])
            return [
              {to, from},
              amount
            ]
          })
        ));

        const allAccounts: (ICryptoAccount&Document)[] = (_.uniqBy(_.flatten(Array.from(lines.keys()).map((x) => [ x.from, x.to ])), 'id') as (ICryptoAccount&Document)[])
          .filter((f) => {
            return (
              !f.associatedTokens?.map((x: any) => ( x._id ? x._id.toString() : x.toString() )).includes(this._id.toString()) ||
              !f.kycGrantedTokens?.map((x: any) => ( x._id ? x._id.toString() : x.toString() )).includes(this._id.toString())
            )
          })

        await Promise.all<void>(allAccounts.map(async (account): Promise<void> => {
          await token.cryptoAssociate(account._id);
          await token.cryptoGrantKyc(account._id);
        }))

        // Now we can transfer the tokens
        let transaction = new TransferTransaction();
        let fromAccounts: Set<{ account: ICryptoAccount & Document, client?: NodeClient }> = new Set<{ account: ICryptoAccount & Document, client?: NodeClient }>(
          await Promise.all<{ account: ICryptoAccount & Document, client?: NodeClient }>(
            Array.from((
              new Map<string, ICryptoAccount & Document>(
                Array.from(lines.keys()).map((k) => [k.from._id.toString(), k.from])
              )
            ).values()).map(async (from) => ({account: from /**, client: await from.createClient()**/}))
          )
        );

        const refreshAccounts = new Set<string>();
        const receipt = new Set<{ to: string, from: string, amount: number }>();
        for (let [{to, from}, amount] of Array.from(lines.entries())) {
          refreshAccounts.add(to._id.toString());
          refreshAccounts.add(from._id.toString());

          const adjAmount = amount;

          transaction
            .addTokenTransfer(
              TokenId.fromBytes(token.tokenId as Buffer),
              AccountId.fromBytes(from.accountId),
              ((adjAmount) * -1)
            )
            .addTokenTransfer(
              TokenId.fromBytes(token.tokenId as Buffer),
              AccountId.fromBytes(to.accountId),
              (adjAmount * 1)
            );
          receipt.add({
            from: AccountId.fromBytes(from.accountId).toString(),
            to: AccountId.fromBytes(to.accountId).toString(),
            amount
          })
        }

        job.data.receipt = Array.from(receipt.values());

        if (!feePayer.keyPair)
          throw new CannotCreateCryptoAccountForExternalAccountError();

        const [feeClient, executingClient]: [NodeClient, NodeClient] = await Promise.all([
          feePayer.createClient(),
          executingAccount.createClient()
        ]);

        const transBytes = (await transaction.freezeWith(feeClient)
          .sign(await feePayer.keyPair.toCryptoValue())).toBytes();

        let finalTrans: Transaction = Transaction.fromBytes(transBytes)


        for (let {account, client} of Array.from(fromAccounts.values())) {
          if (!account.keyPair)
            throw new CannotCreateCryptoAccountForExternalAccountError();

          finalTrans = await finalTrans
            .sign(await account.keyPair.toCryptoValue())
        }

        job.data.refreshAccounts = Array.from(refreshAccounts.values());

        const resp = await finalTrans.execute(executingClient);
        return resp.transactionId;
      // } catch (err) {
      //   debugger
      //   throw err;
      // }
    },
    async (job: Job, getReceipt: TransactionReceipt) => {
      let  {
        executingAccountId,
        rawLines,
        tokenId,
        refreshAccounts,
        receipt,
        symbol
      }: {
        executingAccountId: string,
        rawLines: [{ to: Buffer, from?: Buffer }, number][],
        tokenId: string,
        refreshAccounts: string[],
        receipt: any,
        symbol: string
      } = job.data;

      for (let { to, from, amount } of receipt) {
        console.debug(`transferred ${amount} ${symbol}: ${from} → ${to} `)
      }

      await Promise.all(
        refreshAccounts.map(async (id) => {
          const account = await CryptoAccount.findById(id) as ICryptoAccount&Document;
          await Promise.all([
            account.loadBalance(),
            account.syncTransactions()
          ]);
        })
      );
      return Buffer.from(getReceipt.toBytes())
    }
  );

  const job = await queue.addJob('beforeConfirm', {
    executingAccountId,
    rawLines: Array.from(lines.entries()),
    tokenId: this._id.toString(),
    symbol: this.symbol
  }, true);

  // const returnKey = await queue.getReturnValue(job.data.returnValueKey);
}

TokenSchema.methods.cryptoBurnToken = async function (
  amount: number,
  serials?: number[]
): Promise<void> {
  if (!this.tokenId) {
    throw new CannotInteractWithTokenNotCreatedError(this.id);
  }

  const queue = CryptoQueue.createCryptoQueue(
    'crypto:burnToken',
    async (job: Job) => {
      let  {
        amount,
        id,
        serials
      }: {
        amount: number,
        serials?: number[],
        id: string
      } = job.data;

      const tokenDoc: IToken&Document = await Token.findById(id).populate('supplyKey treasury').exec();

      if (!tokenDoc)
        throw new TokenNotFoundError(id);

      if (!tokenDoc.tokenId) {
        throw new CannotInteractWithTokenNotCreatedError(tokenDoc.id);
      }

      if (!tokenDoc.supplyKey) {
        throw new MissingKeyError(tokenDoc.id, 'supplyKey');
      }

      const masterAccount = await getCryptoAccountByKeyName('cryptoMaster');
      const client = await masterAccount.createClient();

      let transaction = new TokenBurnTransaction();

      transaction
        .setTokenId(TokenId.fromBytes(tokenDoc.tokenId))
        .setAmount(amount);

      if (serials) {
        transaction.setSerials(serials);
      }

      transaction
        .freezeWith(client);

      const signTx = await transaction.sign(await tokenDoc.supplyKey?.toCryptoValue() as PrivateKey);

      const txResponse = await signTx.execute(client);
      return txResponse.transactionId;
    },
    async (job: Job, getReceipt: TransactionReceipt) => {
      let  {
        amount,
        id
      }: {
        amount: number,
        id: string
      } = job.data;

      const tokenDoc = await Token.findById(id).populate('treasury').exec();

      if (!tokenDoc)
        throw new TokenNotFoundError(id);


      console.debug(`🔥 burned ${amount} ${tokenDoc.symbol}`);

      await Promise.all([
        (tokenDoc.treasury as ICryptoAccount&Document).loadBalance(),
        Token.collection.updateOne({
          _id: tokenDoc._id
        }, {
          $set: {
            updatedAt: new Date()
          },
          $inc: {
            __v: 1,
            minted: amount*-1
          }
        })
      ]);
    }
  );


  await queue.addJob('beforeConfirm', {
    amount,
    serials: serials,
    id: this._id.toString()
  }, true);
}

async function burnFromCharge(charge: Stripe.PaymentIntent, amount?: number): Promise<void> {

  const symbol: string | undefined = charge.metadata['crypto:symbol'];
  if (symbol && charge.status === 'succeeded') {
    const [token, customer]: [IToken & Document | null, any] = await Promise.all([
      Token.findOne({
        symbol
      }),
      (
        async () => {
          if (charge.customer) {
            return stripe.customers.retrieve(charge.customer as string);
          }
          return null;
        }
      )()
    ])

    if (!token)
      throw new SymbolNotFoundError(symbol);

    let user: (IUser&Document)|null = null;
    let marketplaceUserId: string|ObjectId = customer?.metadata['marketplace:user'];
    if (!marketplaceUserId && customer && customer.email) {
      user = await User.findOne({
        email: customer.email
      }).exec();
    } else if (marketplaceUserId && customer) {
      user = await User.findById(marketplaceUserId)
    }

    if (user) {
      // Find the checking account
      let cryptoAccount: (ICryptoAccount & Document) | null = await CryptoAccount.findOne({
        user: user._id,
        name: 'checking'
      });

      if (!cryptoAccount) {
        throw new CannotBurnTokenBecauseCannotTransferError();
      }

      const adjAmount = (
        (typeof(amount) === 'undefined' ? charge.amount : amount) /
        1 //Math.pow(10, 2 || 0)
      );

      if (!token.treasury?.accountId)
        token.treasury = await CryptoAccount.findOne({ _id: token.treasury }).populate('keyPair') as ICryptoAccount&Document;

      await token.cryptoTransferFungible(
        cryptoAccount._id.toString(),
        new Map<{ to: Buffer, from: Buffer }, number>(
          [
            [ { from: cryptoAccount.accountId, to: token.treasury.accountId }, adjAmount ]
          ]
        )
      );
    }

    if (token.name === 'marketplaceToken') {
      await token.cryptoBurnToken(
        typeof(amount) === 'undefined' ? charge.amount : amount
      );
    }
  }
}

async function onChargeRefunded(job: Job): Promise<void> {
  const {id} = job.data;

  const event = await stripe.events.retrieve(id);
  const refund: any = event.data.object;

  const charge = await stripe.paymentIntents.retrieve(refund.payment_intent);
  await burnFromCharge(charge, refund.amount);
}

async function onChargeSuccess(job: Job): Promise<void> {
  const {id} = job.data;

  const event = await stripe.events.retrieve(id);
  const charge: any = event.data.object;
  const symbol: string | undefined = charge.metadata['crypto:symbol'];
  if (symbol && charge.status === 'succeeded') {
    const [token, customer]: [IToken & Document | null, any] = await Promise.all([
      Token.findOne({
        symbol,
        tokenId: {
          $exists: true
        }
      }).populate('treasury'),
      (
        async () => {
          if (charge.customer) {
            return stripe.customers.retrieve(charge.customer);
          }
          return null;
        }
      )()
    ])

    if (!token)
      throw new SymbolNotFoundError(symbol);

    if (token.name === 'marketplaceToken') {
      await token.cryptoMintToken(
        charge.amount
      );
      let user: (IUser&Document)|null = null;
      let marketplaceUserId: string|ObjectId = customer?.metadata['marketplace:user'];
      if (!marketplaceUserId && customer && customer?.email) {
        user = await User.findOne({
          email: customer.email
        }).exec();
      } else if (marketplaceUserId && customer) {
        user = await User.findById(marketplaceUserId)
      }

      if (user) {
        // Find the checking account
        // Find the checking account
        let cryptoAccount: (ICryptoAccount & Document) | null = await CryptoAccount.findOne({
          user: user._id,
          name: 'checking'
        });

        // If the user wasn't found, we should refund the transaction (which will burn the token)
        if (!user) {
          await stripe.refunds.create({
            amount: charge.amount,
            payment_intent: charge.id
          });

          return;
        }
        // If no account was  found, create the account
        if (!cryptoAccount) {
          cryptoAccount = await createCryptoAccount(
            1000,
            {
              name: 'checking',
              userId: user._id
            }
          );
        }

        if (!token.treasury?.accountId)
          token.treasury = await CryptoAccount.findOne({ _id: token.treasury }).populate('keyPair') as ICryptoAccount&Document;

        await token.cryptoTransferFungible(
          token.treasury._id.toString(),
          new Map<{ to: Buffer, from: Buffer }, number>(
            [
              [ { to: cryptoAccount.accountId, from: token.treasury.accountId },
                (
                  charge.amount /
                  1 // Math.pow(10, 2 || 0)
                )
              ]
            ]
          )
        );
      }
    }
  }
}


export async function initMarketplace(): Promise<{ token: IToken, treasury: ICryptoAccount }> {
  if ((global as any).marketInitDone)
    return (global as any).marketInitDone;
  try {
    let treasuryAccount: ICryptoAccount & Document | null = await CryptoAccount.findOne({
      name: 'marketplaceTreasury'
    });

    if (!treasuryAccount) {
      treasuryAccount = await createCryptoAccount(1000, {
        name: 'marketplaceTreasury'
      }) as ICryptoAccount & Document;
    }

    let marketplaceToken: IToken & Document | null = await Token.findOne({
      name: 'marketplaceToken'
    });
    if (!marketplaceToken) {
      let tdoc: any = {
        ...JSON.parse(process.env.MARKETPLACE_TOKEN as string),
        treasury: treasuryAccount
      };

      for (let k in tdoc) {
        if (typeof(tdoc[k]) === 'object' && tdoc[k]?.generateCryptoKeyPair) {
          let kDoc = await generateCryptoKeyPair();
          await kDoc.save();
          tdoc[k] = kDoc;
        }
      }

      marketplaceToken = new Token(tdoc) as IToken & Document;

      await marketplaceToken.save();
    }
    await marketplaceToken.cryptoCreateToken(0);
    createTokenWorker();

    (global as any).marketInitDone = {
      token: marketplaceToken,
      treasury: treasuryAccount
    };
    return (global as any).marketInitDone;
  }
  catch (err) {
    throw err;
    console.error(`error starting marketplace ${(err as any).stack}`);

    process.exit(1);
  }
}

export function createTokenWorker() {
  (global as any).stripeTokenWorker = (global as any).stripeTokenWorker || new Worker(`stripe:payment_intent.succeeded`, onChargeSuccess,  {
    // @ts-ignore
    connection: CryptoQueue.createConnection('crypto:token:general'),
    concurrency: 1
  });
  (global as any).stripeTokenRefundWorker = (global as any).stripeTokenRefundWorker || new Worker(`stripe:charge.refunded`, onChargeRefunded,  {
    // @ts-ignore
    connection: CryptoQueue.createConnection('crypto:token:general'),
    concurrency: 1
  });

  return (global as any).stripeTokenWorker;
}


wrapVirtual(TokenSchema, 'tokenId');

export const Token = mongoose.models.Token || mongoose.model<IToken>('Token', TokenSchema);
