import type { LogLevel } from './lib/Logger.js';

export type ChannelName = `#${string}`;

export interface OutgoingTags extends Record<string, string | undefined> {
	'client-nonce'?: string;
	'reply-parent-msg-id'?: string;
}

export namespace Options {
	export interface Options {
		/**
		 * Automatically set the log level to "info", otherwise it's set to
		 * "error". Defaults to false.
		 * @default false
		 */
		debug?: boolean;
		/**
		 * A channel name to use for the global userstate as well as the channel
		 * some commands will use when they don't need to target a particular
		 * one (e.g. color and whisper). Defaults to "#tmijs".
		 * @default "#tmijs"
		 */
		globalDefaultChannel?: string;
		/**
		 * Enable to not add the "twitch.tv/membership" capability to the
		 * capabilities list when registering with Twitch. This disables the
		 * "JOIN" and "PART" event data for other users as Twitch won't send
		 * those commands. This can limit the data you receive to a minimum if
		 * you don't need it. Defaults to false.
		 * @default false
		 */
		skipMembership?: boolean;
		/**
		 * Controls the rate at which the client will send the "JOIN" commands
		 * to join the channels list in milliseconds. Calling `join` at the same
		 * time can an issue with the Twitch rate limiting. The minimum value is
		 * 300.
		 * @default 2000
		 */
		joinInterval?: number;
		/**
		 * Decide the log level for chat messages. Defaults to "info".
		 * @default "info"
		 */
		messagesLogLevel?: LogLevel;
		/**
		 * Client ID for API requests (deprecated).
		 */
		clientId?: string | null;
	}

	export interface Connection {
		/**
		 * The hostname of the Twitch IRC server.
		 * @default "irc-ws.chat.twitch.tv"
		 */
		server?: string;
		/**
		 * The port of the Twitch IRC server. A value of 443 will imply that the
		 * secure option is set to true and vice versa.
		 * @default 443
		 */
		port?: number;
		/**
		 * Whether to use a secure connection. A value of true will imply that
		 * the port is set to 443 and vice versa.
		 * @default true
		 */
		secure?: boolean;
		/**
		 * HTTP agent for the WebSocket connection.
		 */
		agent?: any;
		/**
		 * Should the client attempt to reconnect if the connection is lost.
		 * @default true
		 */
		reconnect?: boolean;
		/**
		 * A multiplier for the amount of time to wait before attempting to
		 * reconnect.
		 * @default 1.5
		 */
		reconnectDecay?: number;
		/**
		 * The base amount of time to wait before attempting to reconnect.
		 * @default 1000
		 */
		reconnectInterval?: number;
		/**
		 * The maximum amount of time to wait before attempting to reconnect.
		 * @default 30000
		 */
		maxReconnectInterval?: number;
		/**
		 * The maximum number of reconnect attempts before the client gives up.
		 * @default Infinity
		 */
		maxReconnectAttempts?: number;
		/**
		 * The amount of time to wait before timing out a connection attempt.
		 * @default 9999
		 */
		timeout?: number;
	}

	export interface Identity {
		/**
		 * The username of the client.
		 */
		username?: string;
		/**
		 * The password of the client. Does not need to be prefixed with the
		 * "oauth:" prefix.
		 */
		password?: string | Promise<string> | (() => string | Promise<string>);
	}

	export type Channels = string[];
}

export interface ClientOptions {
	/**
	 * General options for the client.
	 */
	options?: Partial<Options.Options>;
	/**
	 * Options for the WebSocket connection.
	 */
	connection?: Partial<Options.Connection>;
	/**
	 * Options for the client's identity.
	 */
	identity?: Options.Identity;
	/**
	 * A list of channels to join upon connecting.
	 */
	channels?: Options.Channels;
	/**
	 * Custom logger instance.
	 */
	logger?: any;
}

export interface BadgeInfo {
	subscriber?: string;
	[key: string]: string | undefined;
}

export interface Badges {
	broadcaster?: string;
	moderator?: string;
	subscriber?: string;
	staff?: string;
	turbo?: string;
	[key: string]: string | undefined;
}

/**
 * @see https://dev.twitch.tv/docs/irc/tags/#globaluserstate-tags
 */
export interface GlobalUserstate {
	'badge-info': BadgeInfo | null;
	badges: Badges | null;
	/**
	 * The client user's color in hexadecimal format.
	 */
	color: string;
	'display-name': string;
	/**
	 * A comma-separated list of emote sets the client user has access to. A
	 * list of emotes in each set can be obtained by calling the Helix API.
	 * @see https://dev.twitch.tv/docs/api/reference#get-emote-sets
	 */
	'emote-sets': string;
	'user-id': string;
	'user-type': 'admin' | 'global_mod' | 'staff' | null;
	'badge-info-raw': string | null;
	'badges-raw': string | null;
}

/**
 * @see https://dev.twitch.tv/docs/irc/tags#userstate-tags
 */
export interface Userstate extends Omit<GlobalUserstate, 'user-id'> {
	mod: boolean;
	subscriber: boolean;
	username: string;
}

export interface DeleteUserstate {
	login?: string;
	message?: string;
	'target-msg-id'?: string;
}

export interface ChatUserstate extends GlobalUserstate {
	id: string;
	mod: boolean;
	subscriber: boolean;
	turbo: boolean;
	'room-id': string;
	'user-id': string;
	username: string;
    'first-chat'?: boolean;
    'returning-chatter'?: boolean;
	'message-type': 'chat' | 'action' | 'whisper';
}

export interface SubGiftUserstate extends Userstate {
	'msg-id': string;
	'msg-param-months': string;
	'msg-param-recipient-display-name': string;
	'msg-param-recipient-id': string;
	'msg-param-recipient-user-name': string;
	'msg-param-sender-count': string;
	'msg-param-sub-plan-name': string;
	'msg-param-sub-plan': string;
}

export interface SubUserstate extends Userstate {
	'msg-id': string;
	'msg-param-cumulative-months': string;
	'msg-param-months': string;
	'msg-param-should-share-streak': string;
	'msg-param-streak-months': string;
	'msg-param-sub-plan-name': string;
	'msg-param-sub-plan': string;
}

export interface AnonSubGiftUserstate extends Userstate {
	'msg-id': string;
}

export interface SubMysteryGiftUserstate extends Userstate {
	'msg-id': string;
	'msg-param-mass-gift-count': string;
	'msg-param-origin-id': string;
	'msg-param-sender-count': string;
	'msg-param-sub-plan': string;
}

export interface PrimePaidUpgradeUserstate extends Userstate {
	'msg-id': string;
	'msg-param-sub-plan': string;
}

export interface GiftPaidUpgradeUserstate extends Userstate {
	'msg-id': string;
	'msg-param-sender-login': string;
	'msg-param-sender-name': string;
}

export interface RaidUserstate extends Userstate {
	'msg-id': string;
	'msg-param-displayName': string;
	'msg-param-login': string;
	'msg-param-viewerCount': string;
}

export interface RitualUserstate extends Userstate {
	'msg-id': string;
	'msg-param-ritual-name': string;
}

export interface BitsBadgeTierUserstate extends Userstate {
	'msg-id': string;
	'msg-param-threshold': string;
}
