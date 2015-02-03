var Syncano = (function() {

	/*
		define dummy console if not present in the system
	*/
	var console = window.console || {
		log: function() {},
		error: function() {},
		warning: function() {}
	};

	/*
		private vars
	*/
	var baseURL = 'https://syncanotest1-env.elasticbeanstalk.com/';
	var apiKey = null;
	var accountObject = {};
	var instanceObject = {};
	var linksObject = {};

	var tempInstance = null;

	/*
		private methods
	*/
	function normalizeUrl(url) {
		if (url.substr(-1) !== '/' && url.indexOf('?') === -1) {
			url += '/';
		}
		return url.replace(/\/\//g, '/');
	}

	/*
		constructor
	*/
	function Syncano(param) {
		if (typeof param === 'string') {
			tempInstance = param;
		} else if (typeof param === 'object' && typeof param.instance === 'string') {
			tempInstance = param.instance;
		}

		this.Accounts = {
			create: this.createAccount.bind(this),
			get: this.getAccount.bind(this),
			update: this.updateAccount.bind(this),
			resetKey: this.resetAccountKey.bind(this)
		};
		this.Instances = {
			create: this.createInstance.bind(this),
			list: this.listInstances.bind(this),
			get: this.getInstance.bind(this),
			remove: this.removeInstance.bind(this),
			update: this.updateInstance.bind(this),
			listAdmins: this.listInstanceAdmins.bind(this)
		};
		this.Classes = {
			create: this.createClass.bind(this),
			list: this.listClasses.bind(this),
			remove: this.removeClass.bind(this),
			get: this.getClass.bind(this),
			update: this.updateClass.bind(this)
		};
		this.DataObjects = {
			create: this.createDataObject.bind(this),
			list: this.listDataObjects.bind(this),
			remove: this.removeDataObject.bind(this),
			get: this.getDataObject.bind(this),
			update: this.updateDataObject.bind(this)
		};
		this.ApiKeys = {
			create: this.createApiKey.bind(this),
			list: this.listApiKeys.bind(this),
			get: this.getApiKey.bind(this),
			remove: this.removeApiKey.bind(this)
		};
		this.CodeBoxes = {
			create: this.createCodeBox.bind(this),
			list: this.listCodeBoxes.bind(this),
			listRuntimes: this.listCodeBoxRuntimes.bind(this),
			get: this.getCodeBox.bind(this),
			update: this.updateCodeBox.bind(this),
			remove: this.removeCodeBox.bind(this)
		};
		this.Invitations = {
			create: this.createInvitation.bind(this),
			list: this.listInvitations.bind(this),
			get: this.getInvitation.bind(this),
			remove: this.removeInvitation.bind(this)
		};
		this.WebHooks = {
			create: this.createWebHook.bind(this),
			list: this.listWebHooks.bind(this),
			get: this.getWebHook.bind(this),
			update: this.updateWebHook.bind(this),
			remove: this.removeWebHook.bind(this),
			run: this.runWebHook.bind(this)
		};
		this.Triggers = {
			create: this.createTrigger.bind(this),
			list: this.listTriggers.bind(this),
			get: this.getTrigger.bind(this),
			update: this.updateTrigger.bind(this),
			remove: this.removeTrigger.bind(this),
		};
	}


	Syncano.prototype = {

		connect: function() {
			var promise;
			if (arguments.length >= 2 && arguments[0].indexOf('@') > 0) {
				// arguments are: email and password and optional callbacks
				promise = this.authWithPassword.apply(this, arguments);
				if (tempInstance !== null) {
					promise = promise.then(function() {
						this.setInstance(tempInstance);
					}.bind(this));
				}
			} else if (arguments.length >= 1) {
				// arguments are: apiKey and optional callbacks
				promise = this.authWithApiKey.apply(this, arguments);
				if (tempInstance !== null) {
					promise = this.setInstance(tempInstance);
				}
			} else {
				throw new Error('Incorrect arguments');
			}
			return promise;
		},

		/*
		 */
		authWithPassword: function(email, password, callbackOK, callbackError) {
			var params = {
				email: email,
				password: password
			};
			return this.request('POST', 'v1/account/auth', params, function(res) {
				accountObject = res;
				this.setApiKey(res.account_key);
				typeof callbackOK === 'function' && callbackOK(res);
			}.bind(this), callbackError);
		},

		/*
		 */
		authWithApiKey: function(apiKey, callbackOK) {
			this.setApiKey(apiKey);
			var deferred = Deferred();
			accountObject = {
				account_key: apiKey
			};
			typeof callbackOK === 'function' && callbackOK(accountObject);
			deferred.resolve(accountObject);
			return deferred.promise;
		},

		/*
		 */
		setApiKey: function(_apiKey) {
			apiKey = _apiKey;
		},

		/*
			Parses obj and search for obj.links.
			If found, copies them to private linksObject with given prefix and removes from obj. 
			All existing links will be overwritten
			Returns:
				linksObject
		*/
		saveLinks: function(prefix, obj) {
			if (obj.links) {
				Object.keys(obj.links).forEach(function(key) {
					linksObject[prefix + '_' + key] = obj.links[key];
				});
			}
			delete obj.links;
			return linksObject;
		},

		/*
		 	Checks if instance exists and stores its information in private instanceObject
		 	Returns:
				promise
		 */
		setInstance: function(instanceName, callbackOK, callbackError) {
			return this.request('GET', 'v1/instances/' + instanceName, {}, function(result) {
				instanceObject = result;
				this.saveLinks('instance', result);
				typeof callbackOK === 'function' && callbackOK(result);
			}.bind(this), callbackError);
		},

		getInfo: function() {
			return {
				account: accountObject,
				instance: instanceObject,
				links: linksObject
			}
		},


		/*********************
		   INSTANCES METHODS
		**********************/
		createInstance: function(params, callbackOK, callbackError) {
			if (typeof params === 'string') {
				params = {
					name: params
				};
			}
			if (typeof params === 'undefined' || typeof params.name === 'undefined') {
				throw new Error('Missing instance name');
			}
			return this.request('POST', 'v1/instances', params, callbackOK, callbackError);
		},

		listInstances: function(params, callbackOK, callbackError) {
			params = params || {};
			return this.request('GET', 'v1/instances', params, callbackOK, callbackError);
		},

		getInstance: function(name, callbackOK, callbackError) {
			if (typeof name === 'object') {
				name = name.name;
			}
			if (typeof name === 'undefined' || name.length === 0) {
				throw new Error('Missing instance name');
			}
			return this.request('GET', 'v1/instances/' + name, {}, callbackOK, callbackError);
		},

		removeInstance: function(name, callbackOK, callbackError) {
			if (typeof name === 'object') {
				name = name.name;
			}
			if (typeof name === 'undefined' || name.length === 0) {
				throw new Error('Missing instance name');
			}
			return this.request('DELETE', 'v1/instances/' + name, {}, callbackOK, callbackError);
		},

		updateInstance: function(name, params, callbackOK, callbackError) {
			if (typeof name === 'undefined' || name.length === 0) {
				throw new Error('Missing instance name');
			}
			return this.request('PATCH', 'v1/instances/' + name, params, callbackOK, callbackError);
		},

		listInstanceAdmins: function(name, params, callbackOK, callbackError) {
			params = params || {};
			if (typeof name === 'object') {
				name = name.name;
			}
			if (typeof name === 'undefined' || name.length === 0) {
				throw new Error('Missing instance name');
			}
			return this.request('GET', 'v1/instances/' + name + '/admins/', params, callbackOK, callbackError);
		},


		/*****************
		   CLASS METHODS
		******************/

		/*
		 */
		createClass: function(params, callbackOK, callbackError) {
			if (typeof linksObject.instance_classes === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			params.description = params.description || '';
			if (typeof params.schema !== 'string') {
				params.schema = params.schema.toString();
			}
			return this.request('POST', linksObject.instance_classes, params, function(result) {
				this.saveLinks('class_' + params.name, result);
				typeof callbackOK === 'function' && callbackOK(result);
			}.bind(this), callbackError);
		},

		/*
		 */
		listClasses: function(params, callbackOK, callbackError) {
			return this.genericList(params, 'instance_classes', callbackOK, callbackError);
		},

		/*
			Delete class
			Parameters:
				className - name of the class OR object with "name" field
		*/
		removeClass: function(className, callbackOK, callbackError) {
			return this.genericRemove(className, 'instance_classes', callbackOK, callbackError);
		},

		getClass: function(name, callbackOK, callbackError) {
			return this.genericGet(name, 'instance_classes', function(obj) {
				this.extendClassObject(obj);
				if (typeof callbackOK === 'function') {
					callbackOK();
				}
			}.bind(this), callbackError);
		},

		extendClassObject: function(obj) {
			var lib = this;
			Object.defineProperty(obj, 'createDataObject', {
				value: function(params, callbackOK, callbackError) {
					return lib.createDataObject(obj.name, params, callbackOK, callbackError);
				},
				writable: false,
				enumerable: false,
				configurable: false
			});
		},


		updateClass: function(name, params, callbackOK, callbackError) {
			if (typeof linksObject.instance_classes === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			if (typeof name === 'undefined' || name.length === 0) {
				throw new Error('Missing class name');
			}
			if (typeof params.schema !== 'string') {
				params.schema = params.schema.toString();
			}
			return this.request('PATCH', linksObject.instance_classes + name, params, callbackOK, callbackError);
		},


		/*******************
		   ACCOUNT METHODS
		********************/
		createAccount: function(params, callbackOK, callbackError) {
			return this.request('POST', 'v1/account/register/', params, callbackOK, callbackError);
		},

		getAccount: function(callbackOK, callbackError) {
			return this.request('GET', 'v1/account/', {}, callbackOK, callbackError);
		},

		updateAccount: function(params, callbackOK, callbackError) {
			return this.request('PUT', 'v1/account/', params, callbackOK, callbackError);
		},

		resetAccountKey: function(callbackOK, callbackError) {
			return this.request('POST', 'v1/account/reset_key', {}, callbackOK, callbackError);
		},

		/***********************
		   DATA OBJECT METHODS
		************************/
		createDataObject: function(className, params, callbackOK, callbackError) {
			if (typeof className === 'object') {
				params = className;
				className = className.class_name;
				delete params.class_name;
			}
			if (typeof className === 'undefined') {
				throw new Error('Missing name of the class');
			}
			if (typeof linksObject.instance_classes === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			var methodName = linksObject.instance_classes + className + '/objects/';
			return this.request('POST', methodName, params, callbackOK, callbackError);
		},

		listDataObjects: function(className, params, callbackOK, callbackError) {
			if (typeof className === 'object') {
				className = className.name;
			}
			if (typeof className === 'undefined') {
				throw new Error('Missing name of the class');
			}
			if (typeof linksObject.instance_classes === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			var methodName = linksObject.instance_classes + className + '/objects/';
			return this.request('GET', methodName, params, callbackOK, callbackError);
		},

		removeDataObject: function(className, params, callbackOK, callbackError) {
			if (typeof className === 'object') {
				params = className;
				className = className.class_name;
				delete params.class_name;
			}
			if (typeof className === 'undefined') {
				throw new Error('Missing name of the class');
			}
			if (typeof linksObject.instance_classes === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			var id;
			if (typeof params !== 'object') {
				id = params;
			} else {
				id = params.id || params.pk;
			}
			var methodName = linksObject.instance_classes + className + '/objects/' + id;
			return this.request('DELETE', methodName, {}, callbackOK, callbackError);
		},

		getDataObject: function(className, params, callbackOK, callbackError) {
			if (typeof className === 'object') {
				params = className;
				className = className.class_name;
				delete params.class_name;
			}
			if (typeof className === 'undefined') {
				throw new Error('Missing name of the class');
			}
			if (typeof linksObject.instance_classes === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			var id;
			if (typeof params !== 'object') {
				id = params;
			} else {
				id = params.id || params.pk;
			}
			var methodName = linksObject.instance_classes + className + '/objects/' + id;
			return this.request('GET', methodName, {}, callbackOK, callbackError);
		},

		updateDataObject: function(className, params, callbackOK, callbackError) {
			if (typeof className === 'object') {
				params = className;
				className = className.class_name;
				delete params.class_name;
			}
			if (typeof className === 'undefined') {
				throw new Error('Missing name of the class');
			}
			if (typeof linksObject.instance_classes === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			var id;
			if (params.id) {
				id = params.id;
				delete params.id;
			} else if (params.pk) {
				id = params.pk;
				delete params.pk;
			}
			var methodName = linksObject.instance_classes + className + '/objects/' + id;
			return this.request('PATCH', methodName, params, callbackOK, callbackError);
		},

		/********************
		   API KEYS METHODS
		*********************/
		createApiKey: function(params, callbackOK, callbackError) {
			params = params || {};
			if (typeof linksObject.instance_api_keys === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			return this.request('POST', linksObject.instance_api_keys, params, callbackOK, callbackError);
		},

		listApiKeys: function(params, callbackOK, callbackError) {
			return this.genericList(params, 'instance_api_keys', callbackOK, callbackError);
		},

		getApiKey: function(id, callbackOK, callbackError) {
			return this.genericGet(id, 'instance_api_keys', callbackOK, callbackError);
		},

		removeApiKey: function(id, callbackOK, callbackError) {
			return this.genericRemove(id, 'instance_api_keys', callbackOK, callbackError);
		},


		/*********************
		   CODEBOXES METHODS
		**********************/
		createCodeBox: function(params, callbackOK, callbackError) {
			if (typeof params !== 'object') {
				throw new Error('Missing parameters object');
			}
			if (typeof linksObject.instance_codeboxes === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			if (typeof params.runtime_name === 'undefined') {
				params.runtime_name = 'nodejs';
			}
			return this.request('POST', linksObject.instance_codeboxes, params, callbackOK, callbackError);
		},

		listCodeBoxes: function(params, callbackOK, callbackError) {
			return this.genericList(params, 'instance_codeboxes', callbackOK, callbackError);
		},

		listCodeBoxRuntimes: function(params, callbackOK, callbackError) {
			return this.genericList(params, 'instance_codebox_runtimes', callbackOK, callbackError);
		},

		getCodeBox: function(id, callbackOK, callbackError) {
			return this.genericGet(id, 'instance_codeboxes', callbackOK, callbackError);
		},

		updateCodeBox: function(id, params, callbackOK, callbackError) {
			if (typeof id === 'object') {
				params = id;
				id = params.id;
				delete params.id;
			}
			if (typeof id === 'undefined') {
				throw new Error('Missing codebox id');
			}
			if (typeof linksObject.instance_codeboxes === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			return this.request('PATCH', linksObject.instance_codeboxes + id, params, callbackOK, callbackError);
		},

		removeCodeBox: function(id, callbackOK, callbackError) {
			return this.genericRemove(id, 'instance_codeboxes', callbackOK, callbackError);
		},


		/***********************
		   INVITATIONS METHODS
		************************/
		createInvitation: function(params, callbackOK, callbackError) {
			if (typeof params !== 'object') {
				throw new Error('Missing parameters object');
			}
			if (typeof linksObject.instance_invitations === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			if (typeof params.role === 'undefined') {
				params.role = 'read';
			}
			return this.request('POST', linksObject.instance_invitations, params, callbackOK, callbackError);
		},

		listInvitations: function(params, callbackOK, callbackError) {
			return this.genericList(params, 'instance_invitations', callbackOK, callbackError);
		},

		getInvitation: function(id, callbackOK, callbackError) {
			return this.genericGet(id, 'instance_invitations', callbackOK, callbackError);
		},

		removeInvitation: function(id, callbackOK, callbackError) {
			return this.genericRemove(id, 'instance_invitations', callbackOK, callbackError);
		},

		/********************
		   WEBHOOKS METHODS
		*********************/
		createWebHook: function(params, callbackOK, callbackError) {
			if (typeof params !== 'object') {
				throw new Error('Missing parameters object');
			}
			if (typeof params.codebox === 'object') {
				params.codebox = params.codebox.id || params.codebox.pk;
			}
			if (typeof linksObject.instance_webhooks === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			return this.request('POST', linksObject.instance_webhooks, params, callbackOK, callbackError);
		},

		listWebHooks: function(params, callbackOK, callbackError) {
			return this.genericList(params, 'instance_webhooks', callbackOK, callbackError);
		},

		getWebHook: function(id, callbackOK, callbackError) {
			return this.genericGet(id, 'instance_webhooks', callbackOK, callbackError);
		},

		removeWebHook: function(id, callbackOK, callbackError) {
			return this.genericRemove(id, 'instance_webhooks', callbackOK, callbackError);
		},

		updateWebHook: function(id, params, callbackOK, callbackError) {
			if (typeof id === 'object') {
				id = id.slug;
			}
			if (typeof id === 'undefined') {
				throw new Error('Missing webhook slug');
			}
			if (typeof linksObject.instance_webhooks === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			return this.request('PATCH', linksObject.instance_webhooks + id, params, callbackOK, callbackError);
		},

		runWebHook: function(id, callbackOK, callbackError) {
			if (typeof id === 'object') {
				id = id.slug;
			}
			if (typeof id === 'undefined') {
				throw new Error('Missing webhook slug');
			}
			if (typeof linksObject.instance_webhooks === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			return this.request('GET', linksObject.instance_webhooks + id + '/run', {}, callbackOK, callbackError);
		},

		/********************
		   TRIGGERS METHODS
		*********************/
		createTrigger: function(params, callbackOK, callbackError) {
			if (typeof params !== 'object') {
				throw new Error('Missing parameters object');
			}
			if (typeof params.codebox === 'object') {
				params.codebox = params.codebox.id;
			}
			if (typeof params.klass === 'object') {
				params.klass = params.klass.name;
			}
			if (typeof linksObject.instance_triggers === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			return this.request('POST', linksObject.instance_triggers, params, callbackOK, callbackError);
		},

		listTriggers: function(params, callbackOK, callbackError) {
			return this.genericList(params, 'instance_triggers', callbackOK, callbackError);
		},

		getTrigger: function(id, callbackOK, callbackError) {
			return this.genericGet(id, 'instance_triggers', callbackOK, callbackError);
		},

		updateTrigger: function(id, params, callbackOK, callbackError) {
			if (typeof id === 'object') {
				id = id.id;
			}
			if (typeof id === 'undefined') {
				throw new Error('Missing identifier');
			}
			if (typeof linksObject.instance_triggers === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			return this.request('PATCH', linksObject.instance_triggers + id, params, callbackOK, callbackError);
		},

		removeTrigger: function(id, callbackOK, callbackError) {
			return this.genericRemove(id, 'instance_triggers', callbackOK, callbackError);
		},


		/********************
		   GENERIC METHODS
		*********************/
		genericList: function(params, links_url, callbackOK, callbackError) {
			params = params || {};
			var url = linksObject[links_url];
			if (typeof url === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			return this.request('GET', url, params, callbackOK, callbackError);
		},

		genericGet: function(id, links_url, callbackOK, callbackError) {
			var url = linksObject[links_url];
			if (typeof url === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			if (typeof id === 'object') {
				id = id.id || id.name || id.slug;
			}
			if (!id) {
				throw new Error('Missing identifier');
			}
			return this.request('GET', url + id, {}, callbackOK, callbackError);
		},

		genericRemove: function(id, links_url, callbackOK, callbackError) {
			var url = linksObject[links_url];
			if (typeof url === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			if (typeof id === 'object') {
				id = id.id || id.name || id.slug;
			}
			if (!id) {
				throw new Error('Missing identifier');
			}
			return this.request('DELETE', url + id, {}, callbackOK, callbackError);
		},

		/*********
		   UTILS
		**********/

		/*
			Helper method to convert list of objects returned from Syncano to object
		*/
		createList: function(data) {
			var lib = this;
			var List = {};
			for (var i = 0, len = data.objects.length; i < len; i++) {
				Object.defineProperty(data.objects[i], 'delete', {
					value: function(callbackOK, callbackError) {
						return lib.request('DELETE', this.links.self, {}, callbackOK, callbackError);
					},
					writable: false,
					enumerable: false,
					configurable: false
				});
				if (typeof data.objects[i].name !== 'undefined') {
					Object.defineProperty(List, data.objects[i].name, {
						value: data.objects[i],
						writable: true,
						enumerable: true,
						configurable: false
					});
				}
			}
			Object.defineProperty(List, '_items', {
				value: data.objects,
				writable: true,
				enumerable: false,
				configurable: false
			});
			Object.defineProperty(List, 'length', {
				value: List._items.length,
				writable: false,
				enumerable: false,
				configurable: false
			});
			Object.defineProperty(List, 'at', {
				value: function(idx) {
					return List._items[idx];
				},
				writable: false,
				enumerable: false,
				configurable: false
			});
			Object.defineProperty(List, 'hasNextPage', {
				value: function() {
					return data.next !== null;
				},
				writable: false,
				enumerable: false,
				configurable: false
			});
			Object.defineProperty(List, 'hasPrevPage', {
				value: function() {
					return data.prev !== null;
				},
				writable: false,
				enumerable: false,
				configurable: false
			});
			Object.defineProperty(List, 'loadNextPage', {
				value: function(callbackOK, callbackError) {
					return lib.request('GET', data.next);
				},
				writable: false,
				enumerable: false,
				configurable: false
			});
			Object.defineProperty(List, 'loadPrevPage', {
				value: function(callbackOK, callbackError) {
					return lib.request('GET', data.prev);
				},
				writable: false,
				enumerable: false,
				configurable: false
			});
			return List;
		},


		/*
			Generic request method.
			Parameters:
				requestType - GET / POST / PUT / DELETE
				method - Syncano API method to call
				params - parameters to API call
				_callbackOK - method to call on success
				_callbackError - method to call on error
			Returns:
				promise
		*/
		request: function(requestType, method, params, _callbackOK, _callbackError) {
			var deferred = Deferred();
			var callbackOK = function(result) {
				typeof _callbackOK === 'function' && _callbackOK(result);
				deferred.resolve(result);
			};
			var callbackError = function(error) {
				typeof _callbackError === 'function' && _callbackError(error);
				deferred.reject(error);
			};

			if (typeof method === 'undefined') {
				callbackError('Missing request method');
			} else {
				params = params || {};
				var url = normalizeUrl(baseURL + method);
				if (apiKey !== null) {
					url += (url.indexOf('?') === -1 ? '?' : '&') + 'api_key=' + apiKey;
				}
				var ajaxParams = {
					type: requestType,
					url: url,
					data: params
				};
				ajaxParams.success = function(data) {
					if (typeof data === 'object' && typeof data.objects !== 'undefined' && typeof data.prev !== 'undefined' && typeof data.next !== 'undefined') {
						callbackOK(this.createList(data));
					} else {
						callbackOK(data);
					}
				}.bind(this);

				ajaxParams.error = function(xhr, textStatus) {
					var err = 'Error sending request: ' + method;
					if (xhr.responseText) {
						var err = JSON.parse(xhr.responseText);
						if (err.detail) {
							err = err.detail;
						}
					}
					callbackError(err);
				}.bind(this);

				this.ajax(ajaxParams);
			}
			return deferred.promise;
		},

		ajax: function(params) {
			var xhr = {};
			var request = new XMLHttpRequest();
			request.open(params.type.toUpperCase(), params.url, true);
			if (params.type !== 'GET') {
				request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
			}
			request.onload = function() {
				if (request.status >= 200 && request.status < 400) {
					var data = '';
					try {
						data = JSON.parse(request.responseText);
					} catch (e) {};
					params.success(data);
				} else {
					params.error(request, request.responseText);
				}
			};

			request.send(this.prepareAjaxParams(params.data));
			return xhr;
		},

		prepareAjaxParams: function(data) {
			var s = [];
			for (var i in data) {
				if (data.hasOwnProperty(i)) {
					s.push(i + '=' + data[i]);
				}
			}
			return s.join('&');
		}
	};

	/*
	 */
	Syncano.Schema = function() {
		this.data = [];
	};

	Syncano.Schema.prototype = {
		addField: function(name, type, target) {
			var rec = {
				name: name,
				type: type
			};
			if (type === 'reference') {
				rec.target = target;
			}
			this.data.push(rec);
			return this;
		},

		addOrderIndex: function() {
			this.data[this.data.length - 1]['order_index'] = true;
			return this;
		},

		addFilterIndex: function() {
			this.data[this.data.length - 1]['filter_index'] = true;
			return this;
		},

		toString: function() {
			return JSON.stringify(this.data);
		}
	};

	/*
	 * Simple defer/promise library
	 * author Jonathan Gotti <jgotti at jgotti dot net>
	 * https://github.com/malko/D.js/blob/master/lib/D.js
	 */
	var Deferred = (function(undef) {
		"use strict";

		var isFunc = function(f) {
				return (typeof f === 'function');
			},
			isArray = function(a) {
				return Array.isArray ? Array.isArray(a) : (a instanceof Array);
			},
			isObjOrFunc = function(o) {
				return !!(o && (typeof o).match(/function|object/));
			},
			isNotVal = function(v) {
				return (v === false || v === undef || v === null);
			},
			slice = function(a, offset) {
				return [].slice.call(a, offset);
			}


		var nextTick = function(cb) {
			setTimeout(cb, 0);
		};

		function rethrow(e) {
			nextTick(function() {
				throw e;
			});
		}

		function promise_success(fulfilled) {
			return this.then(fulfilled, undef);
		}

		function promise_error(failed) {
			return this.then(undef, failed);
		}

		function promise_apply(fulfilled, failed) {
			return this.then(
				function(a) {
					return isFunc(fulfilled) ? fulfilled.apply(null, isArray(a) ? a : [a]) : (defer.onlyFuncs ? a : fulfilled);
				}, failed || undef
			);
		}

		function promise_ensure(cb) {
			function _cb() {
				cb();
			}
			this.then(_cb, _cb);
			return this;
		}

		function promise_nodify(cb) {
			return this.then(
				function(a) {
					return isFunc(cb) ? cb.apply(null, isArray(a) ? a.splice(0, 0, undefined) && a : [undefined, a]) : (defer.onlyFuncs ? a : cb);
				},
				function(e) {
					return cb(e);
				}
			);
		}

		function promise_rethrow(failed) {
			return this.then(
				undef, failed ? function(e) {
					failed(e);
					throw e;
				} : rethrow
			);
		}

		var defer = function(alwaysAsync) {
			var alwaysAsyncFn = (undef !== alwaysAsync ? alwaysAsync : defer.alwaysAsync) ? nextTick : function(fn) {
					fn();
				},
				status = 0,
				pendings = [],
				value,
				_promise = {
					then: function(fulfilled, failed) {
						var d = defer();
						pendings.push([
							function(value) {
								try {
									if (isNotVal(fulfilled)) {
										d.resolve(value);
									} else {
										d.resolve(isFunc(fulfilled) ? fulfilled(value) : (defer.onlyFuncs ? value : fulfilled));
									}
								} catch (e) {
									d.reject(e);
								}
							},
							function(err) {
								if (isNotVal(failed) || ((!isFunc(failed)) && defer.onlyFuncs)) {
									d.reject(err);
								}
								if (failed) {
									try {
										d.resolve(isFunc(failed) ? failed(err) : failed);
									} catch (e) {
										d.reject(e);
									}
								}
							}
						]);
						status !== 0 && alwaysAsyncFn(execCallbacks);
						return d.promise;
					},
					success: promise_success,
					error: promise_error,
					otherwise: promise_error,
					apply: promise_apply,
					spread: promise_apply,
					ensure: promise_ensure,
					nodify: promise_nodify,
					rethrow: promise_rethrow,

					isPending: function() {
						return status === 0;
					},

					getStatus: function() {
						return status;
					}
				};

			_promise.toSource = _promise.toString = _promise.valueOf = function() {
				return value === undef ? this : value;
			};


			function execCallbacks() {
				if (status === 0) {
					return;
				}
				var cbs = pendings,
					i = 0,
					l = cbs.length,
					cbIndex = ~status ? 0 : 1,
					cb;
				pendings = [];
				for (; i < l; i++) {
					(cb = cbs[i][cbIndex]) && cb(value);
				}
			}

			function _resolve(val) {
				var done = false;

				function once(f) {
					return function(x) {
						if (done) {
							return undefined;
						} else {
							done = true;
							return f(x);
						}
					};
				}
				if (status) {
					return this;
				}
				try {
					var then = isObjOrFunc(val) && val.then;
					if (isFunc(then)) { // managing a promise
						if (val === _promise) {
							throw new Error("Promise can't resolve itself");
						}
						then.call(val, once(_resolve), once(_reject));
						return this;
					}
				} catch (e) {
					once(_reject)(e);
					return this;
				}
				alwaysAsyncFn(function() {
					value = val;
					status = 1;
					execCallbacks();
				});
				return this;
			}

			function _reject(Err) {
				status || alwaysAsyncFn(function() {
					try {
						throw (Err);
					} catch (e) {
						value = e;
					}
					status = -1;
					execCallbacks();
				});
				return this;
			}
			return {
				promise: _promise,
				resolve: _resolve,
				fulfill: _resolve // alias
					,
				reject: _reject
			};
		};

		defer.deferred = defer.defer = defer;
		defer.nextTick = nextTick;
		defer.alwaysAsync = true;
		defer.onlyFuncs = true;

		defer.resolved = defer.fulfilled = function(value) {
			return defer(true).resolve(value).promise;
		};

		defer.rejected = function(reason) {
			return defer(true).reject(reason).promise;
		};

		defer.wait = function(time) {
			var d = defer();
			setTimeout(d.resolve, time || 0);
			return d.promise;
		};

		defer.delay = function(fn, delay) {
			var d = defer();
			setTimeout(function() {
				try {
					d.resolve(isFunc(fn) ? fn.apply(null) : fn);
				} catch (e) {
					d.reject(e);
				}
			}, delay || 0);
			return d.promise;
		};

		defer.promisify = function(promise) {
			if (promise && isFunc(promise.then)) {
				return promise;
			}
			return defer.resolved(promise);
		};

		function multiPromiseResolver(callerArguments, returnPromises) {
			var promises = slice(callerArguments);
			if (promises.length === 1 && isArray(promises[0])) {
				if (!promises[0].length) {
					return defer.fulfilled([]);
				}
				promises = promises[0];
			}
			var args = [],
				d = defer(),
				c = promises.length;
			if (!c) {
				d.resolve(args);
			} else {
				var resolver = function(i) {
					promises[i] = defer.promisify(promises[i]);
					promises[i].then(
						function(v) {
							args[i] = returnPromises ? promises[i] : v;
							(--c) || d.resolve(args);
						},
						function(e) {
							if (!returnPromises) {
								d.reject(e);
							} else {
								args[i] = promises[i];
								(--c) || d.resolve(args);
							}
						}
					);
				};
				for (var i = 0, l = c; i < l; i++) {
					resolver(i);
				}
			}
			return d.promise;
		}

		function sequenceZenifier(promise, zenValue) {
			return promise.then(isFunc(zenValue) ? zenValue : function() {
				return zenValue;
			});
		}

		function sequencePromiseResolver(callerArguments) {
			var funcs = slice(callerArguments);
			if (funcs.length === 1 && isArray(funcs[0])) {
				funcs = funcs[0];
			}
			var d = defer(),
				i = 0,
				l = funcs.length,
				promise = defer.resolved();
			for (; i < l; i++) {
				promise = sequenceZenifier(promise, funcs[i]);
			}
			d.resolve(promise);
			return d.promise;
		}

		defer.all = function() {
			return multiPromiseResolver(arguments, false);
		};

		defer.resolveAll = function() {
			return multiPromiseResolver(arguments, true);
		};

		defer.sequence = function() {
			return sequencePromiseResolver(arguments);
		};
		return defer;
	})();

	return Syncano;

})();