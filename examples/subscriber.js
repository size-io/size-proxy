#!/usr/bin/env node

// access token taken from an environment variable
var WebSocketClient = require('websocket').client,
	accessToken = process.env.SIZE_SUBSCRIBER_TOKEN;

var client = new WebSocketClient();
client.on('connect', function(connection) {
	connection.on('message', function(message) {
		if (message.type === 'utf8') {
			console.log("Received: '" + message.utf8Data + "'");
		}
	});
});
client.connect('wss://api.size.io/v1.0/event/subscribe?access_token='+ accessToken);
