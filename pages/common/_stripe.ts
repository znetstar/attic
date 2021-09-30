import { Stripe } from 'stripe';
import {Job, Queue, Worker, QueueScheduler, WorkerOptions, JobsOptions, QueueOptions, QueueSchedulerOptions} from "bullmq"
import {bullRedis} from "./_bull";
import {Status, TransactionId, TransactionReceipt, TransactionReceiptQuery} from "@hashgraph/sdk";
import {HTTPError} from "./_rpcCommon";
import { getCryptoAccountByKeyName } from "./_account";
import * as fs  from 'fs-extra';
import * as path  from 'path';

export const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY as string) as Stripe;
export default stripe;

export const stripeEvents: string[] = [
  'payment_intent.succeeded'
]

export async function getWebhookSecret(): Promise<string> {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    const webhookEndpoint = await stripe.webhookEndpoints.create({
      url: (process.env.SITE_URI as string) + '/api/stripe-webhook',
      enabled_events: stripeEvents as any
    });

    process.env.STRIPE_WEBHOOK_SECRET = webhookEndpoint.secret;

    await fs.appendFile(path.join(process.cwd(), '.env'), `STRIPE_WEBHOOK_SECRET=${webhookEndpoint.secret}`);
    return webhookEndpoint.secret as string;
  }
  return process.env.STRIPE_WEBHOOK_SECRET;
}



