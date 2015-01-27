function TestSuite() {
	this.$lastClickedButton = null;
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

	connectToken: function() {
		var promise = this.connection.connect(Config.token);
		this.proceedWithAuth(promise);
	},

	connectEmail: function() {
		var promise = this.connection.connect(Config.login, Config.password);
		this.proceedWithAuth(promise);
	},

	proceedWithAuth: function(promise) {
		this.showToken('');
		promise.then(function() {
			this.showToken(this.connection.getInfo().account.account_key);
			this.onSuccess();
		}.bind(this), this.onError.bind(this));
	},

	createClass: function() {
		this.connection.createClass({
			name: this.generateRandomString(),
			description: 'class description',
			schema: new Syncano.Schema()
				.addField('first_name', 'string')
				.addField('last_name', 'string').addOrderIndex()
				.addField('year_of_birth', 'integer').addFilterIndex()
		}).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	listClasses: function() {
		this.connection.listClasses().then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	listDataObjects: function() {
		this.connection.listDataObjects('user').then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	generateRandomString: function(len) {
		len = parseInt(len / 2, 10) || 5;
		var lettersA = 'wrtplkjhgfdszcbnm'.split('');
		var lettersB = 'euioa'.split('');
		var s = '';
		for (var i = 0; i < len; i++) {
			s += lettersA[parseInt(Math.random() * lettersA.length, 10)];
			s += lettersB[parseInt(Math.random() * lettersB.length, 10)];
		}
		return s;
	},

	onSuccess: function(result) {
		console.log(result);
		this.$lastClickedButton.removeClass('error').addClass('success');
	},

	onError: function(err) {
		console.error(err);
		this.$lastClickedButton.removeClass('success').addClass('error');
	}
};
var test = new TestSuite();


$('a').on('click', function(e) {
	e.preventDefault();
	var $btn = $(e.target);
	var action = $btn.attr('href').substring(1).split('-').map(function(token, idx) {
		return idx === 0 ? token : token.charAt(0).toUpperCase() + token.substring(1);
	}).join('');
	test.$lastClickedButton = $btn;
	test[action]();
});



/*
TestSuite.prototype = {
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
};
*/