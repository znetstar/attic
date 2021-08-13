import {GenericError} from '@znetstar/attic-common/lib/Error/GenericError'
import {IApplicationContext, IConfig, IPlugin} from "@znetstar/attic-common/lib/Server";
import {EncodeToolsAuto, IEncodeTools, EncodeTools} from '@etomon/encode-tools';
import {EncodingOptions, SerializationFormat,SerializationFormatMimeTypes} from "@etomon/encode-tools/lib/EncodeTools";
import * as BodyParser  from 'body-parser';
import {Options} from "body-parser";
import {IUser} from "@znetstar/attic-common";
import { Router } from 'express';
import {BasicFindOptions, BasicFindQueryOptions, BasicTextSearchOptions} from "@znetstar/attic-common/lib/IRPC";
import * as _ from 'lodash';
import { apply_patch } from 'jsonpatch';
import {NotFoundError} from "@znetstar/attic-common/lib/Error";

export interface RESTHandlerFunctions<M, Q, S, I> {
  find?: (query: Q) => Promise<M[]|number>;
  search?: (query: S) => Promise<M[]|number>;
  findOne?: (id: I) => Promise<M>;
  create?: (fields: M) => Promise<I>;
  update?: (id: I, fields: M) => Promise<void>;
  patch?: (id: I, patches: any[]) => Promise<void>;
  delete?: (id: I) => Promise<void>;
}

export class OperationNotImplementedError extends GenericError {
  constructor(operation: string = '(unspecified)') {
    super(`Operation ${operation} has not been implemented`);
  }

  httpCode = 501;
  code: 7370
}

export type  AtticServerRESTConfig = IConfig & {
  rest?: {
    bodyEncodeOptions?: EncodingOptions;
    urlBase?: string;
  }
};


export class ModelNotFoundError extends NotFoundError {
  constructor(modelName: string) {
    super(`Model :modelName not found`);
  }

  httpCode = 404;
  code: 7371
}


export function objExtractorMiddleware<Q>(enc: IEncodeTools, parserOptions?: Options) {
  return function objExtractor<Q>(req: unknown, res: unknown, next?: unknown) {
    BodyParser.raw({
      ...(parserOptions || {}),
      type: SerializationFormatMimeTypes.get(enc.options.serializationFormat)
    })(req as any, res as any, () => {
      try {
        let body: any = {};
        if ((req as any).body && Buffer.isBuffer((req as any).body)) {
          body = enc.deserializeObject<any>((req as any).body, enc.options.serializationFormat);
        }
        if ((req as any).query) {
          for (let k in (req as any).query) {
            _.set(body, k, (req as any).query[k]);
          }
        }

        (req as any).obj = body as Q || {};
        if (next)
          (next as any)();
      } catch (err) {
        if (next)
          (next as any)(err);
        else {
          (res as any).status(500).send({ error: { message: err.message } })
        }
      }
    });
  }
}

export class AtticServerREST implements IPlugin {
    protected bodyEncoder: IEncodeTools;
    constructor(
      public applicationContext: IApplicationContext,
      protected urlBase: string = '/rest',
      encodeOptions: EncodingOptions = { serializationFormat: SerializationFormat.json }
    ) {
      if (this.config.rest?.bodyEncodeOptions) {
        encodeOptions = this.config.rest?.bodyEncodeOptions;
      }
      this.bodyEncoder = new EncodeToolsAuto(encodeOptions);
      if (this.config.rest?.urlBase) {
        this.urlBase = this.config.rest?.urlBase;
      }
    }

    public makeUrl(resource: string): string {
      return this.applicationContext.config.siteUri + this.urlBase + resource;
    }

    public get config(): AtticServerRESTConfig { return this.applicationContext.config as AtticServerRESTConfig; }

