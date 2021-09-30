import {
  Job,
  Queue,
  Worker,
  QueueScheduler,
  WorkerOptions,
  JobsOptions,
  QueueOptions,
  QueueSchedulerOptions,
  QueueEvents, QueueEventsOptions
} from "bullmq"
import {bullRedis} from "./_bull";
import {Status, TransactionId, TransactionReceipt, TransactionReceiptQuery} from "@hashgraph/sdk";
import {HTTPError} from "./_rpcCommon";
import { getCryptoAccountByKeyName } from "./_account";
import IORedis from "ioredis";
import {makeInternalCryptoEncoder, makeKeyEncoder} from "./_encoder";

const confirmDelay = Number(process.env.CONFIRM_DELAY) || 30e3;

export class CryptoError extends HTTPError {
  constructor(public receipt: TransactionReceipt) {
    super(500, `Crypto network error status: "${receipt.status.toString()}"`);
  }
}

export class CryptoQueueError extends HTTPError {
  constructor(public job: Job) {
    super(500, job.failedReason);
  }
}


export class CryptoQueue {
  public queue: Queue;
  public scheduler: QueueScheduler;
  public worker: Worker;
  public events: QueueEvents;


  protected static cryptoQueues: Map<string, CryptoQueue> = new Map<string, CryptoQueue>();

  public static getCryptoQueue(name: string): CryptoQueue|undefined {
    return this.cryptoQueues.get(name);
  }

  public static createCryptoQueue(
     name: string,
     beforeConfirm: (job: Job) => Promise<TransactionId>,
     afterConfirm: (job: Job, receipt: TransactionReceipt) => Promise<unknown>,
     additionalOptions?: {
      connection?: any,
      defaultJobOptions?: JobsOptions,
      defaultQueueOptions?: QueueOptions,
      defaultWorkerOptions?: WorkerOptions,
      defaultQueueSchedulerOptions?: QueueSchedulerOptions,   onError?: (job: Job) => void
    }
  ): CryptoQueue {
    let queue = CryptoQueue.cryptoQueues.get(name);

    if (!queue) {
      queue = new CryptoQueue(
        name,
        beforeConfirm,
        afterConfirm,
        additionalOptions
      );

      CryptoQueue.cryptoQueues.set(name, queue);
    }

    return queue;
  }
  public static async closeCryptoQueue(name: string): Promise<void> {
    let queue = CryptoQueue.cryptoQueues.get(name);

    if (queue) {
      await queue.close();
      this.cryptoQueues.delete(name);
    }
  }

  public async close(): Promise<void> {
    await Promise.all([
      this.scheduler.close(),
      this.worker.close(),
      this.queue.close(),
      this.events.close()
    ]);
  }

  public async waitForJobComplete(job: Job): Promise<Job> {
    return new Promise<Job>((resolve, reject) => {
      this.worker.once('completed', (job: Job) => {
        // job has completed
      });
      this.worker.on('failed', (job: Job) => {
        // job has failed
      });
    });
  }


  public async getReturnValue(key: string|null): Promise<unknown> {
    if (!key)
      return null;

      const [[__, val]] = await this.connection.pipeline()
      .hgetBuffer('returnValues', key)
      .hdel('returnValues', key)
      .exec();

    if (!val)
      return null;

    const { value }  = makeInternalCryptoEncoder().deserializeObject(val);
    return value;
  }

