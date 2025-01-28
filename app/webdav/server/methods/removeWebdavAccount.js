import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { WebdavAccounts } from '../../../models';
import { publishToRedis } from '/app/redis/redisPublisher';

Meteor.methods({
	removeWebdavAccount(accountId) {
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid User', { method: 'removeWebdavAccount' });
		}

		check(accountId, String);

		const removed = WebdavAccounts.removeByUserAndId(accountId, Meteor.userId());
		if (removed) {
			publishToRedis(`user-${Meteor.userId()}`, {
				broadcast: true,
				key: Meteor.userId(),
				funcName: 'notifyUser',
				eventName: 'webdav',
				value: {
					type: 'removed',
					account: { _id: accountId },
				},
			});
		}

		return removed;
	},
});
