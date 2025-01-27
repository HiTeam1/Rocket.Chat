import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { TAPi18n } from 'meteor/rocketchat:tap-i18n';

import { handleError, slashCommands } from '../../utils';
import { publishToRedis } from '/app/redis/redisPublisher';

function Status(command, params, item) {
	if (command === 'status') {
		const user = Meteor.users.findOne(Meteor.userId());

		Meteor.call('setUserStatus', null, params, (err) => {
			if (err) {
				if (Meteor.isClient) {
					return handleError(err);
				}

				if (err.error === 'error-not-allowed') {
					publishToRedis(`room-${item.rid}`, {
						broadcast: true,
						key: Meteor.userId(),
						funcName: 'notifyUser',
						eventName: 'message',
						value: {
							_id: Random.id(),
							rid: item.rid,
							ts: new Date(),
							msg: TAPi18n.__('StatusMessage_Change_Disabled', null, user.language),
						},
					});
				}

				throw err;
			} else {
				publishToRedis(`room-${item.rid}`, {
					broadcast: true,
					key: Meteor.userId(),
					funcName: 'notifyUser',
					eventName: 'message',
					value: {
						_id: Random.id(),
						rid: item.rid,
						ts: new Date(),
						msg: TAPi18n.__('StatusMessage_Changed_Successfully', null, user.language),
					},
				});
			}
		});
	}
}

slashCommands.add('status', Status, {
	description: 'Slash_Status_Description',
	params: 'Slash_Status_Params',
});
