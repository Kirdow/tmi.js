// Example: Joining multiple channels in a single JOIN command
import { Client } from '../dist/index.js';

const client = new Client({
	identity: {
		username: 'your_username',
		password: 'oauth:your_token'
	},
	channels: []
});

async function main() {
	try {
		await client.connect();
		console.log('Connected to Twitch!');

		// Join a single channel (backwards compatible)
		const single = await client.join('channel1');
		console.log('Joined single channel:', single);
		// Output: Joined single channel: [ '#channel1' ]

		// Join multiple channels in a single JOIN command
		const multiple = await client.join(['channel2', 'channel3', 'channel4']);
		console.log('Joined multiple channels:', multiple);
		// Output: Joined multiple channels: [ '#channel2', '#channel3', '#channel4' ]

		// The IRC command sent to Twitch will be:
		// JOIN #channel2,#channel3,#channel4
	} catch (error) {
		console.error('Error:', error);
	}
}

main();
