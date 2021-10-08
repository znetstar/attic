import {ObjectId,Decimal128} from "mongodb";
import {Schema, Document} from "mongoose";
import mongoose from "./_database";
import {IToken, Token} from "./_token";
import {
  CryptoAccount,
  CryptoAccountSchema,
  ensureAccount,
  ICryptoAccount,
  IPOJOCryptoAccount,
  toCryptoAccountPojo
} from "./_account";
import {
  AccountId,
  TokenId,
  TransactionRecord
} from "@hashgraph/sdk";
import {NetworkName} from "@hashgraph/sdk/lib/client/Client";
import TokenTransferAccountMap from "@hashgraph/sdk/lib/account/TokenTransferAccountMap";
import {NftTransfer} from "@hashgraph/sdk/lib/account/TokenNftTransferMap";
import {dinero, add, subtract, toFormat, Dinero} from 'dinero.js';
import { USD } from '@dinero.js/currencies';
import {makeEncoder} from "./_encoder";
import {ImageFormatMimeTypes} from "@etomon/encode-tools/lib/EncodeTools";
import {ImageFormat} from "@etomon/encode-tools/lib/IEncodeTools";
import {IPOJOUser, IUser, userAcl, userPrivFields, userPubFields, UserRoles} from "./_user";
import {getUser, MarketplaceSession} from "../api/auth/[...nextauth]";
import {Ability, AbilityBuilder} from "@casl/ability";
import {MarketplaceClientRequest, RequestData} from "./_rpcServer";
import {HTTPError} from "./_rpcCommon";
import {JSONPatch} from "@thirdact/simple-mongoose-interface";


export interface ITransaction {
  /**
   * Amount of the `token` to transfer from `source` to `destination`
   * as a positive or negative `Decimal128`.
   *
   * For an NFT, must be a integer.
   */
  amount: Decimal128;
  account: ICryptoAccount;
  /**
   * Token to transfer
   */
  token: IToken;
  /**
   * When the transaction has been confirmed on the crypto network
   */
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  _id: ObjectId;

  loadBalances(): Promise<void>;
}

export type IWalletCryptoAccount = ICryptoAccount&{ needsUpdate: boolean };

export interface IWallet {
  /**
   * The dollar sum of the netted aggregation of all transactions involving fungible tokens,
   * excluding transactions which have not settled.
   */
  balance: Decimal128;
  /**
   * All crypto accounts linked to the wallet
   */
  accounts: IWalletCryptoAccount[];
  createdAt: Date;
  updatedAt: Date;

  _id: ObjectId;


  needsUpdate: boolean;

}



export type IPOJOWallet = IWallet&{
  balance: string;
  accounts: IPOJOCryptoAccount[];
  _id: string;
}


export const walletPrivFields = [
  'balance',
  'accounts',
  '_id'
];

export function toWalletPojo(wallet: IWallet): IPOJOWallet {
  return {
    ...wallet,
    balance: wallet.balance.toString(),
    _id: wallet.toString(),
    accounts: wallet.accounts.map((a) => toCryptoAccountPojo(a))
  } as IPOJOWallet;
}

export const TransactionSchema: Schema<ITransaction> = (new (mongoose.Schema)({
  account: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'CryptoAccount' },
  token: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Token' },
  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    validate: (x: any): any => {
      let n = Number(x.toString());
      return !Number.isNaN(n) && n > 0;
    }
  },
  confirmedAt: {
    type: Date,
    required: false,
    validate: (x: any): any => {
      let n = new Date(x);
      return n && (n.getTime()) <= (new Date()).getTime();
    }
  },
  settledAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
}));


