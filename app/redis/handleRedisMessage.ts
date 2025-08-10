

import { serializer } from '../serialization/serializer';
import redis from './redis';

interface IRedisHandlers {
	rocketchat_message: Function;
	rocketchat_subscription: Function;
	rocketchat_room: Function;
	rocketchat_settings: Function;
	users: Function;
}


  

export const redisMessageHandlers: Partial<IRedisHandlers> = {};


redis.on("messageBuffer", (channel: string, msg: Buffer) => {
	console.log('new message from redis');

	const message = serializer.deserialize(msg) 
	const { ns } = message as { ns: keyof IRedisHandlers};
	const handler = redisMessageHandlers[ns];

	if (handler) {
		return handler(message);
	}
});
