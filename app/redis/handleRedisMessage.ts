import redis from "./redis";

interface IRedisHandlers {
  rocketchat_message?: Function;
  rocketchat_subscription?: Function;
  rocketchat_room?: Function;
  rocketchat_settings?: Function;
  users?: Function;
}

interface IMessage {
  id: string;
  data: any;
  ns: keyof IRedisHandlers;
  diff?: any;
  clientAction: string;
}

export const redisMessageHandlers: IRedisHandlers = {};

redis.on("message", (_channel: string, msg: string) => {
  const message = JSON.parse(msg) as IMessage;
  const handler = redisMessageHandlers[message.ns];

  if (handler) {
    return handler(message);
  }
});
