function TestSuite(syncano) {
	this.syncano = syncano;
	this.start();
}
TestSuite.prototype = {
	start: function() {
		this.authWithToken();
		// this.authWithPassword();
	},

	authWithPassword: function() {
		var promise = this.syncano.connect(Config.login, Config.password);
		this.proceed(promise);
	},

	authWithToken: function() {
		var promise = this.syncano.connect(Config.token);
		this.proceed(promise);
	},

	proceed: function(promise) {
		promise
			.then(this.onAuthorization.bind(this), this.onError)
			.then(this.onInstanceSet.bind(this), this.onError);
	},

	onAuthorization: function() {
		return this.syncano.setInstance(Config.instance);
	},

	onInstanceSet: function() {
		this.syncano.getClasses().then(function(res) {
			console.log(res);
		}, this.onError);
	},

	createClass: function() {
		this.syncano.createClass({
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

new TestSuite(new Syncano());