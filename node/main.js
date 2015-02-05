'use strict';

var Config = {
	instance: 'instance-name',
	// use email and password
	email: 'your-email',
	password: 'your-password',
	// or apiKey
	apiKey: 'api-key'
};

// Config = require('./config');
var Syncano = require('../lib/lib.js');

var syncano = new Syncano(Config.instance);
syncano.connect(Config.email, Config.password).then(function() {
	console.log('Account key:', syncano.getInfo().account.account_key);
}, function(err) {
	console.log('ERROR: ', err);
});