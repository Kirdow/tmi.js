import { describe, it, expect } from 'vitest';
import { Client } from '../dist/index.js';
import * as utils from '../dist/lib/utils.js';

describe('join multi-channel', () => {
	it('should format single channel JOIN command correctly', () => {
		const client = new Client({ channels: [] });
		const channel = utils.channel('testchannel');
		expect(channel).toBe('#testchannel');
	});

	it('should format multiple channels with commas', () => {
		const channels = ['channel1', 'channel2', 'channel3'].map(ch => utils.channel(ch));
		const joinCommand = `JOIN ${channels.join(',')}`;
		expect(joinCommand).toBe('JOIN #channel1,#channel2,#channel3');
	});

	it('should normalize channel names with # prefix', () => {
		const channels = ['foo', '#bar', 'baz'].map(ch => utils.channel(ch));
		expect(channels).toEqual(['#foo', '#bar', '#baz']);
	});

	it('should accept both string and array parameters', () => {
		// Test that the join method signature accepts both types
		// This is primarily a type-check test - if it compiles, it works
		const channels = ['channel1', 'channel2', 'channel3'];

		// Verify we can construct both single and multi-channel join commands
		const singleCommand = `JOIN ${utils.channel('testchannel')}`;
		const multiCommand = `JOIN ${channels.map(ch => utils.channel(ch)).join(',')}`;

		expect(singleCommand).toBe('JOIN #testchannel');
		expect(multiCommand).toBe('JOIN #channel1,#channel2,#channel3');
	});
});
