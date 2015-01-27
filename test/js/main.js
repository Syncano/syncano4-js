function TestSuite() {
	this.connection = new Syncano(Config.instance);
}

TestSuite.prototype = {
	showToken: function(token) {
		if (token.length) {
			token = 'token: ' + token;
		} else {
			token = 'not connected';
		}
		document.getElementById('token').innerHTML = token;
	},

	connectToken: function($btn) {
		var promise = this.connection.connect(Config.token);
		this.proceedWithAuth(promise, $btn);
	},

	connectEmail: function($btn) {
		var promise = this.connection.connect(Config.login, Config.password);
		this.proceedWithAuth(promise, $btn);
	},

	proceedWithAuth: function(promise, $btn) {
		this.showToken('');
		promise.then(function() {
			this.showToken(this.connection.getInfo().account.account_key);
			$btn.parent().removeClass().addClass('bg-success');
		}.bind(this), function(err) {
			console.error(err);
			$btn.parent().removeClass().addClass('bg-danger');
		});
	}
};
var test = new TestSuite();



$('a').on('click', function(e) {
	e.preventDefault();
	var $btn = $(e.target);
	var action = $btn.attr('href').substring(1).split('-').map(function(token, idx) {
		return idx === 0 ? token : token.charAt(0).toUpperCase() + token.substring(1);
	}).join('');
	test[action]($btn);
});



/*
function TestSuite() {
	this.connection = new Syncano(Config.instance);
	window.conn = this.connection;
	this.start();
}
TestSuite.prototype = {
	start: function() {
		this.authWithToken();
		// this.authWithPassword();
	},

	authWithPassword: function() {
		var promise = this.connection.connect(Config.login, Config.password);
		this.proceedWithAuth(promise);
	},

	authWithToken: function() {
		var promise = this.connection.connect(Config.token);
		this.proceedWithAuth(promise);
	},

	proceedWithAuth: function(promise) {
		promise
		// .then(this.onAuthorization.bind(this), this.onError)
			.then(this.proceed.bind(this), this.onError);
	},

	onAuthorization: function() {
		return this.connection.setInstance(Config.instance);
	},

	proceed: function() {
		// this.connection.models.Klass.list().then(function(classList) {
		// this.createUsersFromFixtures(classList);
		this.connection.listDataObjects('user', {
			limit: 3
		}).then(function(dataList) {
			console.log('First page', dataList);
			if (dataList.hasNextPage()) {
				dataList.loadNextPage().then(function(res) {
					console.log('Next page', res);
				}.bind(this), this.onError);
			}
		}.bind(this), this.onError);
		// }.bind(this), this.onError);
	},

	createUsersFromFixtures: function(classList) {
		for (var i = 0; i < UserFixtures.length; i++) {
			this.connection.createDataObject(classList.User, UserFixtures[i]).then(function(res) {
				console.log('Created', res.first_name, res.last_name);
			});
		}
	},

	createClass: function() {
		this.connection.createClass({
			name: 'user',
			description: 'class User',
			schema: new Syncano.Schema()
				.addField('first_name', 'string')
				.addField('last_name', 'string').addOrderIndex()
				.addField('year_of_birth', 'integer').addFilterIndex()
		}).then(function(res) {
			console.log(res);
		}, this.onError);
	},

	onError: function(err) {
		console.error(err);
	}
};

var test = new TestSuite();*/