#!/usr/bin/env node

// access token taken from an environment variable
var WebSocketClient = require('websocket').client,
	accessToken = process.env.SIZE_SUBSCRIBER_TOKEN,
	client;

function newClient() {
	client = new WebSocketClient();
	client.on('connect', function(connection) {
		connection.on('error', function(error) {
			console.log('error: '+ error.toString());
		});
		connection.on('close', function() {
			client = newClient();
		});
		connection.on('message', function(message) {
			if (message.type === 'utf8') {
				if (message.utf8Data.indexOf("event") === 0)
					console.log('Received: "' + message.utf8Data + '"');
			}
		});
	});
	client.connect('wss://api.size.io/v1.0/event/subscribe?access_token='+ accessToken);
	return client;
}

client = newClient();

process.on('uncaughtException', function(err) {
	debug(10, 'Uncaught Exception: '+ err);
});
