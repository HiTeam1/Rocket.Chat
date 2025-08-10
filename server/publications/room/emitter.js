import { Rooms, Subscriptions } from "../../../app/models";
import { Notifications } from "../../../app/notifications";
import { emitRoomDataEvent } from "../../stream/rooms";

import { fields } from ".";

import { redisMessageHandlers } from "/app/redis/handleRedisMessage";
import { publishToRedis } from "/app/redis/redisPublisher";
import { settings } from "/app/settings/server";

const getSubscriptions = (id) => {
	const fields = { "u._id": 1 };
	return Subscriptions.trashFind({ rid: id }, { fields });
};

const handleRoom = ({ clientAction, data, id }) => {
	switch (clientAction) {
		case "updated":
		case "inserted":
			// Override data cuz we do not publish all fields
			data = data || Rooms.findOneById(id, { fields });
			break;

		case "removed":
			data = { _id: id };
			break;
	}

	if (!data) {
		return;
	}
	if (clientAction === "removed") {
		getSubscriptions(id).forEach(({ u }) => {
			Notifications.notifyUserInThisInstance(
				u._id,
				"rooms-changed",
				clientAction,
				data
			);
		});
	}

	Notifications.streamUser.__emit(id, clientAction, data);

	emitRoomDataEvent(id, data);
};

if (settings.get('Real_Time_Strategy') === 'defalt_oplog') {
	Rooms.on("change", (oplog) => {
		handleRoom(oplog);
	});
} else  if (settings.get('Real_Time_Strategy') === 'app_publish_to_redis'){
	Rooms.on("change", (oplog) => {
		const newdata = {
			...oplog,
			ns: "rocketchat_room",
		};
		if (oplog.id.length === 34) {
			publishToRedis(`user-${oplog.id.slice(0, 17)}`, newdata);
			publishToRedis(`user-${oplog.id.slice(17)}`, newdata);
		}
		publishToRedis(`room-${oplog.id}`, newdata);
	});
}

redisMessageHandlers.rocketchat_room = handleRoom;
