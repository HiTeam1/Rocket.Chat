import { Meteor } from 'meteor/meteor';

import { msgStream } from '../../../app/lib/server';
import { Messages, Users } from '../../../app/models';
import { settings } from '../../../app/settings';

import { MY_MESSAGE } from '.';

import redis from '/app/redis/redis';
import { redisMessageHandlers } from '/app/redis/handleRedisMessage';
import { publishToRedis } from '/app/redis/redisPublisher';


Meteor.startup(function() {
	function publishMessage(type, record) { 
		 
		if (record._hidden !== true && (record.imported == null)) {
			const UI_Use_Real_Name = settings.get('UI_Use_Real_Name') === true;
			if (record.u && record.u._id && UI_Use_Real_Name) {
				const user = Users.findOneById(record.u._id);
				record.u.name = user && user.name;
			}

			if (record.mentions && record.mentions.length && UI_Use_Real_Name) {
				record.mentions.forEach((mention) => {
					const user = Users.findOneById(mention._id);
					mention.name = user && user.name;
				});
			}
			msgStream.mymessage(MY_MESSAGE, record);
			msgStream.emitWithoutBroadcast(record.rid, record);
		}
	}

	const handleMessage = ({clientAction, data, id}) => {
		return;
		switch (clientAction) {
			case 'inserted':
			case 'updated':
				const message = data || Messages.findOne({ _id: id });
				publishMessage(clientAction, message);

				break;
		}
	};




	if (settings.get('Real_Time_Strategy') === 'defalt_oplog') {
		Messages.on('change', function(oplog) {
			handleMessage(oplog);
		});
	} else if (settings.get('Real_Time_Strategy') === 'app_publish_to_redis') {
		console.log('redis on message');
		Messages.on('change', function(oplog) {
			
			const newdata = {
				...oplog,
				ns: 'rocketchat_message', 
			}
			if (oplog.data.rid.length === 34 ) {
				publishToRedis(`user-${oplog.data.rid.slice(0,17)}`, newdata);
				publishToRedis(`user-${oplog.data.rid.slice(17)}`, newdata);
			}
			 publishToRedis(`room-${oplog.data.rid}`, newdata);
		});
	}
	 redisMessageHandlers['rocketchat_message'] = handleMessage;
});
