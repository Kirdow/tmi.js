import ClientBase from './ClientBase.js';
import * as utils from './utils.js';
import type { ChannelName, OutgoingTags } from '../types.js';

// Add commands to ClientBase
export default class Client extends ClientBase {
	action(channel: string, message: string, tags?: OutgoingTags): Promise<[ChannelName, string]> {
		const actionMsg = `\u0001ACTION ${message}\u0001`;
		return this._sendMessage({ channel, message: actionMsg, tags: tags as any }, (res, _rej) =>
			// The message is assumed to be sent and recieved by Twitch. The "client-nonce" tag can be used to
			// detect a response on a USERNOTICE command, but it's not yet implemented here.
			res([ utils.channel(channel) as ChannelName, message ])
		);
	}

	// Announce a message on a channel
	announce(channel: string, message: string): Promise<[ChannelName, string]> {
		return this._sendMessage({ channel, message: `/announce ${message}` }, (res, _rej) => res([ utils.channel(channel) as ChannelName, message ]));
	}

	// Ban username on channel
	ban(channel: string, username: string, reason?: string): Promise<[ChannelName, string, string]> {
		username = utils.username(username);
		reason = reason ?? '';
		return this._sendCommand({ channel, command: `/ban ${username} ${reason}` }, (res, rej) =>
			this.once('_promiseBan', (err: any) => !err ? res([ utils.channel(channel) as ChannelName, username, reason! ]) : rej(err))
		);
	}

	clear(channel: string): Promise<[ChannelName]> {
		return this._sendCommand({ channel, command: '/clear' }, (res, rej) =>
			this.once('_promiseClear', (err: any) => !err ? res([ utils.channel(channel) as ChannelName ]) : rej(err))
		);
	}

	color(newColor: string): Promise<[string]> {
		return this._sendCommand({ channel: this._globalDefaultChannel, command: `/color ${newColor}` }, (res, rej) =>
			this.once('_promiseColor', (err: any) => !err ? res([ newColor ]) : rej(err))
		);
	}

	commercial(channel: string, seconds?: 30 | 60 | 90 | 120 | 150 | 180): Promise<[ChannelName, number]> {
		seconds = seconds ?? 30;
		return this._sendCommand({ channel, command: `/commercial ${seconds}` }, (res, rej) =>
			this.once('_promiseCommercial', (err: any) => !err ? res([ utils.channel(channel) as ChannelName, ~~seconds! ]) : rej(err))
		);
	}

	deletemessage(channel: string, messageUUID: string): Promise<[ChannelName]> {
		return this._sendCommand({ channel, command: `/delete ${messageUUID}` }, (res, rej) =>
			this.once('_promiseDeletemessage', (err: any) => !err ? res([ utils.channel(channel) as ChannelName ]) : rej(err))
		);
	}

	emoteonly(channel: string): Promise<[ChannelName]> {
		return this._sendCommand({ channel, command: '/emoteonly' }, (res, rej) =>
			this.once('_promiseEmoteonly', (err: any) => !err ? res([ utils.channel(channel) as ChannelName ]) : rej(err))
		);
	}

	emoteonlyoff(channel: string): Promise<[ChannelName]> {
		return this._sendCommand({ channel, command: '/emoteonlyoff' }, (res, rej) =>
			this.once('_promiseEmoteonlyoff', (err: any) => !err ? res([ utils.channel(channel) as ChannelName ]) : rej(err))
		);
	}

	followersonly(channel: string, minutes?: number): Promise<[ChannelName, number]> {
		minutes = minutes ?? 30;
		return this._sendCommand({ channel, command: `/followers ${minutes}` }, (res, rej) =>
			this.once('_promiseFollowers', (err: any) => !err ? res([ utils.channel(channel) as ChannelName, ~~minutes! ]) : rej(err))
		);
	}

	followersonlyoff(channel: string): Promise<[ChannelName]> {
		return this._sendCommand({ channel, command: '/followersoff' }, (res, rej) =>
			this.once('_promiseFollowersoff', (err: any) => !err ? res([ utils.channel(channel) as ChannelName ]) : rej(err))
		);
	}

