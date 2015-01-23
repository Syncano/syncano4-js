function TestSuite(syncano) {
	this.syncano = syncano;
	this.start();
}
TestSuite.prototype = {
	start: function() {
		// this.authWithToken();
		this.authWithPassword();
	},

	authWithPassword: function() {
		this.syncano.authWithPassword(Config.login, Config.password)
			.then(this.onAuthorization.bind(this), this.onError)
			.then(this.onInstanceSet.bind(this), this.onError);
	},

	authWithToken: function() {
		this.syncano.authWithToken(Config.token)
			.then(this.onAuthorization.bind(this), this.onError)
			.then(this.onInstanceSet.bind(this), this.onError);
	},

	onAuthorization: function() {
		return this.syncano.setInstance(Config.instance);
	},

	onInstanceSet: function() {
		console.log('Info:', this.syncano.getInfo());
	},

	onError: function(err) {
		console.error(err);
	}
};

new TestSuite(new Syncano('https://syncanotest1-env.elasticbeanstalk.com/'));