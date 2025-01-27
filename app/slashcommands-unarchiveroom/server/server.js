import { Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { TAPi18n } from 'meteor/rocketchat:tap-i18n';

import { Messages, Rooms } from '../../models';
import { slashCommands } from '../../utils';
import { RoomMemberActions, roomTypes } from '../../utils/server';
import { publishToRedis } from '/app/redis/redisPublisher';

function Unarchive(command, params, item) {
	if (command !== 'unarchive' || !Match.test(params, String)) {
		return;
	}

	let channel = params.trim();
	let room;

	if (channel === '') {
		room = Rooms.findOneById(item.rid);
		channel = room.name;
	} else {
		channel = channel.replace('#', '');
		room = Rooms.findOneByName(channel);
	}

	const user = Meteor.users.findOne(Meteor.userId());

	if (!room) {
		return publishToRedis(`room-${item.rid}`, {
			broadcast: true,
			key: Meteor.userId(),
			funcName: 'notifyUser',
			eventName: 'message',
			value: {
				_id: Random.id(),
				rid: item.rid,
				ts: new Date(),
				msg: TAPi18n.__('Channel_doesnt_exist', {
					postProcess: 'sprintf',
					sprintf: [channel],
				}, user.language),
			},
		});
	}

	// You can not archive direct messages.
	if (!roomTypes.getConfig(room.t).allowMemberAction(room, RoomMemberActions.ARCHIVE)) {
		return;
	}

	if (!room.archived) {
		publishToRedis(`room-${item.rid}`, {
			broadcast: true,
			key: Meteor.userId(),
			funcName: 'notifyUser',
			eventName: 'message',
			value: {
				_id: Random.id(),
				rid: item.rid,
				ts: new Date(),
				msg: TAPi18n.__('Channel_already_Unarchived', {
					postProcess: 'sprintf',
					sprintf: [channel],
				}, user.language),
			},
		});
		return;
	}

	Meteor.call('unarchiveRoom', room._id);

	Messages.createRoomUnarchivedByRoomIdAndUser(room._id, Meteor.user());
	publishToRedis(`room-${item.rid}`, {
		broadcast: true,
		key: Meteor.userId(),
		funcName: 'notifyUser',
		eventName: 'message',
		value: {
			_id: Random.id(),
			rid: item.rid,
			ts: new Date(),
			msg: TAPi18n.__('Channel_Unarchived', {
				postProcess: 'sprintf',
				sprintf: [channel],
			}, user.language),
		},
	});

	return Unarchive;
}

slashCommands.add('unarchive', Unarchive, {
	description: 'Unarchive',
	params: '#channel',
	permission: 'unarchive-room',
});