	host(channel: string, target: string): Promise<[ChannelName, string, number]> {
		target = utils.username(target);
		return this._sendCommand({ delay: 2000, channel, command: `/host ${target}` }, (res, rej) =>
			this.once('_promiseHost', (err: any, remaining: number) => !err ? res([ utils.channel(channel) as ChannelName, target, ~~remaining ]) : rej(err))
		);
	}

	override join(channel: string | string[]): Promise<[ChannelName] | ChannelName[]> {
		// Handle both single channel and array of channels
		const channels = Array.isArray(channel) ? channel : [channel];
		const normalizedChannels = channels.map(ch => utils.channel(ch));
		const joinCommand = `JOIN ${normalizedChannels.join(',')}`;

		return this._sendCommand({ delay: undefined, channel: undefined, command: joinCommand }, (res, rej) => {
			const eventName = '_promiseJoin';
			let hasFulfilled = false;

			// Track which channels have joined successfully
			const joinedChannels = new Set<string>();
			const expectedChannels = new Set(normalizedChannels);

			const listener = (err: any, joinedChannel: string) => {
				const normalizedJoinedChannel = utils.channel(joinedChannel);

				// Check if this is one of our target channels
				if (expectedChannels.has(normalizedJoinedChannel)) {
					if (err) {
						// If any channel fails to join, reject the promise
						this.removeListener(eventName, listener);
						hasFulfilled = true;
						rej(err);
						return;
					}

					// Mark this channel as joined
					joinedChannels.add(normalizedJoinedChannel);

					// Check if all channels have joined
					if (joinedChannels.size === expectedChannels.size) {
						this.removeListener(eventName, listener);
						hasFulfilled = true;

						// Return array if multiple channels, single element array if one channel
						const result = Array.from(joinedChannels) as ChannelName[];
						res(Array.isArray(channel) ? result : [result[0]]);
					}
				}
			};

			this.on(eventName, listener);

			// Race the Promise against a delay (multiply by number of channels for multiple joins)
			const delay = this._getPromiseDelay() * normalizedChannels.length;
			utils.promiseDelay(delay).then(() => {
				if (!hasFulfilled) {
					this.removeListener(eventName, listener);
					// Report which channels failed to join
					const failedChannels = normalizedChannels.filter(ch => !joinedChannels.has(ch));
					const errorMsg = failedChannels.length === normalizedChannels.length
						? `No response from Twitch for any channels.`
						: `No response from Twitch for channels: ${failedChannels.join(', ')}`;
					this.emit(eventName, errorMsg, failedChannels[0] || normalizedChannels[0]);
				}
			});
		});
	}

	mod(channel: string, username: string): Promise<[ChannelName, string]> {
		username = utils.username(username);
		return this._sendCommand({ channel, command: `/mod ${username}` }, (res, rej) =>
			this.once('_promiseMod', (err: any) => !err ? res([ utils.channel(channel) as ChannelName, username ]) : rej(err))
		);
	}

	// Get list of mods on a channel
	mods(channel: string): Promise<string[]> {
		const chan = utils.channel(channel) as ChannelName;
		return this._sendCommand({ channel, command: '/mods' }, (resolve, reject) => {
			this.once('_promiseMods', (err: any, mods: string[]) => {
				if (!err) {
					// Update the internal list of moderators
					mods.forEach(username => {
						if (!this.moderators[chan]) {
							this.moderators[chan] = [];
						}
						if (!this.moderators[chan].includes(username)) {
							this.moderators[chan].push(username);
						}
					});
					resolve(mods);
				} else {
					reject(err);
				}
			});
		});
	}

	part(channel: string): Promise<[ChannelName]> {
		return this._sendCommand({ delay: null, channel: undefined, command: `PART ${channel}` }, (res, rej) =>
			this.once('_promisePart', (err: any) => !err ? res([ utils.channel(channel) as ChannelName ]) : rej(err))
		);
	}

