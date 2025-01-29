import { Users } from '../../../models/server';
import { Notifications } from '../../../notifications/server';
import { redisMessageHandlers } from '/app/redis/handleRedisMessage';
import { publishToRedis } from '/app/redis/redisPublisher';
import { settings } from '/app/settings/server';

const handleUsers = ({clientAction, id, data, diff}) => {
	switch (clientAction) {
		case 'updated':
			Notifications.notifyUserInThisInstance(id, 'userData', {
				diff,
				type: clientAction,
			});
			break;
		case 'inserted':
			Notifications.notifyUserInThisInstance(id, 'userData', {
				data,
				type: clientAction,
			});
			break;
		case 'removed':
			Notifications.notifyUserInThisInstance(id, 'userData', {
				id,
				type: clientAction,
			});
			break;
	}
};

if (settings.get('Use_Oplog_As_Real_Time')) {
	Users.on('change', (oplog) => {
		handleUsers(oplog);
	});
} else {
	// Users.on('change', ({ clientAction, id, data, diff }) => {
	// 	const newdata = {
	// 		...data,
	// 		ns: 'users',
	// 		clientAction,
	// 	};
	// 	publishToRedis(`user-${id}`, newdata);
	// });
}
redisMessageHandlers['users'] = handleUsers;
