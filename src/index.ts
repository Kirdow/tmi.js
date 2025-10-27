import Client from './lib/Client.js';

// Export the Client class
export { Client };
export { Client as client };
export default { Client, client: Client };

// Re-export all types
export type {
	ChannelName,
	OutgoingTags,
	ClientOptions,
	BadgeInfo,
	Badges,
	GlobalUserstate,
	Userstate,
	DeleteUserstate,
	ChatUserstate,
	SubGiftUserstate,
	SubUserstate,
	AnonSubGiftUserstate,
	SubMysteryGiftUserstate,
	PrimePaidUpgradeUserstate,
	GiftPaidUpgradeUserstate,
	RaidUserstate,
	RitualUserstate,
	BitsBadgeTierUserstate
} from './types.js';

// Export the Options namespace
export { Options } from './types.js';

// Re-export Logger type
export type { LogLevel } from './lib/Logger.js';
