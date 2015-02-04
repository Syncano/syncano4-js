'use strict';

var request = require('request');
var Config = require('./config');
var Syncano = require('../lib/lib.js');

var syncano = new Syncano(Config);
syncano.connect(Config.apiKey).then(function() {
	console.log(syncano.getInfo().account.account_key);
}, function(err) {
	console.log('ERROR: ', err);
});