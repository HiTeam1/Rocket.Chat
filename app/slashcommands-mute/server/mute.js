import { Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { TAPi18n } from 'meteor/rocketchat:tap-i18n';

import { Subscriptions, Users } from '../../models';
import { slashCommands } from '../../utils';
import { publishToRedis } from '/app/redis/redisPublisher';

/*
* Mute is a named function that will replace /mute commands
*/

slashCommands.add('mute', function Mute(command, params, item) {
	if (command !== 'mute' || !Match.test(params, String)) {
		return;
	}
	const username = params.trim().replace('@', '');
	if (username === '') {
		return;
	}
	const userId = Meteor.userId();
	const user = Meteor.users.findOne(userId);
	const mutedUser = Users.findOneByUsernameIgnoringCase(username);
	if (mutedUser == null) {
		publishToRedis(`room-${item.rid}`, {
			broadcast: true,
			key: userId,
			funcName: 'notifyUserInThisInstance',
			eventName: 'message',
			value: {
				_id: Random.id(),
				rid: item.rid,
				ts: new Date(),
				msg: TAPi18n.__('Username_doesnt_exist', {
					postProcess: 'sprintf',
					sprintf: [username],
				}, user.language),
			},
		});

		return;
	}

	const subscription = Subscriptions.findOneByRoomIdAndUserId(item.rid, mutedUser._id, { fields: { _id: 1 } });
	if (!subscription) {
		publishToRedis(`room-${item.rid}`, {
			broadcast: true,
			key: userId,
			funcName: 'notifyUserInThisInstance',
			eventName: 'message',
			value: {
				_id: Random.id(),
				rid: item.rid,
				ts: new Date(),
				msg: TAPi18n.__('Username_is_not_in_this_room', {
					postProcess: 'sprintf',
					sprintf: [username],
				}, user.language),
			},
		});

		return;
	}
	Meteor.call('muteUserInRoom', {
		rid: item.rid,
		username,
	});
}, {
	description: 'Mute_someone_in_room',
	params: '@username',
	permission: 'mute-user',
});
