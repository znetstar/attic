// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { apply_patch } from 'jsonpatch';
import * as _ from 'lodash';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  switch (req.method) {
    case 'PATCH':
      const doc = await model.findById(id).exec();
      const delta = apply_patch((doc as any).toObject({ virtuals: true }), patches);
      _.extend(doc, delta);
      break;
    default:
      res.statusCode = 405;
      res.setHeader('Allowed', 'GET DELETE PUT');
      break;
  }
}

