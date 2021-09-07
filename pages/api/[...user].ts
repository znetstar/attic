// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  SimpleModelInterface,
  ModelInterface,
  RESTInterfaceHandler,
  ModelInterfaceRequestMethods
} from '@thirdact/simple-mongoose-interface';
import { DEFAULT_REST_INTERFACE_OPTIONS } from '@thirdact/simple-mongoose-interface/lib/RESTInterfaceHandler';
import {IUser, User} from "../common/_user";
import {MakeEncoder} from "../common/_encoder";

const simpleInterface = new SimpleModelInterface<IUser>(new ModelInterface<IUser>(User));
const restHandler = new RESTInterfaceHandler(simpleInterface, (
  (process.env.SITE_URI as string) + '/api/user'
), {
  ...DEFAULT_REST_INTERFACE_OPTIONS,
  parseOptions: {
    allowedMethods: [
      ModelInterfaceRequestMethods.find,
      ModelInterfaceRequestMethods.patch,
      ModelInterfaceRequestMethods.update
    ],
    skipParseBody: false
  }
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IUser|null>
) {
  try {
    req.url = (process.env.SITE_URI as string) + req.url;
    await restHandler.execute(req as any, res as any);
  } catch (err) {
    res.statusCode = err.httpCode || 500;
    let buf = MakeEncoder().serializeObject(
      {
        error: {
          message: err.message
        }
      }
    )
    res.end(
      buf
    );
  }
}

export const config = {
  api: {
    bodyParser: false
  }
}
