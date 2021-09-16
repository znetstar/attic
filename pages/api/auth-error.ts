// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import * as qs from 'querystring';

/**
 * Forwards the request to the RPC Server
 * @param req
 * @param res
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  res.setHeader('Location', `/login?error=${req.query.error}`);
  res.statusCode = 302;
  res.end();
}

export const config = {
  api: {
    bodyParser: false
  }
}
