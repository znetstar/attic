import * as express from 'express';
import { JSONSerializer } from 'multi-rpc';
import { ExpressTransport } from 'multi-rpc-express-transport';
import resolverMiddleware from './ResolverMiddleware';
import { RPCServer } from '../RPC';

let app = express();
app.use(require('cors')());

export const RPCRouter = express.Router();
export const RPCTransport = new ExpressTransport(new JSONSerializer(), RPCRouter);
RPCServer.addTransport(RPCTransport);
app.post('/rpc', RPCRouter);
app.use(resolverMiddleware);

export default app;