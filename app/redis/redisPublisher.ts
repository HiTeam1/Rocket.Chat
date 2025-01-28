import Redis from 'ioredis';
import superjson from 'superjson';

import { settings } from '../settings/server';

import './settings';

import { BroadcastMsg } from './handleRedisMessage';


const redis = new Redis({
	host: settings.get('Redis_url') as string, // Redis server hostname
	port: 6379, // Redis server port
	// password: 'your_password', // Redis server password (if any)
	db: 0, // Redis database index
	autoResubscribe: true,
	maxRetriesPerRequest: 3,
});

console.log('Running redis startup');

redis.on('connect', () => {
	console.log('Connected to Redis');
});

redis.on('error', (err) => {
	console.error('Redis error', err);
});

export const publishToRedis = (channel: string, message: object | BroadcastMsg): void => {
	redis.publish(channel, superjson.stringify(message));
};