export async function loadWallet(userId: ObjectId): Promise<IWallet|null> {
  const wallet = (await CryptoAccount.aggregate<IWallet>([
    {
      $match: {
        user: userId
      }
    },
    {
      $addFields: {
        needsUpdate: {
          $gt: [
            {
              $subtract: [
                (new Date()).getTime(),
                {
                  $toLong: '$updatedAt'
                }
              ]
            },
            Number(process.env.MAX_CRYPTO_WALLET_CACHE)  || 86400e3
          ]
        }
      }
    },
    {
      $group: {
        _id: '$user',
        balance: {
          $sum: '$balance'
        },
        updatedAt: { $max: '$updatedAt' },
        createdAt: { $min: '$createdAt' },
        needsUpdate: {
          $max: '$needsUpdate'
        },
        accounts: {
          $push: '$$ROOT'
        }
      }
    }
  ]))[0] || null as IWallet|null;

  if (wallet && wallet.needsUpdate) {
    wallet.accounts = [
      ...(await Promise.all<IWalletCryptoAccount>(
        wallet.accounts.filter((a: IWalletCryptoAccount) => a.needsUpdate)
          .map(async (rawAccount: IWalletCryptoAccount): Promise<IWalletCryptoAccount> => {
              const account = await ensureAccount(rawAccount.accountId, rawAccount.networkName);
              await account.loadBalance();
              await account.save();
              return {
                ...(account.toObject({ virtuals: false }) as ICryptoAccount) as ICryptoAccount,
                needsUpdate: false
              } as IWalletCryptoAccount;
            })
      )),
      ...wallet.accounts.filter((a: IWalletCryptoAccount) => !a.needsUpdate)
    ];
  }

  return wallet as IWallet|null;
}

export async function loadTransactionsByToken(tokenId: ObjectId): Promise<(ITransaction&Document)[]> {
  const transactions = await Transaction.aggregate<ITransaction&Document>([
    {
      $match: {
        token: new ObjectId(tokenId),
        confirmedAt: {
          $exists: true
        }
      }
    },
    {
      $sort: {
        confirmedAt: -1
      }
    },
    {
      $lookup: {
        let: {
          account: '$account'
        },
        from: 'transactions',
        as: 'account',
        pipeline: [
          { $match: { $expr: { $eq: [ '$$account', '$_id' ] } } }
        ]
      }
    },
    {
      $addFields:  {
        account:  { $arrayElemAt:  [ '$account', 0 ] }
      }
    }
  ]).exec();

  return transactions;
}

TransactionSchema.index({ token: 1, confirmedAt: -1  });
TransactionSchema.index({  confirmedAt: -1  });

/**
 * Transfers transaction data from the Hedera API to the database
 * @param transaction
 */
