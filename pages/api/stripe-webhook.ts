// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import {getWebhookSecret, stripe} from '../common/_stripe';
import {Queue} from "bullmq";
import {bullRedis} from "../common/_bull";
import {createTokenWorker, initMarketplace} from "../common/_token";
import CryptoQueue from "../common/_cryptoQueue";

/**
 * Forwards the request to the RPC Server
 * @param req
 * @param res
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
      await initMarketplace();

    const body = await new Promise<Buffer>((resolve, reject) => {
      let buf: Buffer[] = [];
      req.on('data', (bits: Buffer) => buf.push(bits));
      req.once('error', (err) => reject(err));
      req.once('end', () => resolve(Buffer.concat(buf)))
    });

    event = stripe.webhooks.constructEvent(body, sig as string, await getWebhookSecret());


    const queue = new Queue(`stripe:${event.type}`, {
      defaultJobOptions:  {
        removeOnComplete: true,
        removeOnFail: true
      },
      // @ts-ignore
      connection: CryptoQueue.createConnection('stripe:general').redis
    });

    await queue.add('event', { id: event.id.toString() }, { jobId: `stripe:event:${event.id.toString()}` });

    await queue.close()

    res.statusCode = 200;
    res.end(JSON.stringify({ received: true }));
  }
  catch (err) {
    res.statusCode = 400;
    res.end(`Webhook Error: ${err.message}`);
  }
}



export const config = {
  api: {
    bodyParser: false
  }
}