	ping(): Promise<[number]> {
		return this._sendCommand({ delay: null, command: 'PING' }, (res, _rej) => {
			// Update the internal ping timeout check interval
			this.latency = new Date();
			this.pingTimeout = setTimeout(() => {
				if (this.ws !== null) {
					this.wasCloseCalled = false;
					this.log.error('Ping timeout.');
					this.ws.close();

					clearInterval(this.pingLoop!);
					clearTimeout(this.pingTimeout!);
				}
			}, this.opts.connection?.timeout ?? 9999);
			this.once('_promisePing', (latency: string) => res([ parseFloat(latency) ]));
		});
	}

	r9kbeta(channel: string): Promise<[ChannelName]> {
		return this._sendCommand({ channel, command: '/r9kbeta' }, (res, rej) =>
			this.once('_promiseR9kbeta', (err: any) => !err ? res([ utils.channel(channel) as ChannelName ]) : rej(err))
		);
	}

	r9kbetaoff(channel: string): Promise<[ChannelName]> {
		return this._sendCommand({ channel, command: '/r9kbetaoff' }, (res, rej) =>
			this.once('_promiseR9kbetaoff', (err: any) => !err ? res([ utils.channel(channel) as ChannelName ]) : rej(err))
		);
	}

	raw(command: string, tags?: Record<string, string>): Promise<[string]> {
		return this._sendCommand({ channel: undefined, command, tags }, (res, _rej) => res([ command ]));
	}

	reply(channel: string, message: string, replyParentMsgId: string | { id: string }, tags: OutgoingTags = {}): Promise<[ChannelName, string]> {
		if (typeof replyParentMsgId === 'object') {
			replyParentMsgId = replyParentMsgId.id;
		}
		if (!replyParentMsgId || typeof replyParentMsgId !== 'string') {
			throw new Error('replyParentMsgId is required.');
		}
		return this.say(channel, message, { ...tags, 'reply-parent-msg-id': replyParentMsgId });
	}

	say(channel: string, message: string, tags?: OutgoingTags): Promise<[ChannelName, string]> {
		channel = utils.channel(channel);
		if ((message.startsWith('.') && !message.startsWith('..')) || message.startsWith('/') || message.startsWith('\\')) {
			// Check if the message is an action message
			if (message.slice(1, 4) === 'me ') {
				return this.action(channel, message.slice(4));
			} else {
				return this._sendCommand({ channel, command: message, tags: tags as any }, (res, _rej) =>
					// The message is assumed to be sent and recieved by Twitch. The "client-nonce" tag can be used to
					// detect a response on a USERNOTICE command, but it's not yet implemented here.
					res([ channel as ChannelName, message ])
				);
			}
		}
		return this._sendMessage({ channel, message, tags: tags as any }, (res, _rej) =>
			// The message is assumed to be sent and recieved by Twitch. The "client-nonce" tag can be used to
			// detect a response on a USERNOTICE command, but it's not yet implemented here.
			res([ channel as ChannelName, message ])
		);
	}

	slow(channel: string, seconds?: number): Promise<[ChannelName, number]> {
		seconds = seconds ?? 300;
		return this._sendCommand({ channel, command: `/slow ${seconds}` }, (res, rej) =>
			this.once('_promiseSlow', (err: any) => !err ? res([ utils.channel(channel) as ChannelName, ~~seconds! ]) : rej(err))
		);
	}

	slowoff(channel: string): Promise<[ChannelName]> {
		return this._sendCommand({ channel, command: '/slowoff' }, (res, rej) =>
			this.once('_promiseSlowoff', (err: any) => !err ? res([ utils.channel(channel) as ChannelName ]) : rej(err))
		);
	}

	subscribers(channel: string): Promise<[ChannelName]> {
		return this._sendCommand({ channel, command: '/subscribers' }, (res, rej) =>
			this.once('_promiseSubscribers', (err: any) => !err ? res([ utils.channel(channel) as ChannelName ]) : rej(err))
		);
	}

	subscribersoff(channel: string): Promise<[ChannelName]> {
		return this._sendCommand({ channel, command: '/subscribersoff' }, (res, rej) =>
			this.once('_promiseSubscribersoff', (err: any) => !err ? res([ utils.channel(channel) as ChannelName ]) : rej(err))
		);
	}

