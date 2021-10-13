// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import {rpcInit, rpcTransport} from "../common/_rpcServer";


/**
 * Forwards the request to the RPC Server
 * @param req
 * @param res
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  rpcInit();
  try {
    await rpcTransport.onRequest(req, res as any);
  } catch (err) {
    console.error(err.stack);
  }
}

export const config = {
  api: {
    bodyParser: false
  }
}