    public methodsFromModelName<M>(modelName: string): RESTHandlerFunctions<M, BasicFindOptions, BasicTextSearchOptions, string> {
      const {
        webExpress: $web,
        mongoose: $mongoose,
        rpcServer
      } = this.applicationContext;
      const web = $web as any;
      const mongoose = $mongoose as any;
      const model = mongoose.models[modelName];
      if (!model)
        throw new ModelNotFoundError(modelName);

      async function findInner(query: BasicFindOptions): Promise<any[]|number> {
        let modelQuery = (model.find(query.query));
        if (query.count) {
          const count = await modelQuery.count().exec();
          return count;
        }
        if (query.sort) modelQuery.sort(query.sort);
        if (!Number.isNaN(Number(query.skip))) modelQuery.skip(query.skip);
        if (!Number.isNaN(Number(query.limit))) modelQuery.limit(query.limit);
        if (query.populate) modelQuery.populate(query.populate);
        let docs = await modelQuery.exec();
        return docs;
      }


      return {
        search: async (query: BasicTextSearchOptions) => {
          let modelQuery = (model.find({
            $text: {
              $search: query.terms,
              $caseSensitive: true
            }
          }, {
            score: {
              $meta: 'textScore'
            }
          }).sort({ score:{ $meta:"textScore" }} ));
          if (query.count) {
            const count = await modelQuery.count().exec();
            return count;
          }
          if (!Number.isNaN(Number(query.skip))) modelQuery.skip(query.skip);
          if (!Number.isNaN(Number(query.limit))) modelQuery.limit(query.limit);
          if (query.populate) modelQuery.populate(query.populate);
          let docs = await modelQuery.exec() as any[];
          return docs.map(l => l.toJSON({ virtuals: true }));
        },
        find: async (query: BasicFindOptions) =>  {
          let docs = await findInner(query);
          return Array.isArray(docs) ?
            docs.map(l => l.toJSON({ virtuals: true })) :
            docs;
        },
        findOne: async (id: string) =>  {
          const doc = await model.findById(id).exec();
          if (!doc)
            throw new NotFoundError();

          return doc.toJSON({ virtuals: true });
        },
        create: async (fields: any) => {
          let doc = await model.create(fields);
          return doc.id;
        },
        patch: async (id: string, patches: any[]) => {
          const doc = await model.findById(id).exec();
          if (!doc)
            throw new NotFoundError();
          const delta = apply_patch((doc as any).toObject({ virtuals: true }), patches);
          _.extend(doc, delta);
          await doc.save();
        },
        update: async (id: string, delta: any) => {
          const doc = await model.findById(id).exec();
          if (!doc)
            throw new NotFoundError();
          _.extend(doc, delta);
          await doc.save();
        },
        delete: async (id: string) => {
          const doc = await mongoose.models.User.findById(id).exec();
          if (!doc)
            throw new NotFoundError();
          await doc.remove();
        }
      }
    }

