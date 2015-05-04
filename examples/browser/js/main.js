function TestSuite() {
	this.$lastClickedButton = null;
	this.connection = new Syncano(Config.instance);
}

TestSuite.prototype = {
	showApiKey: function(apiKey) {
		if (apiKey.length) {
			apiKey = 'apiKey: ' + apiKey;
		} else {
			apiKey = 'not connected';
		}
		document.getElementById('api-key').innerHTML = apiKey;
	},

	connectApiKey: function() {
		var promise = this.connection.connect(Config.apiKey);
		this.proceedWithAuth(promise);
	},

	connectEmail: function() {
		var promise = this.connection.connect(Config.email, Config.password);
		this.proceedWithAuth(promise);
	},

	proceedWithAuth: function(promise) {
		this.showApiKey('');
		promise.then(function() {
			this.showApiKey(this.connection.getInfo().account.account_key);
			$('.panel').addClass('active');
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

	createRelationClass: function() {
		this.connection.Classes.create({
			name: 'relation',
			description: 'relation description',
			schema: new Syncano.Schema()
				.addField('name', 'string')
				.addField('user', 'reference', 'user')
		}).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	createClass: function(name) {
		if (typeof name === 'undefined') {
			name = this.generateRandomString();
		}
		this.connection.Classes.create({
			name: name,
			description: 'class description',
			schema: new Syncano.Schema()
				.addField('first_name', 'string')
				.addField('last_name', 'string').addOrderIndex()
				.addField('year_of_birth', 'integer').addFilterIndex()
		}).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	listClasses: function() {
		this.connection.Classes.list().then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	deleteClass: function() {
		this.connection.Classes.list().then(function(list) {
			var classToDelete = null;
			for (var key in list) {
				if (key !== 'user') {
					classToDelete = key;
					break;
				}
			}
			this.connection.Classes.remove(classToDelete).then(this.onSuccess.bind(this), this.onError.bind(this));
		}.bind(this), this.onError.bind(this));
	},

	getClassInfo: function() {
		this.connection.Classes.get('user').then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	updateClass: function() {
		this.connection.Classes.list().then(function(list) {
			var className = null;
			for (var key in list) {
				if (key !== 'user') {
					className = key;
					break;
				}
			}
			this.connection.Classes.update({
				name: className,
				description: this.generateRandomPhrase(4),
				schema: new Syncano.Schema().addField('field_name', 'string')
			}).then(this.onSuccess.bind(this), this.onError.bind(this));
		}.bind(this), this.onError.bind(this));
	},

	listDataObjects: function() {
		this.connection.DataObjects.list('user').then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	listDataObjectsWithReference: function() {
		this.connection.DataObjects.list('relation').then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	createDataObjectWithReference: function() {
		this.connection.DataObjects.list('user').then(function(Users) {
			if (Users.length > 0) {
				var user = Users.at(0);
				this.connection.DataObjects.create({
					class_name: 'relation',
					name: this.generateRandomString(8),
					user: user.id
				}).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create user first');
			}
		}.bind(this), this.onError.bind(this));
	},

	createDataObject: function() {
		this.connection.DataObjects.create({
			class_name: 'user',
			first_name: this.generateRandomString(6),
			last_name: this.generateRandomString(10),
			year_of_birth: this.generateRandomNumber(1950, 2000)
		}).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	deleteDataObject: function() {
		this.connection.DataObjects.list('user').then(function(list) {
			if (list.length > 0) {
				this.connection.DataObjects.remove({
					class_name: 'user',
					id: list.at(0).id
				}).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create data object first');
			}
		}.bind(this), this.onError.bind(this));
	},

	updateDataObject: function() {
		this.connection.DataObjects.list('user').then(function(list) {
			if (list.length > 0) {
				this.connection.DataObjects.update('user', {
					id: list.at(0).id,
					first_name: this.generateRandomString(8),
					last_name: this.generateRandomString(10)
				}).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create data object first');
			}
		}.bind(this), this.onError.bind(this));
	},

	getDataObject: function() {
		this.connection.DataObjects.list('user').then(function(list) {
			if (list.length > 0) {
				this.connection.DataObjects.get('user', {
					id: list.at(0).id
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
				this.connection.Instances.remove(instanceToDelete).then(this.onSuccess.bind(this), this.onError.bind(this));
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

	listDataObjectsWithFilter: function() {
		this.connection.DataObjects.list('user', {
			query: JSON.stringify({
				year_of_birth: {
					_eq: 1959
				}
			})
		}).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	listDataObjectsWithPagination: function() {
		this.connection.DataObjects.list('user', {
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

	listApiKeys: function() {
		this.connection.ApiKeys.list().then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	createApiKey: function() {
		this.connection.ApiKeys.create().then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	createApiKeyWithCreateFlag: function() {
		this.connection.ApiKeys.create({
			allow_user_create: true
		}).then(function(res) {
			if (res['allow_user_create'] === true) {
				this.onSuccess(res);
			} else {
				this.onError('Could not create api key with required priviledges.');
			}
		}.bind(this), this.onError.bind(this));
	},

	getApiKeyInfo: function() {
		this.connection.ApiKeys.list().then(function(List) {
			if (List.length > 0) {
				this.connection.ApiKeys.get(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create api key first');
			}
		}.bind(this), this.onError.bind(this));
	},

	deleteApiKey: function() {
		this.connection.ApiKeys.list().then(function(List) {
			if (List.length > 0) {
				this.connection.ApiKeys.remove(List.at(0).id).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create api key first');
			}
		}.bind(this), this.onError.bind(this));
	},

	createCodeboxPython: function() {
		var source = [
			"print 'hello'"
		].join('\n');
		var params = {
			name: 'Codebox ' + this.generateRandomNumber(10, 1000),
			source: source,
			runtime_name: 'python'
		}
		this.connection.CodeBoxes.create(params).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	createCodeboxJs: function() {
		var source = [
			"var obj = {name: 'Syncano'};",
			"console.log(JSON.stringify(obj));"
		].join('\n');
		var params = {
			name: 'Codebox ' + this.generateRandomNumber(10, 1000),
			source: source
		}
		this.connection.CodeBoxes.create(params).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	listCodeboxes: function() {
		this.connection.CodeBoxes.list().then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	getCodebox: function() {
		this.connection.CodeBoxes.list().then(function(List) {
			if (List.length > 0) {
				this.connection.CodeBoxes.get(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create codebox first');
			}
		}.bind(this), this.onError.bind(this));
	},

	updateCodebox: function() {
		this.connection.CodeBoxes.list().then(function(List) {
			if (List.length > 0) {
				var item = List.at(0);
				var params = {
					id: item.id,
					description: this.generateRandomPhrase(3),
					source: item.source + '\n\n\n/* comment */'
				};
				this.connection.CodeBoxes.update(params).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create codebox first');
			}
		}.bind(this), this.onError.bind(this));
	},

	deleteCodebox: function() {
		this.connection.CodeBoxes.list().then(function(List) {
			if (List.length > 0) {
				this.connection.CodeBoxes.remove(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create codebox first');
			}
		}.bind(this), this.onError.bind(this));
	},

	listCodeboxRuntimes: function() {
		this.connection.CodeBoxes.listRuntimes().then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	runCodebox: function() {
		this.connection.CodeBoxes.list().then(function(List) {
			if (List.length > 0) {
				this.connection.CodeBoxes.run(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create codebox first');
			}
		}.bind(this), this.onError.bind(this));
	},

	listCodeboxTraces: function() {
		this.connection.CodeBoxes.list().then(function(List) {
			if (List.length > 0) {
				this.connection.CodeBoxes.traces(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create codebox first');
			}
		}.bind(this), this.onError.bind(this));
	},

	getCodeboxTrace: function() {
		this.connection.CodeBoxes.list().then(function(List) {
			if (List.length > 0) {
				var scheduleId = List.at(0).id;
				this.connection.CodeBoxes.traces(scheduleId).then(function(List) {
					this.connection.CodeBoxes.trace(scheduleId, List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
				}.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create codebox first');
			}
		}.bind(this), this.onError.bind(this));
	},

	createInvitation: function() {
		var params = {
			email: 'fake-email@syncano.com'
		};
		this.connection.createInvitation(params).then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	listInvitations: function() {
		this.connection.Invitations.list().then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	getInvitation: function() {
		this.connection.Invitations.list().then(function(List) {
			if (List.length > 0) {
				this.connection.Invitations.get(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create invitation first');
			}
		}.bind(this), this.onError.bind(this));
	},

	deleteInvitation: function() {
		this.connection.Invitations.list().then(function(List) {
			if (List.length > 0) {
				this.connection.Invitations.remove(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create invitation first');
			}
		}.bind(this), this.onError.bind(this));
	},


	createWebhook: function() {
		this.connection.CodeBoxes.list().then(function(List) {
			if (List.length > 0) {
				this.connection.WebHooks.create({
					codebox: List.at(0),
					slug: 'slug_' + this.generateRandomString(8)
				}).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create codebox first');
			}
		}.bind(this), this.onError.bind(this));
	},

	listWebhooks: function() {
		this.connection.WebHooks.list().then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	getWebhook: function() {
		this.connection.WebHooks.list().then(function(List) {
			if (List.length > 0) {
				this.connection.WebHooks.get(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create webhook first');
			}
		}.bind(this), this.onError.bind(this));
	},

	deleteWebhook: function() {
		this.connection.WebHooks.list().then(function(List) {
			if (List.length > 0) {
				this.connection.WebHooks.remove(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create webhook first');
			}
		}.bind(this), this.onError.bind(this));
	},

	updateWebhook: function() {
		this.connection.CodeBoxes.list().then(function(CBList) {
			if (CBList.length >= 2) {
				this.connection.WebHooks.list().then(function(WHList) {
					if (WHList.length > 0) {
						var webhook = WHList.at(0);
						var cb = webhook.codebox;
						var newcb = 0;
						for (var i = 0; i < CBList.length; i++) {
							if (CBList.at(i).id !== cb) {
								newcb = CBList.at(i).id;
								break;
							}
						}
						this.connection.WebHooks.update(WHList.at(0).slug, {
							codebox: newcb
						}).then(this.onSuccess.bind(this), this.onError.bind(this));
					} else {
						this.onError('Create webhook first');
					}
				}.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create at least 2 codeboxes first');
			}
		}.bind(this), this.onError.bind(this));
	},

	runWebhook: function() {
		this.connection.WebHooks.list().then(function(List) {
			if (List.length > 0) {
				this.connection.WebHooks.run(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create webhook first');
			}
		}.bind(this), this.onError.bind(this));
	},

	listWebhookTraces: function() {
		this.connection.WebHooks.list().then(function(List) {
			if (List.length > 0) {
				this.connection.WebHooks.traces(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create Webhook first');
			}
		}.bind(this), this.onError.bind(this));
	},

	getWebhookTrace: function() {
		this.connection.WebHooks.list().then(function(List) {
			if (List.length > 0) {
				var webhookId = List.at(0).id;
				this.connection.WebHooks.traces(webhookId).then(function(List) {
					this.connection.WebHooks.trace(webhookId, List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
				}.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create Webhook first');
			}
		}.bind(this), this.onError.bind(this));
	},

	createTrigger: function() {
		this.connection.CodeBoxes.list().then(function(List) {
			if (List.length > 0) {
				this.connection.Triggers.create({
					name: this.generateRandomString(8),
					codebox: List.at(0),
					'class': 'user',
					signal: 'post_create'
				}).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create codebox first');
			}
		}.bind(this), this.onError.bind(this));
	},

	listTriggers: function() {
		this.connection.Triggers.list().then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	listTriggerTraces: function() {
		this.connection.Triggers.list().then(function(List) {
			if (List.length > 0) {
				this.connection.Triggers.traces(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create trigger first');
			}
		}.bind(this), this.onError.bind(this));
	},

	getTriggerTrace: function() {
		this.connection.Triggers.list().then(function(List) {
			if (List.length > 0) {
				var triggerId = List.at(0).id;
				this.connection.Triggers.traces(triggerId).then(function(List) {
					this.connection.Triggers.trace(triggerId, List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
				}.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create trigger first');
			}
		}.bind(this), this.onError.bind(this));
	},

	getTrigger: function() {
		this.connection.Triggers.list().then(function(List) {
			if (List.length > 0) {
				this.connection.Triggers.get(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create trigger first');
			}
		}.bind(this), this.onError.bind(this));
	},

	updateTrigger: function() {
		this.connection.Triggers.list().then(function(List) {
			if (List.length > 0) {
				this.connection.Triggers.update(List.at(0).id, {
					signal: 'post_update'
				}).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create trigger first');
			}
		}.bind(this), this.onError.bind(this));
	},

	deleteTrigger: function() {
		this.connection.Triggers.list().then(function(List) {
			if (List.length > 0) {
				this.connection.Triggers.remove(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create trigger first');
			}
		}.bind(this), this.onError.bind(this));
	},

	createSchedule: function() {
		this.connection.CodeBoxes.list().then(function(List) {
			if (List.length > 0) {
				this.connection.Schedules.create({
					codebox: List.at(0),
					name: 'every 30 seconds one bunny dies',
					interval_sec: 30
				}).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create codebox first');
			}
		}.bind(this), this.onError.bind(this));
	},

	listSchedules: function() {
		this.connection.Schedules.list().then(this.onSuccess.bind(this), this.onError.bind(this));
	},

	getSchedule: function() {
		this.connection.Schedules.list().then(function(List) {
			if (List.length > 0) {
				this.connection.Schedules.get(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create schedule first');
			}
		}.bind(this), this.onError.bind(this));
	},

	deleteSchedule: function() {
		this.connection.Schedules.list().then(function(List) {
			if (List.length > 0) {
				this.connection.Schedules.remove(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create schedule first');
			}
		}.bind(this), this.onError.bind(this));
	},

	listScheduleTraces: function() {
		this.connection.Schedules.list().then(function(List) {
			if (List.length > 0) {
				this.connection.Schedules.traces(List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create schedule first');
			}
		}.bind(this), this.onError.bind(this));
	},

	getScheduleTrace: function() {
		this.connection.Schedules.list().then(function(List) {
			if (List.length > 0) {
				var scheduleId = List.at(0).id;
				this.connection.Schedules.traces(scheduleId).then(function(List) {
					this.connection.Schedules.trace(scheduleId, List.at(0)).then(this.onSuccess.bind(this), this.onError.bind(this));
				}.bind(this), this.onError.bind(this));
			} else {
				this.onError('Create schedule first');
			}
		}.bind(this), this.onError.bind(this));
	},

	example1: function() {
		[
			'Scenario:',
			'1. Create new class',
			'2. Create two objects using this class',
			'3. Change class definition',
			'4. Read objects',
			'5. Observe new fields'
		].forEach(function(line) {
			console.log(line);
		});

		var CON = this.connection;
		var className = this.generateRandomString(6);
		var fieldName = this.generateRandomString(8);
		CON.Classes.create({
			name: className,
			schema: new Syncano.Schema().addField('field1', 'string')
		}).then(function() {
			console.log('Created class ', className);
			return CON.DataObjects.create({
				class_name: className,
				field1: fieldName + ' 1',
			});
		}, this.onError.bind(this)).then(function() {
			console.log('Created data object ', fieldName + ' 1');
			return CON.DataObjects.create({
				class_name: className,
				field1: fieldName + ' 2',
			});
		}, this.onError.bind(this)).then(function() {
			console.log('Created data object ', fieldName + ' 2');
			return CON.Classes.update(className, {
				schema: new Syncano.Schema().addField('field1', 'string').addField('field2', 'string')
			});
		}, this.onError.bind(this)).then(function() {
			console.log('Updated class', className);
			return CON.DataObjects.list(className);
		}, this.onError.bind(this)).then(function(List) {
			console.log('Objects list', List);
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
		window.LAST_RESULT = result;
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