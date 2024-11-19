import { type IVoipFreeSwitchService, ServiceClassInternal } from '@rocket.chat/core-services';
import type { FreeSwitchExtension, IFreeSwitchChannel, ISetting, SettingValue } from '@rocket.chat/core-typings';
import { getDomain, getUserPassword, getExtensionList, getExtensionDetails, listenToEvents } from '@rocket.chat/freeswitch';
import { FreeSwitchChannel } from '@rocket.chat/models';

export class VoipFreeSwitchService extends ServiceClassInternal implements IVoipFreeSwitchService {
	protected name = 'voip-freeswitch';

	constructor(private getSetting: <T extends SettingValue = SettingValue>(id: ISetting['_id']) => T) {
		super();
		const options = this.getConnectionSettings();
		void listenToEvents((...args) => this.onFreeSwitchEvent(...args), options);
	}

	private getConnectionSettings(): { host: string; port: number; password: string; timeout: number } {
		if (!this.getSetting('VoIP_TeamCollab_Enabled') && !process.env.FREESWITCHIP) {
			throw new Error('VoIP is disabled.');
		}

		const host = process.env.FREESWITCHIP || this.getSetting<string>('VoIP_TeamCollab_FreeSwitch_Host');
		if (!host) {
			throw new Error('VoIP is not properly configured.');
		}

		const port = this.getSetting<number>('VoIP_TeamCollab_FreeSwitch_Port') || 8021;
		const timeout = this.getSetting<number>('VoIP_TeamCollab_FreeSwitch_Timeout') || 3000;
		const password = this.getSetting<string>('VoIP_TeamCollab_FreeSwitch_Password');

		return {
			host,
			port,
			password,
			timeout,
		};
	}

	private async onFreeSwitchEvent(eventName: string, data: Record<string, string | undefined>): Promise<void> {
		const uniqueId = data['Unique-ID'];
		if (!uniqueId) {
			return;
		}
		const filteredData = Object.fromEntries(Object.entries(data).filter(([_, value]) => value !== undefined)) as Record<string, string>;

		await this.registerChannelEvent(uniqueId, eventName, filteredData);
	}

	private async registerChannelEvent(uniqueId: string, eventName: string, eventData: Record<string, string>): Promise<void> {
		const channelData: Partial<IFreeSwitchChannel> = {
			lastEventName: eventName === 'CHANNEL_STATE' ? `CHANNEL_STATE=${eventData['Channel-State']}` : eventName,
			...(eventData['Channel-State'] && { channelState: eventData['Channel-State'] }),
			...(eventData['Other-Leg-Unique-ID'] && { otherLegUniqueId: eventData['Other-Leg-Unique-ID'] }),
			...(eventData['Caller-Username'] && { 'caller.username': eventData['Caller-Username'] }),
			...(eventData['Caller-Context'] && { 'caller.context': eventData['Caller-Context'] }),
		};

		const event = { eventName, data: eventData };

		return FreeSwitchChannel.registerEvent(uniqueId, event, channelData);
	}

	async getDomain(): Promise<string> {
		const options = this.getConnectionSettings();
		return getDomain(options);
	}

	async getUserPassword(user: string): Promise<string> {
		const options = this.getConnectionSettings();
		return getUserPassword(options, user);
	}

	async getExtensionList(): Promise<FreeSwitchExtension[]> {
		const options = this.getConnectionSettings();
		return getExtensionList(options);
	}

	async getExtensionDetails(requestParams: { extension: string; group?: string }): Promise<FreeSwitchExtension> {
		const options = this.getConnectionSettings();
		return getExtensionDetails(options, requestParams);
	}
}
