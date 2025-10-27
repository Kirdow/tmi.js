import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocketServer } from 'ws';
import { Client } from '../dist/index.js';

const noop = function() {};
const catchConnectError = (err: any) => {
	if (err !== 'Connection closed.') {
		console.error(err);
	}
};

const no_permission = '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 :You don\'t have permission.';
const msg_channel_suspended = '@msg-id=msg_channel_suspended :tmi.twitch.tv NOTICE #local7000 :This channel has been suspended.';

interface TestDefinition {
	command: string;
	inputParams: any[];
	returnedParams: any[];
	serverTest: string;
	serverCommand: string | ((client: any, ws: any) => void);
	errorCommands?: string[];
}

const tests: TestDefinition[] = [ {
	command: 'ban',
	inputParams: [ '#local7000', 'baduser', 'some reason' ],
	returnedParams: [ '#local7000', 'baduser', 'some reason' ],
	serverTest: '/ban',
	serverCommand: '@msg-id=ban_success :tmi.twitch.tv NOTICE #local7000 :baduser',
	errorCommands: [
		'@msg-id=already_banned :tmi.twitch.tv NOTICE #local7000 :baduser',
		'@msg-id=bad_ban_admin :tmi.twitch.tv NOTICE #local7000 :baduser',
		'@msg-id=bad_ban_broadcaster :tmi.twitch.tv NOTICE #local7000 :baduser',
		'@msg-id=bad_ban_global_mod :tmi.twitch.tv NOTICE #local7000 :baduser',
		'@msg-id=bad_ban_self :tmi.twitch.tv NOTICE #local7000 :baduser',
		'@msg-id=bad_ban_staff :tmi.twitch.tv NOTICE #local7000 :baduser',
		'@msg-id=usage_ban :tmi.twitch.tv NOTICE #local7000 :baduser'
	]
}, {
	command: 'clear',
	inputParams: [ '#local7000' ],
	returnedParams: [ '#local7000' ],
	serverTest: '/clear',
	serverCommand: ':tmi.twitch.tv CLEARCHAT',
	errorCommands: [
		'@msg-id=usage_clear :tmi.twitch.tv NOTICE #local7000 :Usage: "/clear" - Clear chat history for all users in this room.',
		no_permission,
		msg_channel_suspended
	]
}, {
	command: 'color',
	inputParams: [ '#c0ffee' ],
	returnedParams: [ '#c0ffee' ],
	serverTest: '/color',
	serverCommand: '@msg-id=color_changed :tmi.twitch.tv NOTICE #local7000 :#c0ffee',
	errorCommands: [
		'@msg-id=turbo_only_color :tmi.twitch.tv NOTICE #local7000 :Turbo colors are not available.',
		'@msg-id=usage_color :tmi.twitch.tv NOTICE #local7000 :Usage: "/color " - Change your username color.'
	]
}, {
	command: 'commercial',
	inputParams: [ '#local7000' ],
	returnedParams: [ '#local7000', 30 ],
	serverTest: '/commercial',
	serverCommand: '@msg-id=commercial_success :tmi.twitch.tv NOTICE #local7000 :30',
	errorCommands: [
		'@msg-id=bad_commercial_error :tmi.twitch.tv NOTICE #local7000 :Failed to start commercial.',
		'@msg-id=usage_commercial :tmi.twitch.tv NOTICE #local7000 :Usage: "/commercial [length]"',
		no_permission,
		msg_channel_suspended
	]
}, {
	command: 'commercial',
	inputParams: [ '#local7000', 60 ],
	returnedParams: [ '#local7000', 60 ],
	serverTest: '/commercial',
	serverCommand: '@msg-id=commercial_success :tmi.twitch.tv NOTICE #local7000 :60'
}, {
	command: 'emoteonly',
	inputParams: [ '#local7000' ],
	returnedParams: [ '#local7000' ],
	serverTest: '/emoteonly',
	serverCommand: '@msg-id=emote_only_on :tmi.twitch.tv NOTICE #local7000',
	errorCommands: [
		'@msg-id=already_emote_only_on :tmi.twitch.tv NOTICE #local7000 :This room is already in emote-only mode.',
		'@msg-id=usage_emote_only_on :tmi.twitch.tv NOTICE #local7000 :Usage: "/emoteonly"',
		no_permission,
		msg_channel_suspended
	]
}, {
	command: 'emoteonlyoff',
	inputParams: [ '#local7000' ],
	returnedParams: [ '#local7000' ],
	serverTest: '/emoteonlyoff',
	serverCommand: '@msg-id=emote_only_off :tmi.twitch.tv NOTICE #local7000',
	errorCommands: [
		'@msg-id=already_emote_only_off :tmi.twitch.tv NOTICE #local7000 :This room is not in emote-only mode.',
		'@msg-id=usage_emote_only_off :tmi.twitch.tv NOTICE #local7000 :Usage: "/emoteonlyoff"',
		no_permission,
		msg_channel_suspended
	]
} ];