    public createRESTHandler() {
      const {
        webExpress: $web,
        mongoose: $mongoose,
        middleware: { asyncMiddleware, restrictScopeMiddleware }
      } = this.applicationContext;
      const web = Router();
      const mongoose = $mongoose as any;


      web.use('/:modelName/:id', (req, res, next) => {
        (req as any).targetId = req.params.id;
        if (req.params.id === 'self') {
          req.originalUrl = req.originalUrl.replace('/self', '/' + (req as any).user._id.toString());
          (req as any).targetId = (req as any).user._id.toString();
        }
        next();
      });

      // if (methods.findOne) {
        web.use(`/:modelName/:id`,
          (req:any, res:any, next:any) => {
            const {modelName} = req.params;
            const methods = this.methodsFromModelName(modelName);

            if (![ 'head', 'get' ].includes(req.method.toLowerCase())) {
              next && next();
              return;
            }
            restrictScopeMiddleware(`rest.${modelName}.findOne`)
            (
              req, res, next
            );
          },
          asyncMiddleware(async (req: any, res: any) => {
            const {modelName} = req.params;
            const methods = this.methodsFromModelName(modelName);

            if (![ 'head', 'get' ].includes(req.method.toLowerCase())) {
              return true;
            }
            let result: any;

            if (methods.findOne) {
              result = (await methods.findOne((req as any).targetId)) as any;
            } else {
              throw new OperationNotImplementedError(`rest.${modelName}.${req.queryType}`)
            }

            if (!result) {
              throw [ 404 ];
            }

            res.set('Content-Type', SerializationFormatMimeTypes.get(this.bodyEncoder.options.serializationFormat));
            res.status(200);
            if (req.method.toLowerCase() === 'head') {
              res.set('attic-count', 1).end();
            } else {
              res.send(
                this.bodyEncoder.serializeObject(result, this.bodyEncoder.options.serializationFormat)
              );
            }
          }))
      // }
      // if (methods.find || methods.search) {
        web.use(`/:modelName`,
          (req:any, res:any, next:any) => {
            const {modelName} = req.params;
            const methods = this.methodsFromModelName(modelName);
            if (![ 'head', 'get' ].includes(req.method.toLowerCase())) {
              next && next();
              return;
            }
            req.queryType = req.query.queryType || 'find';
            restrictScopeMiddleware(`rest.${modelName}.${req.queryType}`)
            (
              req, res, next
            );
          },
          objExtractorMiddleware(this.bodyEncoder),
          asyncMiddleware(async (req: any, res: any) => {
            const {modelName} = req.params;
            const methods = this.methodsFromModelName(modelName);

            if (![ 'head', 'get' ].includes(req.method.toLowerCase())) {
              return true;
            }
            let result = [];
            const query = req.obj;

            if (req.method.toLowerCase() === 'head') {
              (query as any).count = true;
            }

            if (req.queryType === 'search') {
              if (methods.search) {
                result = (await methods.search(query)) as any[];
              } else {
                throw new OperationNotImplementedError(`rest.${modelName}.${req.queryType}`)
              }
            } else if (req.queryType === 'find') {
              if (methods.search) {
                result = (await methods.find(query)) as any[];
              } else {
                throw new OperationNotImplementedError(`rest.${modelName}.${req.queryType}`);
              }
            } else {
              throw new OperationNotImplementedError(`rest.${modelName}.${req.queryType}`);
            }

            res.set('Content-Type', SerializationFormatMimeTypes.get(this.bodyEncoder.options.serializationFormat));
            res.status(200);
            if (req.method.toLowerCase() === 'head') {
              res.set('attic-count', result).end();
            } else {
              res.send(
                this.bodyEncoder.serializeObject(result, this.bodyEncoder.options.serializationFormat)
              );
            }
          }))
      // }
      // if (methods.create) {
        web.post(`/:modelName`,
          (req:any, res:any, next:any) => {
            const {modelName} = req.params;
            const methods = this.methodsFromModelName(modelName);
            restrictScopeMiddleware(`rest.${modelName}.create`)
            (
              req, res, next
            );
          },
          objExtractorMiddleware(this.bodyEncoder),
          asyncMiddleware(async (req: any, res: any) => {
            const {modelName} = req.params;
            const methods = this.methodsFromModelName(modelName);
            let result: string;

            const query = req.obj;

            if (methods.create) {
              result = (await methods.create(query)) as string;
            } else {
              throw new OperationNotImplementedError(`rest.${modelName}.${req.queryType}`)
            }

            res.set('Location', this.makeUrl( `/:modelName/${result}` ));
            res.status(201);
            res.end();
          }))
      // }
      // if (methods.update) {
        web.put(`/:modelName/:id`,
          (req:any, res:any, next:any) => {
            const {modelName} = req.params;
            const methods = this.methodsFromModelName(modelName);
            restrictScopeMiddleware(`rest.${modelName}.update`)
            (
              req, res, next
            );
          },
          objExtractorMiddleware(this.bodyEncoder),
          asyncMiddleware(async (req: any, res: any) => {
            const {modelName} = req.params;
            const methods = this.methodsFromModelName(modelName);
            let result: string;

            const query = req.obj

            if (methods.update) {
              (await methods.update((req as any).targetId, query));
            } else {
              throw new OperationNotImplementedError(`rest.${modelName}.update`)
            }

            res.status(204);
            res.end();
          }))
      // }
      // if (methods.patch) {
        web.patch(`/:modelName/:id`,
          (req:any, res:any, next:any) => {
            const {modelName} = req.params;
            const methods = this.methodsFromModelName(modelName);
            restrictScopeMiddleware(`rest.${modelName}.patch`)
            (
              req, res, next
            );
          },
          objExtractorMiddleware(this.bodyEncoder),
          asyncMiddleware(async (req: any, res: any) => {
            const {modelName} = req.params;
            const methods = this.methodsFromModelName(modelName);
            const query = req.obj as any[];

            if (methods.patch) {
              (await methods.patch((req as any).targetId, query));
            } else {
              throw new OperationNotImplementedError(`rest.${modelName}.patch`)
            }

            res.status(204);
            res.end();
          }));
      // }
      // if (methods.delete) {
      web.delete(`/:modelName/:id`,
        (req:any, res:any, next:any) => {
          const {modelName} = req.params;
          const methods = this.methodsFromModelName(modelName);
          restrictScopeMiddleware(`rest.${modelName}.delete`)
          (
            req, res, next
          );
        },
        asyncMiddleware(async (req: any, res: any) => {
          const {modelName} = req.params;
          const methods = this.methodsFromModelName(modelName);
          if (methods.delete) {
            (await methods.delete((req as any).targetId));
          } else {
            throw new OperationNotImplementedError(`rest.${modelName}.delete`)
          }

          res.status(204);
          res.end();
        }));

      ($web as any).use(this.urlBase, web);
    }

    public async init(): Promise<void> {
      this.applicationContext.registerHook(`AtticServerREST.createRESTHandler`, this.createRESTHandler.bind(this));
      this.applicationContext.registerHook('launch.loadWebServer.complete', async () => {
        const {
          webExpress: $web,
          mongoose: $mongoose,
          rpcServer
        } = this.applicationContext;
        const web = $web as any;
        const mongoose = $mongoose as any;

        this.createRESTHandler();
      });
    }

    public get name(): string {
        return '@znetstar/attic-server-rest';
    }
}

export default AtticServerREST;