  public async addJob(name: string, data: any, sync: boolean|{ waitDelay: number } = false, jobOpts?: JobsOptions): Promise<Job>  {
    let job = await this.queue.add(name, {
      ...data,
      returnValueKey: makeInternalCryptoEncoder().uniqueId()
    }, {
      removeOnComplete: false,
      removeOnFail: false,
      ...(jobOpts||{})
    });


    if (sync) {
      let state: string;
      while (
        (state = await job.getState()) && state !== 'completed' && state !== 'failed'
      ) {
          await new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, typeof(sync) === 'boolean' ? Number(process.env.DEFAULT_WAIT_DELAY || 100) : sync.waitDelay);
        });
      }

      if (state === 'failed') {
        throw new CryptoQueueError(job);
      }
     else {
        const doneJob = await this.queue.getJob(job.id as string) as Job;

        doneJob.returnvalue = await this.getReturnValue(doneJob.data.returnValueKey)

        await job.remove();
        return doneJob;
      }
    }

    return job;
  }

  protected static redisConnections: Map<string, IORedis.Redis> = new Map<string, IORedis.Redis>();

  static createConnection(name: string): { redis: IORedis.Redis, ready: Promise<void> } {
    let conn: IORedis.Redis|undefined = CryptoQueue.redisConnections.get(name);
    let ready = Promise.resolve()
    if (!conn) {
      conn = new IORedis(process.env.BULL_REDIS_URI) as IORedis.Redis;
      ready = new Promise<void>((resolve, reject) => {
        let onError = (err: any) => {
          (conn as IORedis.Redis).off('ready', onReady);
          (conn as IORedis.Redis).off('error', onError);
          reject(err);
        }
        let onReady  =  () => {
          (conn as IORedis.Redis).off('ready', onReady);
          (conn as IORedis.Redis).off('error', onError);
          resolve();
        }
        (conn as IORedis.Redis).once('ready', onReady);
        (conn as IORedis.Redis).once('error', onError);
      });

      conn.on('end', () => {
        this.redisConnections.delete(name);
      });

      CryptoQueue.redisConnections.set(name, conn);
    }

    return { redis: conn, ready };
  }

  protected processTransaction = async (job: Job): Promise<string|void> => {
    try {
      const client = await (await getCryptoAccountByKeyName('cryptoMaster')).createClient();

      if (job.name === 'afterConfirm') {
        // If a transaction already exists we should run `afterConfirm`
        const tidRaw = makeInternalCryptoEncoder().decodeBuffer(job.data.transactionId);
        const transactionId = TransactionId.fromBytes(tidRaw);
        const receipt = await new TransactionReceiptQuery()
          .setTransactionId(transactionId)
          .execute(client);

        //  Not confirmed yet
        if (receipt.status === Status.Unknown || receipt.status === Status.Ok) {
          await job.moveToDelayed(
            (new Date()).getTime() + confirmDelay
          );
        } else if (receipt.status === Status.Success) {
          let rawVal = await this.afterConfirm(job, receipt);
          let key: string|undefined;
          if (rawVal) {
            const returnVal = Buffer.from(makeInternalCryptoEncoder().serializeObject({ value: rawVal }));
            const newJob = job.id ? await this.queue.getJob(job.id) : void(0);
            key = Buffer.from(((newJob || job).data.returnValueKey as string)).toString('base64');
            await this.connection.hsetBuffer(`returnValues`, key, returnVal);
          }

          return key;
        } else {
          throw new CryptoError(receipt);
        }
      } else if (job.name === 'beforeConfirm') {
        const transactionId = await this.beforeConfirm(job);
        const tidString = makeInternalCryptoEncoder().encodeBuffer(Buffer.from(transactionId.toBytes()));
        await this.queue.add('afterConfirm', {
          ...job.data,
          transactionId: tidString
        }, {
          ...job.opts,
          jobId: 'crypto:transaction:' + tidString
        });
      }
    } catch (err: any) {
        console.error(`error processing transaction: ${err.stack}`);
        throw err;
    }
  }

  protected connection: any;

  constructor(
    public name: string,
    protected beforeConfirm: (job: Job) => Promise<TransactionId>,
    protected afterConfirm: (job: Job, receipt: TransactionReceipt) => Promise<unknown>,
    protected additionalOptions?: {
      connection?: any,
      defaultJobOptions?: JobsOptions,
      defaultQueueOptions?: QueueOptions,
      defaultQueueEventsOptions?: QueueEventsOptions,
      defaultWorkerOptions?: WorkerOptions,
      defaultQueueSchedulerOptions?: QueueSchedulerOptions,
      onError?: (job: Job) => void,
    }
  ) {
    this.connection = CryptoQueue.createConnection(`${name}:general`).redis;
    this.queue = new Queue(name, {
      // @ts-ignore
      connection:  CryptoQueue.createConnection(`${name}:queue`).redis,
      defaultJobOptions: {
        removeOnFail: false,
        removeOnComplete: false
      },
      ...(additionalOptions?.defaultQueueOptions || {})
    });

    this.scheduler = new QueueScheduler(name, {
      // @ts-ignore
      connection: CryptoQueue.createConnection(`${name}:scheduler`).redis,
      ...(additionalOptions?.defaultQueueSchedulerOptions || {})
    });

    this.worker = new Worker(name, this.processTransaction, {
        concurrency: 1,
        // @ts-ignore
        connection: CryptoQueue.createConnection(`${name}:worker`).redis,
      ...(additionalOptions?.defaultWorkerOptions || {})
      });


    this.events = new QueueEvents(name, {
      // @ts-ignore
      connection: CryptoQueue.createConnection(`${name}:events`).redis,
      ...(additionalOptions?.defaultQueueEventsOptions || {})
    });


    if (additionalOptions?.onError) {

      this.events.on('error', (err: any) => {
        // @ts-ignore
        additionalOptions.onError('failed', err);
      });
    }
  }
}



export default CryptoQueue;

