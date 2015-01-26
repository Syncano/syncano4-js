function TestSuite() {
	this.connection = new Syncano(Config.instance);
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
		this.connection.getClasses().then(function(res) {
			console.log(res);
		}, this.onError);
	},

	createClass: function() {
		this.connection.createClass({
			name: 'User1',
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

new TestSuite();