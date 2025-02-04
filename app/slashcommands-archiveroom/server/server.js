import { Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { TAPi18n } from 'meteor/rocketchat:tap-i18n';

import { Messages, Rooms } from '../../models';
import { slashCommands } from '../../utils';
import { publishToRedis } from '/app/redis/redisPublisher';

function Archive(command, params, item) {
	if (command !== 'archive' || !Match.test(params, String)) {
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
		publishToRedis(`room-${item.rid}`, {
			broadcast: true,
			key: Meteor.userId(),
			funcName: 'notifyUserInThisInstance',
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
	if (room.t === 'd') {
		return;
	}

	if (room.archived) {
		publishToRedis(`room-${item.rid}`, {
			broadcast: true,
			key: Meteor.userId(),
			funcName: 'notifyUserInThisInstance',
			eventName: 'message',
			value: {
				_id: Random.id(),
				rid: item.rid,
				ts: new Date(),
				msg: TAPi18n.__('Duplicate_archived_channel_name', {
					postProcess: 'sprintf',
					sprintf: [channel],
				}, user.language),
			},
		});

		return;
	}
	Meteor.call('archiveRoom', room._id);

	Messages.createRoomArchivedByRoomIdAndUser(room._id, Meteor.user());
	publishToRedis(`room-${item.rid}`, {
		broadcast: true,
		key: Meteor.userId(),
		funcName: 'notifyUserInThisInstance',
		eventName: 'message',
		value: {
			_id: Random.id(),
			rid: item.rid,
			ts: new Date(),
			msg: TAPi18n.__('Channel_Archived', {
				postProcess: 'sprintf',
				sprintf: [channel],
			}, user.language),
		},
	});

	return Archive;
}

slashCommands.add('archive', Archive, {
	description: 'Archive',
	params: '#channel',
	permission: 'archive-room',
});
