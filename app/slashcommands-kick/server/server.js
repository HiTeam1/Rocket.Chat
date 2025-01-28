
// Kick is a named function that will replace /kick commands
import { Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { TAPi18n } from 'meteor/rocketchat:tap-i18n';

import { Subscriptions, Users } from '../../models';
import { slashCommands } from '../../utils';
import { publishToRedis } from '/app/redis/redisPublisher';

const Kick = function (command, params, { rid }) {
	if (command !== 'kick' || !Match.test(params, String)) {
		return;
	}
	const username = params.trim().replace('@', '');
	if (username === '') {
		return;
	}
	const userId = Meteor.userId();
	const user = Meteor.users.findOne(userId);
	const kickedUser = Users.findOneByUsernameIgnoringCase(username);

	if (kickedUser == null) {
		return publishToRedis(`room-${rid}`, {
			broadcast: true,
			key: userId,
			funcName: 'notifyUserInThisInstance',
			eventName: 'message',
			value: {
				_id: Random.id(),
				rid,
				ts: new Date(),
				msg: TAPi18n.__('Username_doesnt_exist', {
					postProcess: 'sprintf',
					sprintf: [username],
				}, user.language),
			}
		});
	}

	const subscription = Subscriptions.findOneByRoomIdAndUserId(rid, user._id, { fields: { _id: 1 } });
	if (!subscription) {
		return publishToRedis(`room-${rid}`, {
			broadcast: true,
			key: userId,
			funcName: 'notifyUserInThisInstance',
			eventName: 'message',
			value: {
				_id: Random.id(),
				rid,
				ts: new Date(),
				msg: TAPi18n.__('Username_is_not_in_this_room', {
					postProcess: 'sprintf',
					sprintf: [username],
				}, user.language),
			},
		});
	}
	Meteor.call('removeUserFromRoom', { rid, username });
};

slashCommands.add('kick', Kick, {
	description: 'Remove_someone_from_room',
	params: '@username',
	permission: 'remove-user',
});
