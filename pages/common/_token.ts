import {ObjectId} from "mongodb";
import mongoose from "./_database";
import {INFTData, NFTDataSchema} from "./_nft";
import {Document, Schema} from "mongoose";
import {generateCryptoKeyPair, IKeyPair, KeyNotFoundError, KeyPair, KeyPairSchema} from "./_keyPair";
import {
  AccountCouldNotBeCreated,
  createCryptoAccount,
  CryptoAccount,
  getCryptoAccountByKeyName,
  ICryptoAccount
} from "./_account";
import {wrapVirtual} from "./_hedera";
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
  TokenMintTransaction,
  TransactionReceipt,
  TokenDeleteTransaction
} from '@hashgraph/sdk';
import CryptoQueue, {CryptoError} from "./_cryptoQueue";
import {HTTPError} from "./_rpcCommon";
import {bullRedis} from "./_bull";
import stripe from "./_stripe";
import {Stripe} from "stripe";
import {makeInternalCryptoEncoder} from "./_encoder";

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
  cryptoBurnToken(amount: number): Promise<void>
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
}, { timestamps:true }));

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

      await Token.collection.updateOne({
        _id: tokenDoc._id
      }, {
        $set: {
          tokenId,
          updatedAt: new Date()
        },
        $inc: {
          __v: 1
        }
      })

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

      const tokenDoc = await Token.findById(id);

      if (!tokenDoc)
        throw new TokenNotFoundError(id);

      await Token.collection.updateOne({
        _id: tokenDoc._id
      }, {
        $set: {
          updatedAt: new Date()
        },
        $inc: {
          __v: 1,
          minted: amount
        }
      });
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

      const tokenDoc = await Token.findById(id);

      if (!tokenDoc)
        throw new TokenNotFoundError(id);

      await Token.collection.updateOne({
        _id: tokenDoc._id
      }, {
        $set: {
          updatedAt: new Date()
        },
        $inc: {
          __v: 1,
          minted: amount*-1
        }
      });
    }
  );


  await queue.addJob('beforeConfirm', {
    amount,
    serials: serials,
    id: this._id.toString()
  }, true);
}

async function onChargeSuccess(job: Job): Promise<void> {
    const { id } = job.data;

    const event = await stripe.events.retrieve(id);
    const charge: any = event.data.object;
    const symbol: string|undefined = charge.metadata['crypto:symbol'];
    if (symbol && charge.status === 'succeeded') {
      const [token, customer]: [IToken&Document|null,any] = await Promise.all([
        Token.findOne({
          symbol
        }),
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

        if (customer) {
          // Send crypto to wallet
        }
      }
    }
}


export async function initMarketplace() {
  if ((global as any).marketInitDone)
    return;
  (global as any).marketInitDone = true;
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
    connection: CryptoQueue.createConnection('crypto:token:general')
  });

  return (global as any).stripeTokenWorker;
}

wrapVirtual(TokenSchema, 'tokenId');

export const Token = mongoose.models.Token || mongoose.model<IToken>('Token', TokenSchema);
