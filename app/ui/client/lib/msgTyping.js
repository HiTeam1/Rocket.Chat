import { Meteor } from 'meteor/meteor';
import { ReactiveDict } from 'meteor/reactive-dict';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { Tracker } from 'meteor/tracker';
import _ from 'underscore';

import { Notifications } from '../../../notifications';
import { settings } from '../../../settings';
import webSocketHandler, { webSocketConnected } from '/app/ws/client';

const shownName = function(user) {
	if (!user) {
		return;
	}
	if (settings.get('UI_Use_Real_Name')) {
		return user.name;
	}
	return user.username;
};

const timeouts = {};
const timeout = 15000;
const renew = timeout / 3;
const renews = {};
const rooms = {};
const selfTyping = new ReactiveVar(false);
const usersTyping = new ReactiveDict();

const stopTyping = (rid) => Notifications.notifyRoom(rid, 'typing', { username: shownName(Meteor.user()), typing: false });
const typing = (rid) => Notifications.notifyRoom(rid, 'typing', { username: shownName(Meteor.user()), typing: true });
export const MsgTyping = new class {
	constructor() {
		Tracker.autorun(() => {
			const connected = webSocketConnected.get();
			 return Session.get('openedRoom') && this.addStream(Session.get('openedRoom'))
	});
	}

	get selfTyping() { return selfTyping.get(); }

	cancel(rid) {
		if (rooms[rid]) {
			Notifications.unRoom(rid, 'typing', rooms[rid]);
			Object.values(usersTyping.get(rid) || {}).forEach(clearTimeout);
			usersTyping.set(rid);
			delete rooms[rid];
		}
	}

	addStream(rid) {
		if (rooms[rid]) {
			return;
		}
		 const  handleTyping = ({ username, typing })=>  {
			console.log({username,typing});
			
			const user = Meteor.users.findOne(Meteor.userId(), { fields: { name: 1, username: 1 } });
			if (username === shownName(user)) {
				return;
			}
			const users = usersTyping.get(rid) || {};
			if (typing === true) {
				clearTimeout(users[username]);
				users[username] = setTimeout(function() {
					const u = usersTyping.get(rid);
					delete u[username];
					usersTyping.set(rid, u);
				}, timeout);
			} else {
				delete users[username];
			}

			usersTyping.set(rid, users);
		};
		// return webSocketHandler.registerListener('typing', handleTyping);
		return Notifications.onRoom(rid, 'typing', handleTyping);
	}

	stop(rid) {
		selfTyping.set(false);
		if (timeouts[rid]) {
			clearTimeout(timeouts[rid]);
			delete timeouts[rid];
			delete renews[rid];
		}
		return stopTyping(rid);
	}


	start(rid) {
		selfTyping.set(true);

		if (renews[rid]) {
			return;
		}

		renews[rid] = setTimeout(() => delete renews[rid], renew);

		typing(rid);

		if (timeouts[rid]) {
			clearTimeout(timeouts[rid]);
		}

		timeouts[rid] = setTimeout(() => this.stop(rid), timeout);

		return timeouts[rid];
	}


	get(rid) {
		return _.keys(usersTyping.get(rid)) || [];
	}
}();
