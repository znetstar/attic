import { Queue } from 'bullmq';
import Redis from 'ioredis';

export const bullRedis = new Redis(process.env.BULL_REDIS_URI);
