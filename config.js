var fs = require('fs'),
	util = require('util');

// This is the Demo account; change the access token
exports.access_token = '06a4a902-36b5-5682-8525-a86bd40cb7e8'

// Set to true in order to use local server time
// It is recommended to keep this false and let the
// platform manage keeping time in sync
exports.use_local_time = true;

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
