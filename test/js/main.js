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
		var password = this.generateRandomString(6);
		var email = this.generateRandomString(6) + '@mindpower.pl';
		console.info(email, password);
		this.connection.Accounts.create({
			email: email,
			password: password,
			first_name: this.generateRandomString(8),
			last_name: this.generateRandomString(8)
		}).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	getAccountInfo: function() {
		this.connection.Accounts.get().then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	updateAccount: function() {
		this.connection.Accounts.update({
			email: Config.email,
			last_name: this.generateRandomString(10)
		}).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	accountResetKey: function() {
		this.connection.Accounts.resetKey().then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	createUserClass: function() {
		this.createClass('user');
	},

	createClass: function(name) {
		if (typeof name === 'undefined') {
			name = this.generateRandomString();
		}
		this.connection.createClass({
			name: name,
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

	deleteClass: function() {
		this.connection.listClasses().then(function(list) {
			var classToDelete = null;
			for (var key in list) {
				if (key !== 'user') {
					classToDelete = key;
					break;
				}
			}
			this.connection.deleteClass(classToDelete).then(this.onSuccess.bind(this), this.onError.bind(this));
		}.bind(this), this.onError.bind(this));
	},

	getClassInfo: function() {
		this.connection.getClass('user').then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	updateClass: function() {
		this.connection.listClasses().then(function(list) {
			var className = null;
			for (var key in list) {
				if (key !== 'user') {
					className = key;
					break;
				}
			}
			this.connection.updateClass(className, {
				description: this.generateRandomPhrase(4),
				schema: new Syncano.Schema().addField('field_name', 'string')
			}).then(this.onSuccess.bind(this), this.onError.bind(this));
		}.bind(this), this.onError.bind(this));
	},

	listDataObjects: function() {
		this.connection.listDataObjects('user').then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	createDataObject: function() {
		this.connection.createDataObject({
			class_name: 'user',
			first_name: this.generateRandomString(6),
			last_name: this.generateRandomString(10),
			year_of_birth: this.generateRandomNumber(1950, 2000)
		}).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	deleteDataObject: function() {
		this.connection.listDataObjects('user').then(function(list) {
			if (list.length > 0) {
				this.connection.deleteDataObject({
					class_name: 'user',
					id: list._items[0].id
				}).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create data object first');
			}
		}.bind(this), this.onError.bind(this));
	},

	updateDataObject: function() {
		this.connection.listDataObjects('user').then(function(list) {
			if (list.length > 0) {
				this.connection.updateDataObject('user', {
					id: list._items[0].id,
					first_name: this.generateRandomString(8),
					last_name: this.generateRandomString(10)
				}).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create data object first');
			}
		}.bind(this), this.onError.bind(this));
	},

	createInstance: function() {
		var name = this.generateRandomString(12);
		this.connection.Instances.create({
			name: name,
			description: 'description for test instance ' + name
		}).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	listInstances: function() {
		this.connection.Instances.list().then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	getInstanceInfoString: function() {
		this.connection.Instances.get(Config.instance).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	getInstanceInfoObject: function() {
		this.connection.Instances.get({
			name: Config.instance
		}).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	deleteInstance: function() {
		this.connection.Instances.list().then(function(list) {
			var instanceToDelete = null;
			for (var key in list) {
				if (key !== Config.instance) {
					instanceToDelete = key;
					break;
				}
			}
			if (instanceToDelete) {
				this.connection.Instances.delete(instanceToDelete).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Please create instance first');
			}
		}.bind(this), this.onError.bind(this));
	},

	updateInstance: function() {
		this.connection.Instances.update(Config.instance, {
			description: this.generateRandomPhrase(3)
		}).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	getInstanceAdmins: function() {
		this.connection.Instances.listAdmins(Config.instance).then(this.onSuccess.bind(this), this.onError.bind(this));
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
			} else {
				this.onError('Cannot load second page');
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

	generateRandomPhrase: function(wordsCnt) {
		var s = [];
		for (var i = 0; i < wordsCnt; i++) {
			s.push(this.generateRandomString(8));
		}
		return s.join(' ');
	},

	generateRandomNumber: function(min, max) {
		return parseInt(Math.random() * (max - min), 10) + min;
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

$('.panel a').on('click', function(e) {
	e.preventDefault();
	var $btn = $(e.target);
	var action = $btn.attr('href').substring(1).split('-').map(function(token, idx) {
		return idx === 0 ? token : token.charAt(0).toUpperCase() + token.substring(1);
	}).join('');
	test.$lastClickedButton = $btn;
	try {
		if (typeof test[action] === 'function') {
			test[action]();
		} else {
			throw new Error(action + ' is not defined');
		}
	} catch (e) {
		test.onError(e.message);
	}
});