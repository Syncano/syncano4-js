'use strict';

var Config = {
	instance: 'instance-name',
	// use email and password
	email: 'your-email',
	password: 'your-password',
	// or apiKey
	apiKey: 'api-key'
};

Config = require('./config');
var Syncano = require('../lib/lib.js');

var syncano = new Syncano(Config.instance);
syncano.connect(Config.email, Config.password).then(function() {
	console.log('Account key:', syncano.getInfo().account.account_key);
}, function(err) {
	console.log('ERROR: ', err);
}).then(function() {
	return syncano.Instances.list();
}).then(function(List) {
	console.log('Instances found:', List.length);
	if (List.length > 0) {
		console.log('First instance details:', List.at(0));
	}
})