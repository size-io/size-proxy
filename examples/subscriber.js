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
			console.log('closed');
			client = newClient();
		});
		connection.on('message', function(data) {
			if (data.type === 'utf8') {
				console.log('Received: '+ data.utf8Data);
				message = JSON.parse(data.utf8Data);
				if (message['error']) {
					console.log('Error event. Closing');
					process.exit(1);
				}
			}
		});
	});
	client.connect('ws://localhost:8080/v1.0/event/subscribe/api*,foo*?access_token='+ accessToken);
	return client;
}

client = newClient();

process.on('uncaughtException', function(err) {
	debug(10, 'Uncaught Exception: '+ err);
});
