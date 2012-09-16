var fs = require('fs'),
	util = require('util');

// Be sure to change this access token
exports.publisher_access_token = process.env.SIZE_PUBLISHER_TOKEN || '00000000-0000-0000-0000-000000000000';
exports.subscriber_access_token = process.env.SIZE_SUBSCRIBER_TOKEN || '00000000-0000-0000-0000-000000000000';

// Set to true in order to use local server time
// It is recommended to keep this false and let the
// platform manage keeping time in sync
exports.use_local_time = false;

// Setting the IP to null will enable listening on any interface
exports.tcp = {
	'listen_ip': null,
	'listen_port': 6120
};
exports.udp = {
	'listen_ip': null,
	'listen_port': 6125
};
exports.redis = {
	'listen_ip': null,
	'listen_port': 6379
}

// The Size.IO platform API endpoints
exports.size = {
	'publisher': {
		'url': 'wss://api.size.io/v1.0/event/publish'
	},
	'subscriber': {
		'url': 'wss://api.size.io/v1.0/event/subscribe'
	}
}

// Log level default is "info"
exports.debug_levels = ['DEBUG','INFO','WARN','ERROR'];
exports.debug_level = 1;
