#!/usr/bin/env node

/*
   This file is provided to you under the Apache License,
   Version 2.0 (the "License"); you may not use this file
   except in compliance with the License.  You may obtain
   a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing,
   software distributed under the License is distributed on an
   "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
   KIND, either express or implied.  See the License for the
   specific language governing permissions and limitations
   under the License.
*/

var dgram = require('dgram'),
	util = require('util'),
	net = require('net'),
	tls = require('tls'),
	wsClient = require('websocket').client,
	config = require('./config');

var publisher,
	publisherConnection,
	publisherConnecting = false,
	publisherAccessToken = config.publisher_access_token,
	subscriber,
	subscriberConnection,
	subscriberConnecting = false,
	subscriberAccessToken = config.subscriber_access_token,
	udpServer,
	tcpServer,
	redisServer,
	messageQueue = [];

function debug(level, data) {
	if (level >= config.debug_level) {
		util.log( (config.debug_levels[level] || 'SERVER') +' '+ data);
	}
};

function startPublisherClient() {
	publisher = new wsClient(),
	publisher.on('connectFailed', function(error) {
		console.log('Size.IO Publisher connect Error: ' + error.toString());
	});
	publisher.on('connect', function(connection) {
		debug(10, 'Size.IO WebSocket Publisher API is connected');
		publisherConnection = connection,
		publisherConnecting = false;
		connection.on('error', function(error) {
			debug(3, 'Size.IO publisher error: ' + error.toString());
		});
		connection.on('close', function() {
			debug(1, 'Size.IO publisher connection closed');
		});
		connection.on('message', function(message) {
			if (message.type === 'utf8') {
				debug(1, 'Size.IO publisher message: "' + message.utf8Data + '"');
			}
		});
		function processQueue() {
			if (connection.connected) {
				if (messageQueue.length == 0) {
					setTimeout(processQueue, 100);
				} else {
					var message = messageQueue.splice(0,1);
					debug(1, 'Processing queued message: "'+ message[0] +'"');
					connection.sendUTF(message[0]);
					processQueue();
				}
			}
		}
		processQueue();
	});
	publisher.connect(config.size.publisher.url+'?access_token='+publisherAccessToken);
	return publisher
}

function startSubscriberClient() {
	subscriber = new wsClient(),
	subscriber.on('connectFailed', function(error) {
		console.log('Size.IO Subscriber connect Error: ' + error.toString());
	});
	subscriber.on('connect', function(connection) {
		debug(10, 'Size.IO WebSocket Publisher API is connected');
		subscriberConnection = connection,
		subscriberConnecting = false;
		connection.on('error', function(error) {
			debug(3, 'Size.IO subscriber error: ' + error.toString());
		});
		connection.on('close', function() {
			debug(1, 'Size.IO subscriber connection closed');
		});
		connection.on('message', function(message) {
			if (message.type === 'utf8') {
				debug(0, 'Size.IO subscriber message: "' + message.utf8Data + '"');
			}
		});
		function processQueue() {
			if (connection.connected) {
				if (messageQueue.length == 0) {
					setTimeout(processQueue, 100);
				} else {
					var message = messageQueue.splice(0,1);
					debug(1, 'Processing queued message: "'+ message[0] +'"');
					connection.sendUTF(message[0]);
					processQueue();
				}
			}
		}
		processQueue();
	});
	subscriber.connect(config.size.subscriber.url+'?access_token='+subscriberAccessToken);
	return subscriber
}


function startUDPServer() {
	udpServer = dgram.createSocket('udp4', function(msg, rinfo) {
		debug(0, 'Got UDP message: '+ msg);
		relayMessage(msg);
	});
	udpServer.bind(config.udp.listen_port, config.udp.listen_ip);
	debug(10, 'UDP Proxy bound to udp://'+ (config.udp.listen_ip || '*') +':'+ config.udp.listen_port);
}

function startTCPServer() {
	tcpServer = net.createServer(function(socket) {
		socket.on('data', function(data) {
			relayMessage(data);
		});
	});
	tcpServer.listen(config.tcp.listen_port, config.tcp.listen_ip);
	debug(10, 'TCP Proxy bound to tcp://'+ (config.tcp.listen_ip || '*') +':'+ config.tcp.listen_port);
}

function startRedisServer() {
	var result;
	redisServer = net.createServer(function(socket) {
		socket.on('data', function(data) {
			result = parseRedisMessage(data);
			if (result.length === 2) {
				relayMessage(result[0]);
				socket.write(':'+ result[1] +'\r\n');
			}
		});
	});
	redisServer.listen(config.redis.listen_port, config.redis.listen_ip);
	debug(10, 'Redis Proxy bound to tcp://'+ (config.redis.listen_ip || '*') +':'+ config.redis.listen_port);
}

function startServers() {
	if (! udpServer)
		startUDPServer();
	if (! tcpServer)
		startTCPServer();
	if (! redisServer)
		startRedisServer();
	if (! subscriber)
		subscriber = startSubscriberClient();
}

function formatMessage(key, val) {
	var message;
	if (config.use_local_time)
		message = JSON.stringify({"k":key, "v":val, "t":new Date().getTime()});
	else
		message = JSON.stringify({"k":key, "v":val});
	debug(0, 'Formatted message: "'+ message +'"');
	return message;
}

function relayMessage(msg) {
	if (! msg || msg == "")
		return null;
	try {
		if (publisherConnection && publisherConnection.connected) {
			publisherConnection.sendUTF(msg);
			debug(0, 'Published \''+ msg +'\' to api.size.io');
		} else {
			if (! publisherConnecting) {
				publisherConnecting = true;
				publisher = startPublisherClient();
			}
			messageQueue.push(msg);
			debug(0, 'Queued \''+ msg +'\' to api.size.io');
		}
	} catch (e) {
		debug(0, 'Not connected to Size.IO. Queueing Message for publish: "'+ msg +'"');
		messageQueue.push[msg];
	}
}

function parseRedisMessage(data) {
	var string = data.toString();
	if (string == 'QUIT')
		return null;
	//debug(0, 'Parsing redis data: \''+ string +'\'');
	var dataParts = string.split('\r\n');
	debug(0, 'Got data parts: \''+ dataParts +'\'');

	// Only the commands we care about
	var newData = [];
	if (dataParts[2] === 'INCR') {
		debug(0, 'Redis INCR "'+ dataParts[4] +'"');
		newData = [formatMessage(dataParts[4], '1'), 1];
	} else if (dataParts[2] === 'INCRBY') {
		debug(0, 'Redis INCRBY "'+ dataParts[4] +'" by '+ dataParts[6]);
		newData = [formatMessage(dataParts[4], dataParts[6]), dataParts[6]];
	} else if (dataParts[0].indexOf('SUBSCRIBE') === 0) {
		debug(0, 'Redis '+ dataParts[0]);
		var channels = dataParts[0].replace(/\s+/, " ").substr(10).split(' ');
		debug(0, 'Redis channels: "'+ channels +'"');
	} else if (dataParts[2] === 'QUIT') {
		debug(0, 'client quitting');
	} else if (dataParts[2] === 'PING') {
		debug(0, 'ping');
	} else {
		debug(3, 'Unsupported command: '+ dataParts);
		return false;
	}
	return newData;
}

startServers();

process.on('uncaughtException', function(err) {
	debug(10, 'Uncaught Exception: '+ err);
});

