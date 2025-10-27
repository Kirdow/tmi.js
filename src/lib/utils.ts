// eslint-disable-next-line no-control-regex
const actionMessageRegex = /^\u0001ACTION ([^\u0001]+)\u0001$/;
const justinFanRegex = /^(justinfan)(\d+$)/;
const unescapeIRCRegex = /\\([sn:r\\])/g;
const escapeIRCRegex = /([ \n;\r\\])/g;
const tokenRegex = /^oauth:/i;
const ircEscapedChars: Record<string, string> = { s: ' ', n: '', ':': ';', r: '' };
const ircUnescapedChars: Record<string, string> = { ' ': 's', '\n': 'n', ';': ':', '\r': 'r' };

// Indirectly use hasOwnProperty
export const hasOwn = <T extends object>(obj: T, key: PropertyKey): boolean =>
	({}).hasOwnProperty.call(obj, key);

// Race a promise against a delay
export const promiseDelay = (time: number): Promise<void> =>
	new Promise(resolve => setTimeout(resolve, time));

// Value is an integer
export const isInteger = (input: unknown): boolean => {
	// Return false if input can't be parsed to number
	if (typeof input !== 'string' && typeof input !== 'number') {
		return false;
	}
	return !isNaN(Math.round(input as number));
};

// Return a random justinfan username
export const justinfan = (): string =>
	`justinfan${Math.floor((Math.random() * 80000) + 1000)}`;

// Username is a justinfan username
export const isJustinfan = (username: string): boolean =>
	justinFanRegex.test(username);

// Return a valid channel name
export const channel = (str: string): string => {
	const channelName = (str ? str : '').toLowerCase();
	return channelName[0] === '#' ? channelName : `#${channelName}`;
};

// Return a valid username
export const username = (str: string): string => {
	const userName = (str ? str : '').toLowerCase();
	return userName[0] === '#' ? userName.slice(1) : userName;
};

// Return a valid token
export const token = (str: string): string =>
	str ? str.replace(tokenRegex, '') : '';

// Return a valid password
export const password = (str: string): string => {
	const tokenStr = token(str);
	return tokenStr ? `oauth:${tokenStr}` : '';
};

export const actionMessage = (msg: string): RegExpMatchArray | null =>
	msg.match(actionMessageRegex);

export const unescapeHtml = (safe: string): string =>
	safe.replace(/\\&amp\\;/g, '&')
		.replace(/\\&lt\\;/g, '<')
		.replace(/\\&gt\\;/g, '>')
		.replace(/\\&quot\\;/g, '"')
		.replace(/\\&#039\\;/g, '\'');

// Escaping values:
// http://ircv3.net/specs/core/message-tags-3.2.html#escaping-values
export const unescapeIRC = (msg: string): string => {
	if (!msg || typeof msg !== 'string' || !msg.includes('\\')) {
		return msg;
	}
	return msg.replace(
		unescapeIRCRegex,
		(_m, p) => p in ircEscapedChars ? ircEscapedChars[p] : p
	);
};

export const escapeIRC = (msg: string): string => {
	if (!msg || typeof msg !== 'string') {
		return msg;
	}
	return msg.replace(
		escapeIRCRegex,
		(_m, p) => p in ircUnescapedChars ? `\\${ircUnescapedChars[p]}` : p
	);
};
