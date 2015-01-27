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
		var promise = this.connection.connect(Config.email, Config.password);
		this.proceedWithAuth(promise);
	},

	proceedWithAuth: function(promise) {
		this.showToken('');
		promise.then(function() {
			this.showToken(this.connection.getInfo().account.account_key);
			this.onSuccess();
		}.bind(this), this.onError.bind(this));
	},

	registerAccount: function() {
		this.connection.accountRegister({
			email: this.generateRandomString(6) + '@mindpower.pl',
			password: this.generateRandomString(12),
			first_name: this.generateRandomString(8),
			last_name: this.generateRandomString(8)
		}).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	getAccountInfo: function() {
		this.connection.accountGetInfo().then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	updateAccount: function() {
		this.connection.accountUpdate({
			email: Config.email,
			last_name: this.generateRandomString(10)
		}).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	accountResetKey: function() {
		this.connection.accountResetKey().then(this.onSuccess.bind(this), this.onError.bind(this));
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

	listDataObjectsWithPagination: function() {
		this.connection.listDataObjects('user', {
			limit: 3
		}).then(function(pageList) {
			console.log('First page', pageList);
			if (pageList.hasNextPage()) {
				pageList.loadNextPage().then(function(secondPageList) {
					this.onSuccess(secondPageList);
				}.bind(this), this.onError);
			}
		}.bind(this), this.onError.bind(this));
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
	try {
		test[action]();
	} catch (e) {
		test.onError(e.message);
	}
});



var list = [{
	id: 1,
	name: '1'
}, {
	id: 2,
	name: '2'
}, {
	id: 3,
	name: '3'
}, {
	id: 4,
	name: '4'
}];

var obj = {};
Object.defineProperty(obj, 'data', {
	value: list,
	writable: true,
	enumerable: false,
	configurable: false
});
obj.__defineGetter__('first', function() {
	return obj.data[0];
});