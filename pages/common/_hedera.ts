import {makeKeyEncoder} from "./_encoder";
import {Transaction} from "@hashgraph/sdk";
import {CannotCreateCryptoAccountForExternalAccountError, ICryptoAccount} from "./_account";
import NodeClient from "@hashgraph/sdk/lib/client/NodeClient";

export function wrapVirtual(schema: any, key: string, name?: string) {
  return schema.virtual(name ? name : `${key}Str`)
    .get(function () {
      // @ts-ignore
      return (this as any)[key] ? makeKeyEncoder().encodeBuffer((this as any)[key]) : (this as any)[key];
    })
    .set(function (val: string|Buffer) {
      schema[key] = makeKeyEncoder().decodeBuffer(val);
    });
}

export async function payOnBehalfOfAccount(
  transaction: Transaction,
  account: ICryptoAccount&Document,
  payer: ICryptoAccount&Document
): Promise<{ accountClient: NodeClient, accountTransaction: Transaction }> {
  const [ accountClient, payerClient ]: [ NodeClient, NodeClient ] = await Promise.all([
    account.createClient(),
    payer.createClient()
  ]);
  if (!payer.keyPair || !account.keyPair) {
    throw new CannotCreateCryptoAccountForExternalAccountError();
  }

  const payerTransBytes = (await transaction.freezeWith(payerClient)
    .sign(await payer.keyPair.toCryptoValue())).toBytes();

  const accountTrans = Transaction.fromBytes(payerTransBytes);
  await accountTrans.sign(await account.keyPair.toCryptoValue());

  return {
    accountTransaction: accountTrans,
    accountClient: accountClient
  }
}
