'use strict';

var Syncano = require('../../lib/syncano4.js');

var syncano = new Syncano();
syncano.Accounts.create({
	email: 'your-email@domain.com',
	first_name: 'Name',
	last_name: 'LastName',
	password: 'Password'
}).then(function(res) {
	console.log(res);
});