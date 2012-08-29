#!/usr/bin/env node

var dgram = require('dgram'),
	util = require('util'),
	net = require('net'),
	tls = require('tls'),
	wsClient = require('websocket').client,
	config = require('./config');

var client,
	sizeConnection,
	connecting = false,
	accessToken = config.access_token,
	udpServer,
	tcpServer,
	redisServer,
	messageQueue = [];

function debug(level, data) {
	if (level >= config.debug_level) {
		util.log( (config.debug_levels[level] || 'SERVER') +' '+ data);
	}
};

function startSizeClient() {
	client = new wsClient(),
	client.on('connectFailed', function(error) {
		console.log('Connect Error: ' + error.toString());
	});
	client.on('connect', function(connection) {
		debug(10, 'Size.IO WebSocket Publisher API is connected');
		sizeConnection = connection,
		connecting = false;
		connection.on('error', function(error) {
			debug(3, 'Received platform error: ' + error.toString());
		});
		connection.on('close', function() {
			debug(1, 'Size.IO platform connection closed');
		});
		connection.on('message', function(message) {
			if (message.type === 'utf8') {
				debug(1, 'Received platform message: "' + message.utf8Data + '"');
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
	client.connect(config.size.publisher.url+'?access_token='+accessToken);
	return client
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
	redisServer = net.createServer(function(socket) {
		socket.on('data', function(data) {
			relayMessage(parseRedisMessage(data));
			socket.write('+OK\r\n');
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
}

function formatMessage(Key, Val) {
	var message;
	if (config.use_local_time)
		message = new Date().getTime() +'|'+ Key +'|'+ Val;
	else
		message = Key +'|'+ Val;
	debug(0, 'Formatted message: "'+ message +'"');
	return message;
}

function relayMessage(msg) {
	if (! msg || msg == "")
		return null;
	try {
		if (sizeConnection && sizeConnection.connected) {
			sizeConnection.sendUTF(msg);
			debug(0, 'Published \''+ msg +'\' to api.size.io');
		} else {
			if (! connecting) {
				connecting = true;
				client = startSizeClient();
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
	var newData = '';
	switch (dataParts[2]) {
		case 'INCR':
			debug(0, 'Redis INCR "'+ dataParts[4] +'"');
			newData = formatMessage(dataParts[4], '1');
			break;
		case 'INCRBY':
			debug(0, 'Redis INCRBY "'+ dataParts[4] +'" by '+ dataParts[6]);
			newData = formatMessage(dataParts[4], dataParts[6]);
			break;
		case 'QUIT':
			debug(0, 'client quitting');
			break;
		case 'PING':
			debug(0, 'ping');
			break;
		default:
			debug(3, 'Unsupported command: '+ dataParts);
			return false;
	}
	return newData;
}

startServers();

process.on('uncaughtException', function(err) {
	debug(10, 'Uncaught Exception: '+ err);
});

