import { usePermission } from '@rocket.chat/ui-contexts';
import { lazy, useMemo } from 'react';

import { useRoom } from '../../views/room/contexts/RoomContext';
import type { RoomToolboxActionConfig } from '../../views/room/contexts/RoomToolboxContext';

const ExportMessages = lazy(() => import('../../views/room/contextualBar/ExportMessages'));
const ExportE2EEMessages = lazy(() => import('../../views/room/contextualBar/ExportMessages/ExportE2EEMessages'));

export const useExportMessagesRoomAction = () => {
	const room = useRoom();
	const hasPermission = usePermission('mail-messages', room._id);

	return useMemo((): RoomToolboxActionConfig | null => {
		if (!hasPermission) {
			return null;
		}

		if (room.encrypted) {
			return {
				id: 'export-encrypted-messages',
				groups: ['channel', 'group', 'direct', 'direct_multiple', 'team'],
				anonymous: true,
				title: 'Export_Encrypted_Messages',
				icon: 'mail',
				tabComponent: ExportE2EEMessages,
				full: true,
				order: 12,
				type: 'communication',
			};
		}

		return {
			id: 'export-messages',
			groups: ['channel', 'group', 'direct', 'direct_multiple', 'team'],
			anonymous: true,
			title: 'Export_Messages',
			icon: 'mail',
			tabComponent: ExportMessages,
			full: true,
			order: 12,
			type: 'communication',
		};
	}, [hasPermission, room.encrypted]);
};
