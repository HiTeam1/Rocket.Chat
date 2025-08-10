import { Meteor } from 'meteor/meteor';

import { fields } from '.';

import { msgStream } from '../../../app/lib/server/lib/msgStream';
import { Subscriptions } from '../../../app/models';
import { Notifications } from '../../../app/notifications';

import { redisMessageHandlers } from '/app/redis/handleRedisMessage';
import { publishToRedis } from '/app/redis/redisPublisher';
import { settings } from '/app/settings/server';
import ChannelHandler from '/app/ws/server/channelHandler';

const handleSubscriptionChange = Meteor.bindEnvironment(({clientAction, data, id} ) => {
	switch (clientAction) {
		case 'inserted':
			ChannelHandler.addChannelOnCreate(`room-${ data.rid }`, data.u._id);
		case 'updated':
			// Override data cuz we do not publish all fields
			data = Subscriptions.findOneById(id, { fields });
			break;

		case 'removed':
			data = Subscriptions.trashFindOneById(id, { fields: { u: 1, rid: 1 } });
			ChannelHandler.removeUserBindToRoom(data.rid, data.u._id);
			// emit a removed event on msg stream to remove the user's stream-room-messages subscription when the user is removed from room
			msgStream.__emit(data.u._id, clientAction, data);
			break;
	}

	Notifications.streamUser.__emit(data.u._id, clientAction, data);

	Notifications.notifyUserInThisInstance(
		data.u._id,
		'subscriptions-changed',
		clientAction,
		data,
	);
});

if (settings.get('Real_Time_Strategy') === 'defalt_oplog'){
	Subscriptions.on('change', (oplog) => {
		handleSubscriptionChange(oplog); // TODO-Hi: Check what happens if only new subscription has sent to the client, or when only a room insertion has sent to the client
	});
} else if (settings.get('Real_Time_Strategy') === 'app_publish_to_redis'){
	Subscriptions.on('change', (oplog) => {
		// must query to get u._id for the desired channel
		if (clientAction !== 'removed') {
			data = Subscriptions.findOneById(id, { fields });
		} else {
			data = Subscriptions.trashFindOneById(id, { fields: { u: 1, rid: 1 } });
		}

		const newdata = {
			...oplog,
			ns: 'rocketchat_subscription',
		};
		publishToRedis(`user-${ oplog.data?.u?._id }`, newdata);
	});
}

redisMessageHandlers.rocketchat_subscription = handleSubscriptionChange;
