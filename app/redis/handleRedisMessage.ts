import superjson from 'superjson';

import { Notifications } from '../notifications/server';
import redis from './redis';

interface IRedisHandlers {
	rocketchat_message: Function;
	rocketchat_subscription: Function;
	rocketchat_room: Function;
	rocketchat_settings: Function;
	rocketchat_roles: Function;
	users: Function;
}

export type BroadcastMsg = {
	broadcast?: boolean;
	key?: string;
	funcName: string;
	eventName: string;
	value: Record<string, any>;
}

type RedisMsg = {
	broadcast?: boolean;
	ns: keyof IRedisHandlers;
}

export const redisMessageHandlers: Partial<IRedisHandlers> = {};

redis.on('message', (channel: string, msg: string) => {
	const message = superjson.parse(msg) as BroadcastMsg | RedisMsg;

	let handler;
	if (channel === 'broadcast' || message?.broadcast) {
		const data = message as BroadcastMsg;
		Notifications.pubsubAdapter(data.key, data.eventName, data.funcName, data.value);
	} else {
		const { ns } = message as RedisMsg;
		handler = redisMessageHandlers[ns];
	}

	if (handler) {
		return handler(message);
	}
});
