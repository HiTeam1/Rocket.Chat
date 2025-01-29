import Settings from '../../../../models/server/models/Settings';
import { Notifications } from '../../../../notifications/server';
import { CONSTANTS } from '../../../lib';
import Permissions from '../../../../models/server/models/Permissions';
import { clearCache } from '../../functions/hasPermission';
import { settings } from '/app/settings/server';
import { publishToRedis } from '/app/redis/redisPublisher';
import { redisMessageHandlers } from '/app/redis/handleRedisMessage';

const handlePermissions = ({clientAction, id, data, diff}) => {
	if (diff && Object.keys(diff).length === 1 && diff._updatedAt) {
		return;
	}	

	clearCache();

	Notifications.notifyLoggedInThisInstance(
		'permissions-changed',
		clientAction,
		data
	);

	if (data.level && data.level === CONSTANTS.SETTINGS_LEVEL) {
		// if the permission changes, the effect on the visible settings depends on the role affected.
		// The selected-settings-based consumers have to react accordingly and either add or remove the
		// setting from the user's collection
		const setting = Settings.findOneById(data.settingId);
		Notifications.notifyLoggedInThisInstance(
			'private-settings-changed',
			'updated',
			setting,
		);
	}
};

if (settings.get('Use_Oplog_As_Real_Time')) {
	Permissions.on('change', (oplog) => {
		handlePermissions(oplog);
	});
} else {
	// Permissions.on('change', ({ clientAction, id, data, diff }) => {
	// 	data = data || Permissions.findOneById(id);
	// 	const newdata = {
	// 		...data,
	// 		ns: 'rocketchat_permissions',
	// 		clientAction,
	// 	};
	// 	publishToRedis(`all`, newdata);
	// });
}
redisMessageHandlers['rocketchat_permissions'] = handlePermissions;
