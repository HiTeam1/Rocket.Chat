import { Accounts } from 'meteor/accounts-base';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';

import { Notifications } from '../../../app/notifications/client';

Meteor.startup(() => {
	// Notifications.bindChannels(`badsub`, () => {
	// 	console.log('client Notifications.bindChannels');
	// });
	Tracker.autorun(() => {
		Notifications.bindChannels(`${ Meteor.userId() }/${ Accounts._storedLoginToken() }`, () => {
			console.log('client Notifications.bindChannels');
		});
		Notifications.bindChannels(`${ Meteor.userId() }/${ Accounts._storedLoginToken() }/badSubscription`, () => {
			console.log('bad subscription');
		});
		// Notifications.bindChannels(`badSubscription`, () => {
		// 	console.log('bad subscription');
		// });
	});
});
