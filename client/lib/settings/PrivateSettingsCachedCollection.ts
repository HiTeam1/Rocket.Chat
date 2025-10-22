import { CachedCollection } from '../../../app/ui-cached-collection/client';
import { Notifications } from '../../../app/notifications/client';
import webSocketHandler from '/app/ws/client';

export class PrivateSettingsCachedCollection extends CachedCollection {
	constructor() {
		super({
			name: 'private-settings',
			eventType: 'onLogged',
		});
	}

	async setupListener(): Promise<void> {
		// Notifications.onLogged(this.eventName, async (t: string, { _id, ...record }: { _id: string }) => {
		// 	this.log('record received', t, { _id, ...record });
		// 	this.collection.upsert({ _id }, record);
		// 	this.sync();
		// });
		webSocketHandler.emitToServer('private-settings-changed');
		webSocketHandler.registerListener('private-settings-changed', ({ clientAction, _id, ...record }: any) => {
			this.log('record received', clientAction, { _id, ...record });
			this.collection.upsert({ _id }, record);
			this.sync();
		});
	}

	static instance: PrivateSettingsCachedCollection;

	static get(): PrivateSettingsCachedCollection {
		if (!PrivateSettingsCachedCollection.instance) {
			PrivateSettingsCachedCollection.instance = new PrivateSettingsCachedCollection();
		}

		return PrivateSettingsCachedCollection.instance;
	}
}