	timeout(channel: string, username: string, seconds?: number | string, reason?: string): Promise<[ChannelName, string, number, string]> {
		username = utils.username(username);

		if ((seconds ?? false) && !utils.isInteger(seconds)) {
			reason = seconds as string;
			seconds = 300;
		}

		seconds = (seconds ?? 300) as number;
		reason = reason ?? '';
		return this._sendCommand({ channel, command: `/timeout ${username} ${seconds} ${reason}` }, (res, rej) =>
			this.once('_promiseTimeout', (err: any) => !err ? res([ utils.channel(channel) as ChannelName, username, ~~seconds!, reason! ]) : rej(err))
		);
	}

	unban(channel: string, username: string): Promise<[ChannelName, string]> {
		username = utils.username(username);
		return this._sendCommand({ channel, command: `/unban ${username}` }, (res, rej) =>
			this.once('_promiseUnban', (err: any) => !err ? res([ utils.channel(channel) as ChannelName, username ]) : rej(err))
		);
	}

	// End the current hosting
	unhost(channel: string): Promise<[ChannelName]> {
		return this._sendCommand({ delay: 2000, channel, command: '/unhost' }, (res, rej) =>
			this.once('_promiseUnhost', (err: any) => !err ? res([ utils.channel(channel) as ChannelName ]) : rej(err))
		);
	}

	unmod(channel: string, username: string): Promise<[ChannelName, string]> {
		username = utils.username(username);
		return this._sendCommand({ channel, command: `/unmod ${username}` }, (res, rej) =>
			this.once('_promiseUnmod', (err: any) => !err ? res([ utils.channel(channel) as ChannelName, username ]) : rej(err))
		);
	}

	unvip(channel: string, username: string): Promise<[ChannelName, string]> {
		username = utils.username(username);
		return this._sendCommand({ channel, command: `/unvip ${username}` }, (res, rej) =>
			this.once('_promiseUnvip', (err: any) => !err ? res([ utils.channel(channel) as ChannelName, username ]) : rej(err))
		);
	}

	vip(channel: string, username: string): Promise<[ChannelName, string]> {
		username = utils.username(username);
		return this._sendCommand({ channel, command: `/vip ${username}` }, (res, rej) =>
			this.once('_promiseVip', (err: any) => !err ? res([ utils.channel(channel) as ChannelName, username ]) : rej(err))
		);
	}

	vips(channel: string): Promise<string[]> {
		return this._sendCommand({ channel, command: '/vips' }, (res, rej) =>
			this.once('_promiseVips', (err: any, vips: string[]) => !err ? res(vips) : rej(err))
		);
	}

	whisper(username: string, message: string): Promise<[string, string]> {
		username = utils.username(username);

		// The server will not send a whisper to the account that sent it.
		if (username === this.getUsername()) {
			return Promise.reject('Cannot send a whisper to the same account.');
		}
		return this._sendCommand({ delay: null, channel: this._globalDefaultChannel, command: `/w ${username} ${message}` }, (_res, rej) =>
			this.once('_promiseWhisper', (err: any) => err && rej(err))
		).catch(err => {
			// Either an "actual" error occured or the timeout triggered
			// the latter means no errors have occured and we can resolve
			// else just elevate the error
			if (err && typeof err === 'string' && err.indexOf('No response from Twitch.') !== 0) {
				throw err;
			}
			const from = utils.channel(username) as ChannelName;
			const userstate = Object.assign({
				'message-type': 'whisper',
				'message-id': null,
				'thread-id': null,
				username: this.getUsername()
			}, this.globaluserstate);

			// Emit for both, whisper and message
			this.emits([ 'whisper', 'message' ], [
				[ from, userstate, message, true ]
			]);
			return [ username, message ];
		});
	}

	// Aliases
	followersmode = this.followersonly;
	followersmodeoff = this.followersonlyoff;
	leave = this.part;
	slowmode = this.slow;
	r9kmode = this.r9kbeta;
	uniquechat = this.r9kbeta;
	r9kmodeoff = this.r9kbetaoff;
	uniquechatoff = this.r9kbeta;
	slowmodeoff = this.slowoff;
}
