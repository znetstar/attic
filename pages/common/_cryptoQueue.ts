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
import { EventEmitter2 as EventEmitter } from 'eventemitter2';
import EncodeTools, {IDFormat} from "@etomon/encode-tools/lib/EncodeTools";
import {IEncodeTools, SerializationFormat} from "@etomon/encode-tools/lib/IEncodeTools";

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


export class ReturnValueTicket<R>  {
  protected enc: IEncodeTools = makeInternalCryptoEncoder();
  public ticketId: string;
  constructor(protected setFn: (name: string, val: Buffer) => Promise<void>, protected getFn:  (name: string) => Promise<Buffer|null>, protected clearFn: (key: string) => Promise<void>, ticketId?: string) {
    this.ticketId = ticketId || this.enc.uniqueId(this.enc.options.uniqueIdFormat as IDFormat).toString();
  }

  public async set(val: R): Promise<void> {
    await this.setFn(this.ticketId, Buffer.from(this.enc.serializeObject<R>(val, this.enc.options.serializationFormat as SerializationFormat)));
  }

  public async get(): Promise<R|null> {
    const val: Buffer|null = await this.getFn(this.ticketId);
    return val ? this.enc.deserializeObject<R>(val, this.enc.options.serializationFormat as SerializationFormat) : null;
  }


  public async clear(): Promise<void> {
    await this.clearFn(this.ticketId);
  }
}


export type ShimJobState = 'failed'|'completed'|'active'|'waiting'|'delayed';

export class ShimJob<D,R> {
  public returnvalue?: R;
  public failedReason?: string;
  public id: string;
  constructor(
    public name: string,
    public data: D,
    public worker: (job: ShimJob<D,R>) => Promise<R>,
    id?: string
  ) {
    this.id = id || EncodeTools.WithDefaults.uniqueId(IDFormat.uuidv4String);
  }

  public static queue: Map<string, ShimJob<any, any>> = new Map<string, ShimJob<any, any>>();
  public static returnValues: Map<string, Buffer> = new Map<string, Buffer>();
  public async run(sync = false): Promise<void> {

    try {
      this.returnvalue = await this.worker(this);
      this.state = 'completed';
    } catch (err: any) {

      this.failedReason = err.stack;
      this.state = 'failed';
      if (sync) throw err;
    }
  }

  public moveToDelayed() { this.state = 'delayed'; }
  public moveToComplete() { this.state = 'completed'; }
  public moveToFailed() { this.state = 'failed'; }
  public moveToActive() { this.state = 'active'; }
  public moveToWaiting() { this.state = 'waiting'; }

  protected state: ShimJobState = 'waiting';

  getState(): ShimJobState  {
    return this.state;
  }


  public add() { ShimJob.queue.set(this.id, this); }
  public remove() {
    ShimJob.queue.delete(this.id);
  }

  public static create<D,R>(name: string,
                             data: D,
                             worker: (job: ShimJob<D,R>) => Promise<R>,
                             id?: string,
                            runDelay: number = 100): ShimJob<D,R>  {
    const job = new ShimJob<D,R>(name, data, worker, id);
    job.add();

    return job;
  }
}