describe('commands (justinfan)', () => {
	let server: WebSocketServer;
	let client: any;

	beforeEach(() => {
		// Initialize websocket server
		server = new WebSocketServer({ port: 7000 });
		client = new Client({
			connection: {
				server: 'localhost',
				port: 7000,
				timeout: 1,
				reconnect: false
			}
		});
		client.log.setLevel('fatal');
	});

	afterEach(() => {
		// Shut down websocket server
		server.close();
		client = null;
	});

	it('handles commands when disconnected', async () => {
		try {
			await client.subscribers('local7000');
			throw new Error('Should have failed');
		} catch (err) {
			expect(err).toBe('Not connected to server.');
		}
	});

	it('handles ping', async () => {
		server.on('connection', (ws: any) => {
			ws.on('message', (message: any) => {
				if (~message.indexOf('PING')) {
					ws.send('PONG');
				}
			});
		});

		client.on('logon', async () => {
			const latency = await client.ping();
			expect(latency).toBeTruthy();
			expect(latency[0]).toBeGreaterThanOrEqual(0);
			await client.disconnect();
		});

		await client.connect().catch(catchConnectError);
	});

	it('handles ping timeout', async () => {
		server.on('connection', (ws: any) => {
			ws.on('message', (_message: any) => {
				ws.send('dummy');
			});
		});

		const promise = new Promise<void>((resolve, reject) => {
			client.on('logon', async () => {
				try {
					await client.ping();
					reject(new Error('Should have timed out'));
				} catch (err) {
					expect(err).toBeTruthy();
					resolve();
				}
			});
		});

		client.connect().catch(catchConnectError);
		await promise;
	});

	tests.forEach(test => {
		it(`should handle ${test.command}`, async () => {
			const promise = new Promise<void>((resolve, reject) => {
				server.on('connection', (ws: any) => {
					ws.on('message', (message: any) => {
						// Ensure that the message starts with NICK
						if (!message.indexOf('NICK')) {
							const user = client.getUsername();
							ws.send(`:${user}! JOIN #local7000`);
							return;
						}
						// Otherwise, send the command
						if (~message.indexOf(test.serverTest)) {
							if (typeof test.serverCommand === 'function') {
								test.serverCommand(client, ws);
							} else {
								ws.send(test.serverCommand);
							}
						}
					});
				});

				client.on('logon', async () => {
					try {
						const output = await (client as any)[test.command](...test.inputParams);
						expect(output).toEqual(test.returnedParams);
						await client.disconnect();
						resolve();
					} catch (err) {
						reject(err);
					}
				});
			});

			client.connect().catch(catchConnectError);
			await promise;
		});

		// Test error commands
		if (test.errorCommands) {
			test.errorCommands.forEach((errorCommand, i) => {
				it(`should handle ${test.command} error ${i}`, async () => {
					const promise = new Promise<void>((resolve, reject) => {
						server.on('connection', (ws: any) => {
							ws.on('message', (message: any) => {
								// Ensure that the message starts with NICK
								if (!message.indexOf('NICK')) {
									const user = client.getUsername();
									ws.send(`:${user}! JOIN #local7000`);
									return;
								}
								// Otherwise, send the error command
								if (~message.indexOf(test.serverTest)) {
									ws.send(errorCommand);
								}
							});
						});

						client.on('logon', async () => {
							try {
								await (client as any)[test.command](...test.inputParams);
								reject(new Error('Should have failed'));
							} catch (err) {
								expect(err).toBeTruthy();
								resolve();
							}
						});
					});

					client.connect().catch(catchConnectError);
					await promise;
				});
			});
		}
	});
});
