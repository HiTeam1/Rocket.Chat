import { Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { TAPi18n } from 'meteor/rocketchat:tap-i18n';

import { Subscriptions, Users } from '../../models';
import { slashCommands } from '../../utils';
import { publishToRedis } from '/app/redis/redisPublisher';

/*
* Unmute is a named function that will replace /unmute commands
*/

slashCommands.add('unmute', function Unmute(command, params, item) {
	if (command !== 'unmute' || !Match.test(params, String)) {
		return;
	}
	const username = params.trim().replace('@', '');
	if (username === '') {
		return;
	}
	const user = Meteor.users.findOne(Meteor.userId());
	const unmutedUser = Users.findOneByUsernameIgnoringCase(username);
	if (unmutedUser == null) {
		return publishToRedis(`room-${item.rid}`, {
			broadcast: true,
			key: Meteor.userId(),
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
	}

	const subscription = Subscriptions.findOneByRoomIdAndUserId(item.rid, unmutedUser._id, { fields: { _id: 1 } });
	if (!subscription) {
		return publishToRedis(`room-${item.rid}`, {
			broadcast: true,
			key: Meteor.userId(),
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
	}
	Meteor.call('unmuteUserInRoom', {
		rid: item.rid,
		username,
	});
}, {
	description: 'Unmute_someone_in_room',
	params: '@username',
	permission: 'mute-user',
});
