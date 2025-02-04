import { publishToRedis } from '/app/redis/redisPublisher';

export class UiInteractionBridge {
	constructor(orch) {
		this.orch = orch;
	}

	async notifyUser(user, interaction, appId) {
		this.orch.debugLog(`The App ${appId} is sending an interaction to user.`);

		const app = this.orch.getManager().getOneById(appId);

		if (!app) {
			throw new Error('Invalid app provided');
		}

		publishToRedis(`user-${user.id}`, {
			broadcast: true,
			key: user.id,
			funcName: 'notifyUserInThisInstance',
			eventName: 'uiInteraction',
			value: interaction,
		});
	}
}