export async function cryptoTransactionToMarketplaceTransactions(transaction: TransactionRecord, networkName: NetworkName): Promise<(ITransaction&Document)[]> {
  let results: (ITransaction&Document)[] = [];
  // First let's deal with Fungible tokens
  type TokenTransfer = { accountId: Buffer, amount: any }|{ accountId: Buffer, serial: Buffer, amount: -1|1 };
  let tokenTransfers = new Map<string, TokenTransfer[]>();
  for (const [tokenId, line] of Array.from(transaction.tokenTransfers.keys()).map((k) => [ k, transaction.tokenTransfers.get(k) as TokenTransferAccountMap ]) as [ TokenId, TokenTransferAccountMap ][]) {
    let tokens: TokenTransfer[] = [];
    for (const [ accountId, amount ] of Array.from((line as TokenTransferAccountMap).keys()).map((k) => [ k, ((line as TokenTransferAccountMap).get(k) as any) ]) as [ AccountId, any ][]) {
      tokens.push({
        accountId: Buffer.from(accountId.toBytes()),
        amount
      });
    }
    tokenTransfers.set(Buffer.from(tokenId.toBytes()).toString('base64'), tokens);
  }

  // NFTs
  for (const [tokenId, line] of Array.from(transaction.nftTransfers.keys()).map((k) => [ k, transaction.nftTransfers.get(k) ]) as [ TokenId, NftTransfer[]][]) {
    let tokens: TokenTransfer[] = [];
    for (const nftTransfer of line) {
      tokens.push({
        accountId: Buffer.from(nftTransfer.sender.toBytes()),
        amount: -1,
        serial: Buffer.from(nftTransfer.serial.toBytes())
      });
      tokens.push({
        accountId: Buffer.from(nftTransfer.recipient.toBytes()),
        amount: 1,
        serial: Buffer.from(nftTransfer.serial.toBytes())
      });
    }
    tokenTransfers.set(Buffer.from(tokenId.toBytes()).toString('base64'), tokens);
  }

  // Filter out non-Marketplace tokens
  const finalTokenTransfers = new Map<IToken&Document, (TokenTransfer)[]>(
    (await Promise.all(Array.from(tokenTransfers.entries())
      .map(async ([ tokenIdStr,transfer ]): Promise<[IToken&Document|null, (TokenTransfer)[]]> => {
        const tokenId = Buffer.from(tokenIdStr, 'base64');
        const token = (await Token.findOne({ tokenId })) as IToken&Document|null;
        return [ token, transfer ];
      })))
      .filter(([k,v]) => k !== null) as [IToken&Document, (TokenTransfer)[]][]
  );

  const accountCache: Map<string, ICryptoAccount&Document> = new Map<string, ICryptoAccount & Document>();

  // Finally create the transactions
  for (const [ token, tokenTransfers] of Array.from(finalTokenTransfers.entries())) {
    for (const tokenTransfer of tokenTransfers) {
      let account = accountCache.get(tokenTransfer.accountId.toString('base64'));
      if (!account) {
        account = await ensureAccount(tokenTransfer.accountId, networkName);
        accountCache.set(tokenTransfer.accountId.toString('base64'), account);
      }

      const amountNum = dinero({ amount: (tokenTransfer.amount as any).toNumber(), currency: USD });

      const amount: Decimal128 = new Decimal128((tokenTransfer as { serial?: Buffer }).serial ? tokenTransfer.amount.toString() : (
        toFormat(amountNum, ({ amount }) => amount.toString())
      ));

      const transfer = new Transaction({
        account,
        amount,
        confirmedAt: transaction.consensusTimestamp ? (transaction.consensusTimestamp.toDate()) : void(0),
        token
      });

      results.push(transfer);
    }
  }

  return results;
}


export function walletAcl(wallet?: IWallet, session?: MarketplaceSession|null): Ability {
  const { can, cannot, rules } = new AbilityBuilder(Ability);

  if (wallet) {
    if (
      (session?.user?.marketplaceUser?._id.toString() === wallet?._id.toString()) ||
      ((session?.user?.marketplaceUser?.roles || []).includes(UserRoles.walletAdmin))
    ) {
      can('marketplace:getWallet', 'Wallet', walletPrivFields, {
        _id: new ObjectId(wallet?._id)
      });
    }
  }

  return new Ability(rules);
}



export async function cryptoLoadBalances(): Promise<void> {
  // @ts-ignore
  let self: IWallet&Document = this;

  await self.populate('accounts').execPopulate();

  const amounts = await Promise.all<Dinero<number>>(
    (self.accounts || []).map(async (account: ICryptoAccount): Promise<Dinero<number>> => {
      await account.loadBalance();
      return dinero({ amount: Number((account.balance || 0).toString()), currency: USD });
    })
  )

  const balance = (amounts.length ? amounts.reduce(add) : 0).toString();
  self.balance = new Decimal128(balance);
}

export async function marketplaceGetWallet(inputSession: MarketplaceSession, userId?: ObjectId|string): Promise<({ wallet: IWallet|null, user: IUser })> {
  // Get the user from the session object
  const [ session, wallet ]: [ MarketplaceSession|null, IWallet|null ] = await (inputSession.user?.marketplaceUser?._id ? await Promise.all([
    (getUser(inputSession) as Promise<MarketplaceSession>),
    loadWallet(new ObjectId(userId || inputSession?.user?.marketplaceUser?._id))
  ]) : Promise.resolve<[null,null]>([null,null]));
  if (!session || !session.user?.marketplaceUser) throw new HTTPError(401);
  const user = session.user?.marketplaceUser as IUser;
  if (!wallet) {
    return {
      wallet: null,
      user
    };
  }
  const acl = walletAcl(wallet, session);

  for (let key in (wallet as any)) {
    if (!acl.can('marketplace:getWallet', 'Wallet', key as string)) {
      throw new HTTPError(403);
    }
  }

  return { wallet, user };
}


export const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
