import {IApplicationContext, IConfig, IPlugin} from "@znetstar/attic-common/lib/Server";
import { S3, config as awsConfig } from 'aws-sdk';
import {ILocation, IRPC} from "@znetstar/attic-common";
import {createEntityFromLocation, S3ResourceEntitySchema} from "./S3ResourceEntity";
import S3Driver from "./S3Driver";
import MinioDriver from "./MinioDriver";
import * as Minio from "minio";
import {ClientOptions} from "minio";

export type AtticS3Config = IConfig&{
  awsConfig?: unknown;
  s3Config?: unknown;
  minioConfig?: unknown;
  minioUri?: string;
  minioRootUser?: string;
  minioRootPassword?: string;
};

export type IAtticS3ApplicationContext = IApplicationContext&{
  s3: S3;
  minio: Minio.Client;

  rpcServer: unknown& {
    methods: IRPC & {
      createS3EntityFromLocation: (loc: ILocation) => Promise<string | null>;
    }
  }
}

export const AtticS3ApplicationContext = (global as any).ApplicationContext as IAtticS3ApplicationContext;

export class AtticServerS3 implements IPlugin {
    public s3: S3;
    public minio?: Minio.Client;
    constructor(
      public applicationContext: IAtticS3ApplicationContext
    ) {
      let cfg: any = this.config.awsConfig;
      if (!cfg?.credentials?.accessKeyId && process.env.AWS_ACCESS_KEY_ID) {
        cfg = cfg || {};
        cfg.credentials = cfg.credentials || {};
        cfg.credentials.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      }
      if (!cfg?.credentials?.secretAccessKey && process.env.AWS_SECRET_ACCESS_KEY) {
        cfg = cfg || {};
        cfg.credentials = cfg.credentials || {};
        cfg.credentials.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      }
      if (cfg)
        awsConfig.update(cfg);
      this.s3 = this.applicationContext.s3 = new S3(this.config.s3Config as any);

      const minioUri: string|undefined = process.env.MINIO_URI || this.config.minioUri;
      if (this.config.minioConfig || minioUri) {
        const opts: ClientOptions = (this.config.minioConfig || {})  as ClientOptions;
        let minioUsername: string|undefined = process.env.MINIO_ROOT_USER || this.config.minioRootUser;
        let minioPassword: string|undefined = process.env.MINIO_ROOT_PASSWORD || this.config.minioRootPassword;
        if (minioUri) {
          const uri = require('url').parse(minioUri);
          const [ u, p ] = (uri.auth || '').split(':');

          opts.accessKey = minioUsername || u;
          opts.secretKey = minioPassword || p;
          opts.useSSL = uri.proto === 'https:';
          opts.endPoint = uri.hostname;
          opts.port = Number(uri.port);
        }

        this.minio = this.applicationContext.minio = new Minio.Client(opts);
      }
    }

    public get config(): AtticS3Config { return this.applicationContext.config as AtticS3Config; }

    public async init(): Promise<void> {
      const ctx = this.applicationContext;

      ctx.registerHook('launch.loadDrivers.start', async function () {
        await ctx.loadDriver(S3Driver, 'S3Driver');
        await ctx.loadDriver(MinioDriver, 'MinioDriver');
      });

      this.applicationContext.registerHook('launch.loadModels.complete', async () => {
        (this.applicationContext.mongoose as any).models.Entity.discriminator('S3ResourceEntity', S3ResourceEntitySchema);
        this.applicationContext.config.entityTypes = [ ...this.applicationContext.config.entityTypes, 'S3ResourceEntity' ];
      });

      this.applicationContext.registerHook('launch.loadWebServer.complete', async () => {
        const {
          mongoose: $mongoose,
          rpcServer
        } = this.applicationContext;
        const mongoose = $mongoose as any;

        const { rpcServer: RPCServer } = ctx;
        RPCServer.methods.createS3EntityFromLocation = async function (loc: ILocation): Promise<string|null> {
          const entity = await createEntityFromLocation(loc);

          await entity.save();

          if (entity) return entity._id.toString();
          return null;
        }
      });
    }

    public get name(): string {
        return '@znetstar/attic-server-s3';
    }
}

export default AtticServerS3;
