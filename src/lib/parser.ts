/*
	Copyright (c) 2013-2015, Fionn Kelleher All rights reserved.

	Redistribution and use in source and binary forms, with or without modification,
	are permitted provided that the following conditions are met:

		Redistributions of source code must retain the above copyright notice,
		this list of conditions and the following disclaimer.

		Redistributions in binary form must reproduce the above copyright notice,
		this list of conditions and the following disclaimer in the documentation and/or other materials
		provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
	ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
	WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
	IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
	INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
	(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
	WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
	ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY
	OF SUCH DAMAGE.
*/

import * as utils from './utils.js';

const nonspaceRegex = /\S+/g;

export interface IRCMessage {
	raw: string;
	tags: Record<string, string | boolean>;
	prefix: string | null;
	command: string | null;
	params: string[];
}

export interface ParsedTags extends Record<string, any> {
	[key: string]: any;
}

export interface EmotePositions {
	[emoteId: string]: [number, number][];
}

function parseComplexTag(
	tags: ParsedTags,
	tagKey: string,
	splA = ',',
	splB = '/',
	splC?: string
): ParsedTags {
	const raw = tags[tagKey];

	if (raw === undefined) {
		return tags;
	}

	const tagIsString = typeof raw === 'string';
	tags[`${tagKey}-raw`] = tagIsString ? raw : null;

	if (raw === true) {
		tags[tagKey] = null;
		return tags;
	}

	tags[tagKey] = {};

	if (tagIsString) {
		const spl = raw.split(splA);

		for (let i = 0; i < spl.length; i++) {
			const parts = spl[i].split(splB);
			let val = parts[1];
			if (splC !== undefined && val) {
				tags[tagKey][parts[0]] = val.split(splC);
			} else {
				tags[tagKey][parts[0]] = val || null;
			}
		}
	}
	return tags;
}

// Parse Twitch badges
export const badges = (tags: ParsedTags): ParsedTags =>
	parseComplexTag(tags, 'badges');

// Parse Twitch badge-info
export const badgeInfo = (tags: ParsedTags): ParsedTags =>
	parseComplexTag(tags, 'badge-info');

// Parse Twitch emotes
export const emotes = (tags: ParsedTags): ParsedTags =>
	parseComplexTag(tags, 'emotes', '/', ':', ',');

// Parse regex emotes
export function emoteRegex(msg: string, code: string, id: string, obj: EmotePositions): void {
	nonspaceRegex.lastIndex = 0;
	const regex = new RegExp(`(\\b|^|\\s)${utils.unescapeHtml(code)}(\\b|$|\\s)`);
	let match;

	// Check if emote code matches using RegExp and push it to the object
	while ((match = nonspaceRegex.exec(msg)) !== null) {
		if (regex.test(match[0])) {
			obj[id] = obj[id] || [];
			obj[id].push([ match.index, nonspaceRegex.lastIndex - 1 ]);
		}
	}
}

// Parse string emotes
export function emoteString(msg: string, code: string, id: string, obj: EmotePositions): void {
	nonspaceRegex.lastIndex = 0;
	let match;

	// Check if emote code matches and push it to the object
	while ((match = nonspaceRegex.exec(msg)) !== null) {
		if (match[0] === utils.unescapeHtml(code)) {
			obj[id] = obj[id] || [];
			obj[id].push([ match.index, nonspaceRegex.lastIndex - 1 ]);
		}
	}
}

// Transform the emotes object to a string with the following format
// emote_id:first_index-last_index,another_first-another_last/another_emote_id:first_index-last_index
export function transformEmotes(emotes: EmotePositions): string {
	let transformed = '';

	Object.keys(emotes).forEach(id => {
		transformed = `${transformed}${id}:`;
		emotes[id].forEach(
			index => transformed = `${transformed}${index.join('-')},`
		);
		transformed = `${transformed.slice(0, -1)}/`;
	});
	return transformed.slice(0, -1);
}

export function formTags(tags: Record<string, string> = {}): string | null {
	const result = Object.entries(tags).map(([ k, v ]) => `${utils.escapeIRC(k)}=${utils.escapeIRC(v)}`);
	return !result.length ? null : `@${result.join(';')}`;
}

// Parse Twitch messages
export function msg(data: string): IRCMessage | null {
	const message: IRCMessage = {
		raw: data,
		tags: {},
		prefix: null,
		command: null,
		params: []
	};

	// Position and nextspace are used by the parser as a reference
	let position = 0;
	let nextspace = 0;

	// The first thing we check for is IRCv3.2 message tags.
	// http://ircv3.atheme.org/specification/message-tags-3.2
	if (data.charCodeAt(0) === 64) {
		nextspace = data.indexOf(' ');

		// Malformed IRC message
		if (nextspace === -1) {
			return null;
		}

		// Tags are split by a semi colon
		const rawTags = data.slice(1, nextspace).split(';');

		for (let i = 0; i < rawTags.length; i++) {
			// Tags delimited by an equals sign are key=value tags.
			// If there's no equals, we assign the tag a value of true.
			const tag = rawTags[i];
			const pair = tag.split('=');
			message.tags[pair[0]] = tag.slice(tag.indexOf('=') + 1) || true;
		}

		position = nextspace + 1;
	}

	// Skip any trailing whitespace
	while (data.charCodeAt(position) === 32) {
		position++;
	}

	// Extract the message's prefix if present. Prefixes are prepended with a colon
	if (data.charCodeAt(position) === 58) {
		nextspace = data.indexOf(' ', position);

		// If there's nothing after the prefix, deem this message to be malformed.
		if (nextspace === -1) {
			return null;
		}

		message.prefix = data.slice(position + 1, nextspace);
		position = nextspace + 1;

		// Skip any trailing whitespace
		while (data.charCodeAt(position) === 32) {
			position++;
		}
	}

	nextspace = data.indexOf(' ', position);

	// If there's no more whitespace left, extract everything from the
	// current position to the end of the string as the command
	if (nextspace === -1) {
		if (data.length > position) {
			message.command = data.slice(position);
			return message;
		}
		return null;
	}

	// Else, the command is the current position up to the next space. After
	// that, we expect some parameters.
	message.command = data.slice(position, nextspace);

	position = nextspace + 1;

	// Skip any trailing whitespace
	while (data.charCodeAt(position) === 32) {
		position++;
	}

	while (position < data.length) {
		nextspace = data.indexOf(' ', position);

		// If the character is a colon, we've got a trailing parameter.
		// At this point, there are no extra params, so we push everything
		// from after the colon to the end of the string, to the params array
		// and break out of the loop.
		if (data.charCodeAt(position) === 58) {
			message.params.push(data.slice(position + 1));
			break;
		}

		// If we still have some whitespace.
		if (nextspace !== -1) {
			// Push whatever's between the current position and the next
			// space to the params array.
			message.params.push(data.slice(position, nextspace));
			position = nextspace + 1;

			// Skip any trailing whitespace and continue looping.
			while (data.charCodeAt(position) === 32) {
				position++;
			}

			continue;
		}

		// If we don't have any more whitespace and the param isn't trailing,
		// push everything remaining to the params array.
		if (nextspace === -1) {
			message.params.push(data.slice(position));
			break;
		}
	}
	return message;
}