export class CryptoQueue extends EventEmitter {
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
     beforeConfirm: (job: Job) => Promise<TransactionId|undefined>,
     afterConfirm: (job: Job, receipt: TransactionReceipt) => Promise<unknown>,
     additionalOptions?: {
      connection?: any,
      defaultJobOptions?: JobsOptions,
      defaultQueueOptions?: QueueOptions,
      defaultWorkerOptions?: WorkerOptions,
      defaultQueueSchedulerOptions?: QueueSchedulerOptions,   onError?: (job: Job) => void,
       shim?: boolean
    }
  ): CryptoQueue {
    additionalOptions = additionalOptions  ||  {};
    additionalOptions.shim = true;
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


  public async makeReturnValue<R>(ticketId?: string): Promise<ReturnValueTicket<R>> {
    let rv: ReturnValueTicket<R>;
    if (this.additionalOptions?.shim) {
      rv = new ReturnValueTicket<R>(
        async(name, val) => { ShimJob.returnValues.set(name, val); },
        async(name) => ShimJob.returnValues.get(name) || null,
        async(name) => { ShimJob.returnValues.delete(name); },
        ticketId
      );
    } else {
      rv = new ReturnValueTicket<R>(
        async(name, val) => { await this.connection.hsetBuffer('returnValues', name, val); },
        async(name) =>  (await  this.connection.hgetBuffer('returnValues', name)) || null,
        async(name) => { await this.connection.hdel('returnValues', name); },
        ticketId
      );
    }

    return rv;
  }


  public async getJob(jobId: string): Promise<Job|null> {
    return  !this.additionalOptions?.shim ? (
      this.queue.getJob(jobId)
    ) : (
      (ShimJob.queue.get(jobId) || null)  as  any
    );
  }


  public async addJob(name: string, data: any, sync: boolean|{ waitDelay: number } = false, jobOpts?: JobsOptions): Promise<Job>  {
    const returnValue = await this.makeReturnValue<any>(data?.returnValueKey);
    let job = !this.additionalOptions?.shim ? await this.queue.add(name, {
      ...data,
      returnValueKey: returnValue.ticketId
    }, {
      removeOnComplete: false,
      removeOnFail: false,
      ...(jobOpts||{})
    }) : (
      ShimJob.create<any, any>(
        name,
        {
          ...data,
          returnValueKey: returnValue.ticketId
        },
        this.processTransaction.bind(this) as any,
      ) as any
    );

    job.returnvalue = returnValue;

    if (sync && !this.additionalOptions?.shim) {
      let state: string;
      while (
        (state = await job.getState()) && (state !== 'completed' || (state === 'completed' && job.name === 'beforeConfirm')) && state !== 'failed'
      ) {
          if (state === 'completed' && job.name === 'beforeConfirm') {
            job = await this.getJob('crypto:transaction:'+job.id+':afterConfirm') as Job;
            continue;
          }
          await new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, typeof(sync) === 'boolean' ? Number(process.env.DEFAULT_WAIT_DELAY || 100) : sync.waitDelay);
        });
      }

      const doneJob = await this.getJob(job.id as string) as Job;
      if (state === 'failed') {
        throw new CryptoQueueError(doneJob);
      }
     else {

        await job.remove();
        return doneJob;
      }
    }
    else if (sync) {
      let  eee: any;
      try { await job.run(true); }
      catch (err: any) {  eee = err; }
      finally {

          job.remove();
        if (eee) {
          throw eee;
        }
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

  static errorEventName(job: Job, ...extra: any[]) {
    return `cryptoQueue:${job.id}${ extra.length ? ':'+extra.join(':') : '' }`;
  }


  clearEventsForJob(job: Job) {
    this.removeAllListeners(CryptoQueue.errorEventName(job, '*'));
  }

  protected processTransaction = async (job: Job): Promise<string|void> => {
    let err1: any;
    let returnValue: any;
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
        }
        else {
          if (receipt.status === Status.Success) {

            let rawVal = await this.afterConfirm(job, receipt);

            let key: string | undefined;
            if (rawVal) {

              const rv = job.returnvalue = await this.makeReturnValue(job.data.returnValueKey);
              await rv.set(rawVal);
            }

            returnValue = key;
          } else {
            throw new CryptoError(receipt);
          }
        }
      } else if (job.name === 'beforeConfirm') {
        const transactionId = await this.beforeConfirm(job);
        if (transactionId) {
          const tidString = makeInternalCryptoEncoder().encodeBuffer(Buffer.from(transactionId.toBytes()));

          const doneJob = await this.addJob('afterConfirm', {
            ...job.data,
            transactionId: tidString,
          }, true, {
            ...job.opts,
            jobId: 'crypto:transaction:' + job.id + ':afterConfirm'
          });

        }

      }
    } catch (err: any) {
      err1 = err;
    } finally {
      let err2: any;
      try {
        if (err1) {
          if (this.hasListeners(CryptoQueue.errorEventName(job, 'catch'))) {
            await this.emitAsync(CryptoQueue.errorEventName(job, 'catch'), job, err1);
          } else {
            throw err1;
          }
        }
      } catch (err: any) {
        err2 = err;
      } finally {
        this.clearEventsForJob(job);
        if (err2 && err2.receipt?.status !== Status.TokenAlreadyAssociatedToAccount) {
          console.error(`error processing transaction ${this.name}: ${err2.stack}`);
          throw err2;
        } else {

          return returnValue;
        }
      }
    }
  }

  protected connection: any;

  constructor(
    public name: string,
    protected beforeConfirm: (job: Job) => Promise<TransactionId|undefined>,
    protected afterConfirm: (job: Job, receipt: TransactionReceipt) => Promise<unknown>,
    protected additionalOptions?: {
      connection?: any,
      defaultJobOptions?: JobsOptions,
      defaultQueueOptions?: QueueOptions,
      defaultQueueEventsOptions?: QueueEventsOptions,
      defaultWorkerOptions?: WorkerOptions,
      defaultQueueSchedulerOptions?: QueueSchedulerOptions,
      onError?: (job: Job) => void,
      shim?: boolean
    }
  ) {
    super({ wildcard: true, delimiter: ':' });
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

