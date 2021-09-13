// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import {rpcTransport} from "../common/_rpcServer";

/**
 * Forwards the request to the RPC Server
 * @param req
 * @param res
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  try {
    await rpcTransport.onRequest(req, res as any);
  } catch (err) {

  }
}

export const config = {
  api: {
    bodyParser: false
  }
}
