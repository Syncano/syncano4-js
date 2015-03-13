/*
 * Syncano 4 javascript library
 * ver 4.0.1
 * last changed: 2015-03-13 by Artur Wróbel
 * Copyright 2015 Syncano Inc.
 */

var isNode = false,
	isWebpack = false;
if (typeof module !== 'undefined' && module.exports) {
	isNode = true;
}

if (typeof __webpack_require__ === 'function') {
	isNode = false;
	isWebpack = true;
}

var reqfun = (function(s) {
	return function(s) {
		return eval('require("' + s + '");');
	};
})();

if (isNode) {
	var Request = reqfun('request');
}

var Syncano = (function() {
	/*
		define dummy console if not present in the system
	*/
	if (typeof console === 'undefined') {
		console = {
			log: function() {},
			error: function() {},
			warning: function() {}
		};
	}

	/*
		private variables
	*/

	// base url of all requests - will be changed in final version
	var baseURL = 'https://syncanotest1-env.elasticbeanstalk.com/';

	// main api authorization key - the one used to connect to Syncano or returned when connecting with user/password
	var apiKey = null;

	// object to store current user info
	var accountObject = {};

	// instance you are currently connected to
	var instanceObject = {};

	// object with all links extracted from various requests
	var linksObject = {};

	var tempInstance = null;


	/********************
		PRIVATE METHODS
	*********************/
	function normalizeUrl(url) {
		var baseUrl = url.substr(0, 8);
		if (baseUrl === 'https://') {
			url = url.substr(8);
		} else {
			baseUrl = '';
		}
		if (url.substr(-1) !== '/' && url.indexOf('?') === -1) {
			url += '/';
		}
		return baseUrl + url.replace(/\/\//g, '/');
	}

	function setApiKey(_apiKey) {
		apiKey = _apiKey;
	}

	/*
		Parses obj and search for obj.links.
		If found, copies them to private linksObject with given prefix and removes from obj. 
		All existing links will be overwritten
		Returns:
			linksObject
	*/
	function saveLinks(prefix, obj) {
		if (obj.links) {
			Object.keys(obj.links).forEach(function(key) {
				linksObject[prefix + '_' + key] = obj.links[key];
			});
		}
		delete obj.links;
		return linksObject;
	}

	function prepareAjaxParams(data) {
		var s = [];
		for (var i in data) {
			if (data.hasOwnProperty(i)) {
				s.push(i + '=' + data[i]);
			}
		}
		return s.join('&');
	}

	function ajax(params) {
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
				params.error(request);
			}
		};

		request.send(prepareAjaxParams(params.data));
		return xhr;
	}

	function buildUrlParams(params) {
		var urlParams = [];
		for (var key in params) {
			var val = params[key];
			if (Array.isArray(val)) {
				for (var ii = 0, ll = val.length; ii < ll; ii++) {
					urlParams.push(key + '=' + encodeURIComponent(val[ii]));
				}
			} else if (typeof val === 'object') {
				for (var kk in val) {
					if (val.hasOwnProperty(kk)) {
						var nkey = key + '%5B' + kk + '%5D';
						urlParams.push(nkey + '=' + encodeURIComponent(val[kk]));
					}
				}
			} else {
				urlParams.push(key + '=' + encodeURIComponent(val));
			}
		}
		return urlParams.join('&');
	}

	function nodeRequest(params) {
		var opt = {
			url: params.url,
			method: params.type,
			strictSSL: false,
			body: buildUrlParams(params.data)
		};
		if (params.type !== 'GET') {
			opt.headers = {
				'content-type': 'application/x-www-form-urlencoded',
				'user-agent': 'syncano-nodejs-4.0'
			};
		}
		Request(opt, function(error, response, body) {
			if (response.statusCode >= 200 && response.statusCode < 400) {
				var data = '';
				try {
					data = JSON.parse(body);
				} catch (e) {};
				params.success(data);
			} else {
				params.error({
					responseText: body
				});
			}
		});
	}

	function prepareObjectToBeUpdated(obj) {
		var fieldsToDelete = ['updated_at', 'created_at', 'revision', 'links'];
		for (var i = 0; i < fieldsToDelete.length; i++) {
			delete obj[fieldsToDelete[i]];
		}
		return obj;
	}

	/*
		Helper method to convert list of objects returned from Syncano to object
	*/
	function createList(lib, data) {
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
	}

	function extendClassObject(lib, obj) {
		Object.defineProperty(obj, 'createDataObject', {
			value: function(params, callbackOK, callbackError) {
				return lib.createDataObject(obj.name, params, callbackOK, callbackError);
			},
			writable: false,
			enumerable: false,
			configurable: false
		});
	}


	/**
	 * Creates Syncano object
	 *
	 * @constructor
	 * @class Syncano
	 * @param {object|string} [param] - either name of the instance to connect to or object with instance attribute
	 */
	function Syncano(param) {
		if (typeof param === 'string') {
			tempInstance = param;
		} else if (typeof param === 'object' && typeof param.instance === 'string') {
			tempInstance = param.instance;
		}

		/**
		 * Object with methods to handle Accounts
		 *
		 * @alias Syncano#Accounts
		 * @type {object}
		 * @property {function} create - shortcut to {@link Syncano#createAccount} method
		 * @property {function} get - shortcut to {@link Syncano#getAccount} method
		 * @property {function} update - shortcut to {@link Syncano#updateAccount} method
		 * @property {function} resetKey - shortcut to {@link Syncano#resetAccountKey} method
		 */
		this.Accounts = {
			create: this.createAccount.bind(this),
			get: this.getAccount.bind(this),
			update: this.updateAccount.bind(this),
			resetKey: this.resetAccountKey.bind(this)
		};

		/**
		 * Object with methods to handle Instances
		 *
		 * @alias Syncano#Instances
		 * @type {object}
		 * @property {function} create - shortcut to {@link Syncano#createInstance} method
		 * @property {function} list - shortcut to {@link Syncano#listInstances} method
		 * @property {function} get - shortcut to {@link Syncano#getInstance} method
		 * @property {function} remove - shortcut to {@link Syncano#removeInstance} method
		 * @property {function} update - shortcut to {@link Syncano#updateInstance} method
		 * @property {function} listAdmins - shortcut to {@link Syncano#listInstanceAdmins} method
		 */
		this.Instances = {
			create: this.createInstance.bind(this),
			list: this.listInstances.bind(this),
			get: this.getInstance.bind(this),
			remove: this.removeInstance.bind(this),
			update: this.updateInstance.bind(this),
			listAdmins: this.listInstanceAdmins.bind(this)
		};

		/**
		 * Object with methods to handle Classes
		 *
		 * @alias Syncano#Classes
		 * @type {object}
		 * @property {function} create - shortcut to {@link Syncano#createClass} method
		 * @property {function} list - shortcut to {@link Syncano#listClasses} method
		 * @property {function} get - shortcut to {@link Syncano#getClass} method
		 * @property {function} remove - shortcut to {@link Syncano#removeClass} method
		 * @property {function} update - shortcut to {@link Syncano#updateClass} method
		 */
		this.Classes = {
			create: this.createClass.bind(this),
			list: this.listClasses.bind(this),
			remove: this.removeClass.bind(this),
			get: this.getClass.bind(this),
			update: this.updateClass.bind(this)
		};

		/**
		 * Object with methods to handle DataObjects
		 *
		 * @alias Syncano#DataObjects
		 * @type {object}
		 * @property {function} create - shortcut to {@link Syncano#createDataObject} method
		 * @property {function} list - shortcut to {@link Syncano#listDataObjects} method
		 * @property {function} get - shortcut to {@link Syncano#getDataObject} method
		 * @property {function} remove - shortcut to {@link Syncano#removeDataObject} method
		 * @property {function} update - shortcut to {@link Syncano#updateDataObject} method
		 */
		this.DataObjects = {
			create: this.createDataObject.bind(this),
			list: this.listDataObjects.bind(this),
			remove: this.removeDataObject.bind(this),
			get: this.getDataObject.bind(this),
			update: this.updateDataObject.bind(this)
		};

		/**
		 * Object with methods to handle ApiKeys
		 *
		 * @alias Syncano#ApiKeys
		 * @type {object}
		 * @property {function} create - shortcut to {@link Syncano#createApiKey} method
		 * @property {function} list - shortcut to {@link Syncano#listApiKeys} method
		 * @property {function} get - shortcut to {@link Syncano#getApiKey} method
		 * @property {function} remove - shortcut to {@link Syncano#removeApiKey} method
		 */
		this.ApiKeys = {
			create: this.createApiKey.bind(this),
			list: this.listApiKeys.bind(this),
			get: this.getApiKey.bind(this),
			remove: this.removeApiKey.bind(this)
		};

		/**
		 * Object with methods to handle CodeBoxes
		 *
		 * @alias Syncano#CodeBoxes
		 * @type {object}
		 * @property {function} create - shortcut to {@link Syncano#createCodeBox} method
		 * @property {function} list - shortcut to {@link Syncano#listCodeBoxes} method
		 * @property {function} get - shortcut to {@link Syncano#getCodeBox} method
		 * @property {function} remove - shortcut to {@link Syncano#removeCodeBox} method
		 * @property {function} update - shortcut to {@link Syncano#updateCodeBox} method
		 * @property {function} listRuntimes - shortcut to {@link Syncano#listCodeBoxRuntimes} method
		 */
		this.CodeBoxes = {
			create: this.createCodeBox.bind(this),
			list: this.listCodeBoxes.bind(this),
			listRuntimes: this.listCodeBoxRuntimes.bind(this),
			get: this.getCodeBox.bind(this),
			update: this.updateCodeBox.bind(this),
			remove: this.removeCodeBox.bind(this)
		};

		/**
		 * Object with methods to handle Invitations
		 *
		 * @alias Syncano#Invitations
		 * @type {object}
		 * @property {function} create - shortcut to {@link Syncano#createInvitation} method
		 * @property {function} list - shortcut to {@link Syncano#listInvitations} method
		 * @property {function} get - shortcut to {@link Syncano#getInvitation} method
		 * @property {function} remove - shortcut to {@link Syncano#removeInvitation} method
		 */
		this.Invitations = {
			create: this.createInvitation.bind(this),
			list: this.listInvitations.bind(this),
			get: this.getInvitation.bind(this),
			remove: this.removeInvitation.bind(this)
		};

		/**
		 * Object with methods to handle WebHooks
		 *
		 * @alias Syncano#WebHooks
		 * @type {object}
		 * @property {function} create - shortcut to {@link Syncano#createWebHook} method
		 * @property {function} list - shortcut to {@link Syncano#listWebHooks} method
		 * @property {function} get - shortcut to {@link Syncano#getWebHook} method
		 * @property {function} remove - shortcut to {@link Syncano#removeWebHook} method
		 * @property {function} update - shortcut to {@link Syncano#updateWebHook} method
		 * @property {function} run - shortcut to {@link Syncano#runWebHook} method
		 */
		this.WebHooks = {
			create: this.createWebHook.bind(this),
			list: this.listWebHooks.bind(this),
			get: this.getWebHook.bind(this),
			update: this.updateWebHook.bind(this),
			remove: this.removeWebHook.bind(this),
			run: this.runWebHook.bind(this)
		};

		/**
		 * Object with methods to handle Triggers
		 *
		 * @alias Syncano#Triggers
		 * @type {object}
		 * @property {function} create - shortcut to {@link Syncano#createTrigger} method
		 * @property {function} list - shortcut to {@link Syncano#listTriggers} method
		 * @property {function} get - shortcut to {@link Syncano#getTrigger} method
		 * @property {function} remove - shortcut to {@link Syncano#removeTrigger} method
		 * @property {function} update - shortcut to {@link Syncano#updateTrigger} method
		 */
		this.Triggers = {
			create: this.createTrigger.bind(this),
			list: this.listTriggers.bind(this),
			get: this.getTrigger.bind(this),
			update: this.updateTrigger.bind(this),
			remove: this.removeTrigger.bind(this),
		};

		/**
		 * Object with methods to handle Schedules
		 *
		 * @alias Syncano#Schedules
		 * @type {object}
		 * @property {function} create - shortcut to {@link Syncano#createSchedule} method
		 * @property {function} list - shortcut to {@link Syncano#listSchedules} method
		 * @property {function} get - shortcut to {@link Syncano#getSchedule} method
		 * @property {function} remove - shortcut to {@link Syncano#removeSchedule} method
		 * @property {function} traces - shortcut to {@link Syncano#listScheduleTraces} method
		 * @property {function} trace - shortcut to {@link Syncano#getScheduleTrace} method
		 */
		this.Schedules = {
			create: this.createSchedule.bind(this),
			list: this.listSchedules.bind(this),
			get: this.getSchedule.bind(this),
			remove: this.removeSchedule.bind(this),
			traces: this.listScheduleTraces.bind(this),
			trace: this.getScheduleTrace.bind(this)
		};
	}


	Syncano.prototype = {

		/**
		 * Connects to Syncano using either auth token (api key) or email / password.
		 * Calls proper auth method based on arguments passed.
		 *
		 * @method Syncano#connect
		 * @param {string} identifier - email or token
		 * @param {string} [password] - used only if first parameter is email
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object}	promise
		 *
		 * @example
		 * var s = new Syncano('instance-name');
		 * s.connect('email', 'password').then(function(){
		 *     alert('connected');
		 * });
		 */
		connect: function() {
			var promise;
			if (arguments.length >= 2 && arguments[0].indexOf('@') > 0) {
				// arguments are: email and password and optional callbacks
				promise = this.authWithPassword.apply(this, arguments);
				if (tempInstance !== null) {
					promise = promise.then(function() {
						return this.setInstance(tempInstance);
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

		/**
		 * Connects to Syncano using email and password
		 *
		 * @method Syncano#authWithPassword
		 * @param {string} email
		 * @param {string} password
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 *
		 * @example
		 * var s = new Syncano('instance-name');
		 * s.authWithPassword('email', 'password').then(function(){
		 *     alert('connected');
		 * });
		 */
		authWithPassword: function(email, password, callbackOK, callbackError) {
			var params = {
				email: email,
				password: password
			};
			return this.request('POST', 'v1/account/auth', params, function(res) {
				accountObject = res;
				setApiKey(res.account_key);
				typeof callbackOK === 'function' && callbackOK(res);
			}.bind(this), callbackError);
		},

		/**
		 * Connects to Syncano using email and password
		 *
		 * @method Syncano#authWithApiKey
		 * @param  {string} email
		 * @param  {string} password
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 *
		 * @example
		 * var s = new Syncano('instance-name');
		 * s.authWithApiKey('api-key').then(function(){
		 *     alert('connected');
		 * });
		 */
		authWithApiKey: function(apiKey, callbackOK) {
			setApiKey(apiKey);
			var deferred = Deferred();
			accountObject = {
				account_key: apiKey
			};
			typeof callbackOK === 'function' && callbackOK(accountObject);
			deferred.resolve(accountObject);
			return deferred.promise;
		},


		/**
		 * Checks if instance exists and stores its information in private instanceObject
		 *
		 * @method Syncano#setInstance
		 * @param {string} instanceName
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		setInstance: function(instanceName, callbackOK, callbackError) {
			return this.request('GET', 'v1/instances/' + instanceName, {}, function(result) {
				instanceObject = result;
				saveLinks('instance', result);
				typeof callbackOK === 'function' && callbackOK(result);
			}.bind(this), callbackError);
		},

		/**
		 * Returns object with private informations: account, instance and links
		 *
		 * @method Syncano#getInfo
		 * @return {object}
		 */
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
		/**
		 * Creates new instance using passed parameters.
		 *
		 * @method Syncano#createInstance
		 * @alias Syncano.Instances.create
		 * @param {object} params
		 * @param {string} params.name - name of the instance
		 * @param {string} [description] - optional description of the instance
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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

		/**
		 * Returns all defined instances as a list
		 *
		 * @method Syncano#listInstances
		 * @alias Syncano.Instances.list
		 * @param  {object} [params]
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		listInstances: function(params, callbackOK, callbackError) {
			params = params || {};
			return this.request('GET', 'v1/instances', params, callbackOK, callbackError);
		},

		/**
		 * Returns details of the instance with specified name
		 *
		 * @method Syncano#getInstance
		 * @alias Syncano.Instances.get
		 * @param {string|object} name
		 * @param {string} name.name - when passed parameter is an object, we use its name property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		getInstance: function(name, callbackOK, callbackError) {
			if (typeof name === 'object') {
				name = name.name;
			}
			if (typeof name === 'undefined' || name.length === 0) {
				throw new Error('Missing instance name');
			}
			return this.request('GET', 'v1/instances/' + name, {}, callbackOK, callbackError);
		},

		/**
		 * Removes instance identified by specified name
		 *
		 * @method Syncano#removeInstance
		 * @alias Syncano.Instances.remove
		 * @param {string|object} name
		 * @param {string} name.name - when passed parameter is an object, we use its name property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		removeInstance: function(name, callbackOK, callbackError) {
			if (typeof name === 'object') {
				name = name.name;
			}
			if (typeof name === 'undefined' || name.length === 0) {
				throw new Error('Missing instance name');
			}
			return this.request('DELETE', 'v1/instances/' + name, {}, callbackOK, callbackError);
		},

		/**
		 * Updates instance identified by specified name
		 *
		 * @method Syncano#updateInstance
		 * @alias Syncano.Instances.update
		 * @param {string} name - name of the instance to change
		 * @param {Object} params - new values of the instance parameters
		 * @param {string} params.name - new name of the instance
		 * @param {string} params.description - new description of the instance
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {Object} promise
		 */
		updateInstance: function(name, params, callbackOK, callbackError) {
			if (typeof name === 'undefined' || name.length === 0) {
				throw new Error('Missing instance name');
			}
			return this.request('PATCH', 'v1/instances/' + name, params, callbackOK, callbackError);
		},

		/**
		 * Returns all defined instance admins as a list
		 *
		 * @method Syncano#listInstanceAdmins
		 * @alias Syncano.Instances.listAdmins
		 * @param  {object} [params]
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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
		/**
		 * Creates new class based on passed parameters
		 *
		 * @method Syncano#createClass
		 * @alias Syncano.Classes.create
		 * @param {Object} params - values of the class parameters
		 * @param {string} params.name - name of the class
		 * @param {string} params.description - description of the class
		 * @param {string|object} params.schema - schema object or string
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
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
				saveLinks('class_' + params.name, result);
				typeof callbackOK === 'function' && callbackOK(result);
			}.bind(this), callbackError);
		},

		/**
		 * Returns all defined classes as a list
		 *
		 * @method Syncano#listClasses
		 * @alias Syncano.Classes.list
		 * @param  {object} [params]
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		listClasses: function(params, callbackOK, callbackError) {
			return this.genericList(params, 'instance_classes', callbackOK, callbackError);
		},

		/**
		 * Removes class identified by specified name
		 *
		 * @method Syncano#removeClass
		 * @alias Syncano.Classes.remove
		 * @param {string|object} name
		 * @param {string} name.name - when passed parameter is an object, we use its name property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		removeClass: function(name, callbackOK, callbackError) {
			return this.genericRemove(name, 'instance_classes', callbackOK, callbackError);
		},

		/**
		 * Returns details of the class with specified name
		 *
		 * @method Syncano#getClass
		 * @alias Syncano.Classes.get
		 * @param {string|object} name
		 * @param {string} name.name - when passed parameter is an object, we use its name property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		getClass: function(name, callbackOK, callbackError) {
			return this.genericGet(name, 'instance_classes', function(obj) {
				extendClassObject(this, obj);
				if (typeof callbackOK === 'function') {
					callbackOK();
				}
			}.bind(this), callbackError);
		},

		/**
		 * Updates class identified by specified name
		 *
		 * @method Syncano#updateClass
		 * @alias Syncano.Classes.update
		 * @param {string} name - name of the class to change
		 * @param {Object} params - new values of the class parameters
		 * @param {string} params.name - new name of the class
		 * @param {string} params.description - new description of the class
		 * @param {string|object} params.schema - schema object or string
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {Object} promise
		 */
		updateClass: function(name, params, callbackOK, callbackError) {
			if (typeof linksObject.instance_classes === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			if (typeof name === 'object') {
				params = name;
				name = name.name;
				delete params.name;
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
		/**
		 * Registers new account
		 *
		 * @method Syncano#createAccount
		 * @alias Syncano.Accounts.create
		 * @param {object} params
		 * @param {string} params.email
		 * @param {string} params.password
		 * @param {string} params.first_name
		 * @param {string} params.last_name
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		createAccount: function(params, callbackOK, callbackError) {
			return this.request('POST', 'v1/account/register/', params, callbackOK, callbackError);
		},

		/**
		 * Returns details of the currently logged user
		 *
		 * @method Syncano#getAccount
		 * @alias Syncano.Accounts.get
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		getAccount: function(callbackOK, callbackError) {
			return this.request('GET', 'v1/account/', {}, callbackOK, callbackError);
		},

		/**
		 * Updates account of the currently logged user
		 *
		 * @method Syncano#updateAccount
		 * @alias Syncano.Accounts.update
		 * @param {Object} params - new values of the account parameters
		 * @param {string} params.email - new email address
		 * @param {string} params.first_name - new first name of the user
		 * @param {string} params.last_name - new last name of the user
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {Object} promise
		 */
		updateAccount: function(params, callbackOK, callbackError) {
			return this.request('PUT', 'v1/account/', params, callbackOK, callbackError);
		},

		/**
		 * Sets new auth key for api calls and removes previous one.
		 *
		 * @method  Syncano#resetAccountKey
		 * @alias Syncano.Accounts.resetKey
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {Object} promise
		 */
		resetAccountKey: function(callbackOK, callbackError) {
			return this.request('POST', 'v1/account/reset_key', {}, callbackOK, callbackError);
		},

		/***********************
		   DATA OBJECT METHODS
		************************/
		/**
		 * Creates new data object within given class
		 *
		 * @method Syncano#createDataObject
		 * @alias Syncano.DataObjects.create
		 * @param {string} className - name of the class object belongs to
		 * @param {Object} params - values of the data object parameters (as defined in class definition)
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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

		/**
		 * Returns all data objects withing a single class as a list
		 *
		 * @method Syncano#listDataObjects
		 * @alias Syncano.DataObjects.list
		 * @param {string} className
		 * @param {object} [params]
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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

		/**
		 * Removes data object identified by specified id and className
		 *
		 * @method Syncano#removeDataObject
		 * @alias Syncano.DataObjects.remove
		 * @param {string} className - name of the class object belongs to
		 * @param {Number|object} params - data object or its it
		 * @param {Number} params.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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

		/**
		 * Returns details of the data object with specified id and class
		 *
		 * @method Syncano#getDataObject
		 * @alias Syncano.DataObjects.get
		 * @param {string} className
		 * @param {Number|object} params - when passed parameter is a number we treat it as an id of the data object
		 * @param {Number} params.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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

		/**
		 * Updates data object identified by given id and className
		 *
		 * @method Syncano#updateDataObject
		 * @alias Syncano.DataObjects.update
		 * @param {string} className - name of the class object belongs to
		 * @param {Object} params - new values of the data object parameters (as defined in class definition)
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {Object} promise
		 */
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
			params = prepareObjectToBeUpdated(params);
			var methodName = linksObject.instance_classes + className + '/objects/' + id;
			return this.request('PATCH', methodName, params, callbackOK, callbackError);
		},

		/********************
		   API KEYS METHODS
		*********************/
		/**
		 * Creates new api key
		 *
		 * @method  Syncano#createApiKey
		 * @alias Syncano.ApiKeys.create
		 * @param  {object} params
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		createApiKey: function(params, callbackOK, callbackError) {
			params = params || {};
			if (typeof linksObject.instance_api_keys === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			return this.request('POST', linksObject.instance_api_keys, params, callbackOK, callbackError);
		},

		/**
		 * Returns all defined api keys as a list
		 *
		 * @method Syncano#listApiKeys
		 * @alias Syncano.ApiKeys.list
		 * @param  {object} [params]
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		listApiKeys: function(params, callbackOK, callbackError) {
			return this.genericList(params, 'instance_api_keys', callbackOK, callbackError);
		},

		/**
		 * Returns the API key with specified id
		 *
		 * @method Syncano#getApiKey
		 * @alias Syncano.ApiKeys.get
		 * @param {Number|object} id
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		getApiKey: function(id, callbackOK, callbackError) {
			return this.genericGet(id, 'instance_api_keys', callbackOK, callbackError);
		},

		/**
		 * Removes API key identified by specified id
		 *
		 * @method Syncano#removeApiKey
		 * @alias Syncano.ApiKeys.remove
		 * @param {Number|object} id - identifier of the api key to remove
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		removeApiKey: function(id, callbackOK, callbackError) {
			return this.genericRemove(id, 'instance_api_keys', callbackOK, callbackError);
		},


		/*********************
		   CODEBOXES METHODS
		**********************/
		/**
		 * Creates new codebox
		 *
		 * @method Syncano#createCodeBox
		 * @alias Syncano.CodeBoxes.create
		 * @param {object} params
		 * @param {string} params.runtime_name - python / nodejs / ruby
		 * @param {string} params.name - name of the codebox
		 * @param {string} params.source - source code (will be automatically URL-encoded)
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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
			if (typeof params.source !== 'undefined') {
				params.source = encodeURIComponent(params.source);
			}
			return this.request('POST', linksObject.instance_codeboxes, params, callbackOK, callbackError);
		},

		/**
		 * Returns all defined codeboxes as a list
		 *
		 * @method Syncano#listCodeBoxes
		 * @alias Syncano.CodeBoxes.list
		 * @param  {object} [params]
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		listCodeBoxes: function(params, callbackOK, callbackError) {
			return this.genericList(params, 'instance_codeboxes', callbackOK, callbackError);
		},

		/**
		 * Returns all runtime types for codeboxes as a list
		 *
		 * @method Syncano#listCodeBoxRuntimes
		 * @alias Syncano.CodeBoxes.listRuntimes
		 * @param  {object} [params]
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		listCodeBoxRuntimes: function(params, callbackOK, callbackError) {
			return this.genericList(params, 'instance_runtimes', callbackOK, callbackError);
		},

		/**
		 * Returns the codebox with specified id
		 *
		 * @method Syncano#getCodeBox
		 * @alias Syncano.CodeBoxes.get
		 * @param {Number|object} id
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		getCodeBox: function(id, callbackOK, callbackError) {
			return this.genericGet(id, 'instance_codeboxes', callbackOK, callbackError);
		},

		/**
		 * Updates codebox identified by specified id
		 *
		 * @method Syncano#updateCodeBox
		 * @alias Syncano.CodeBoxes.update
		 * @param {Number} id - codebox id
		 * @param {Object} params - new values of the codebox parameters
		 * @param {string} params.config -
		 * @param {string} params.runtime_name - nodejs / python / ruby
		 * @param {string} params.name - new codebox name
		 * @param {string} params.description -
		 * @param {string} params.source - source code in Node.js / Python / Ruby
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {Object} promise
		 */
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
			if (typeof params.source !== 'undefined') {
				params.source = encodeURIComponent(params.source);
			}
			return this.request('PATCH', linksObject.instance_codeboxes + id, params, callbackOK, callbackError);
		},

		/**
		 * Removes CodeBox identified by specified id
		 *
		 * @method Syncano#removeCodeBox
		 * @alias Syncano.CodeBoxes.remove
		 * @param {Number|object} id - identifier of the CodeBox to remove
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		removeCodeBox: function(id, callbackOK, callbackError) {
			return this.genericRemove(id, 'instance_codeboxes', callbackOK, callbackError);
		},


		/***********************
		   INVITATIONS METHODS
		************************/
		/**
		 * Invites new person to your instance
		 *
		 * @method Syncano#createInvitation
		 * @alias Syncano.Invitations.create
		 * @param  {object} params
		 * @param  {string} params.email - email of the person you are inviting
		 * @param  {string} params.role - read / write / admin
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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

		/**
		 * Returns all created invitations as a list
		 *
		 * @method Syncano#listInvitations
		 * @alias Syncano.Invitations.list
		 * @param  {object} [params]
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		listInvitations: function(params, callbackOK, callbackError) {
			return this.genericList(params, 'instance_invitations', callbackOK, callbackError);
		},

		/**
		 * Returns the invitation with specified id
		 *
		 * @method Syncano#getInvitation
		 * @alias Syncano.Invitations.get
		 * @param {Number|object} id
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		getInvitation: function(id, callbackOK, callbackError) {
			return this.genericGet(id, 'instance_invitations', callbackOK, callbackError);
		},

		/**
		 * Removes invitation identified by specified id
		 *
		 * @method Syncano#removeInvitation
		 * @alias Syncano.Invitations.remove
		 * @param {Number|object} id - identifier of the invitation to remove
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		removeInvitation: function(id, callbackOK, callbackError) {
			return this.genericRemove(id, 'instance_invitations', callbackOK, callbackError);
		},

		/********************
		   WEBHOOKS METHODS
		*********************/
		/**
		 * Creates new webhook.
		 *
		 * @method Syncano#createWebHook
		 * @alias Syncano.WebHooks.create
		 * @param {object} params
		 * @param {string} params.slug
		 * @param {Number} params.codebox
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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

		/**
		 * Returns all defined webhooks as a list
		 *
		 * @method Syncano#listWebHooks
		 * @alias Syncano.WebHooks.list
		 * @param  {object} [params]
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		listWebHooks: function(params, callbackOK, callbackError) {
			return this.genericList(params, 'instance_webhooks', callbackOK, callbackError);
		},

		/**
		 * Returns the webhook with specified id
		 *
		 * @method Syncano#getWebHook
		 * @alias Syncano.WebHooks.get
		 * @param {Number|object} id
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		getWebHook: function(id, callbackOK, callbackError) {
			return this.genericGet(id, 'instance_webhooks', callbackOK, callbackError);
		},

		/**
		 * Removes Webhook identified by specified id
		 *
		 * @method Syncano#removeWebHook
		 * @alias Syncano.WebHooks.remove
		 * @param {Number|object} id - identifier of the webhook to remove
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		removeWebHook: function(id, callbackOK, callbackError) {
			return this.genericRemove(id, 'instance_webhooks', callbackOK, callbackError);
		},

		/**
		 * Updates webhook identified by specified id
		 *
		 * @method Syncano#updateWebHook
		 * @alias Syncano.WebHooks.update
		 * @param {Number} id - webhook id
		 * @param {Object} params - new values of the webhook parameters
		 * @param {string} params.slug -
		 * @param {Number} params.codebox -
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {Object} promise
		 */
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

		/**
		 * Runs defined webhook.
		 *
		 * @method Syncano#runWebHook
		 * @alias Syncano.WebHooks.run
		 * @param  {Number} id - identifier of the webhook
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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
		/**
		 * Creates new trigger
		 *
		 * @method Syncano#createTrigger
		 * @alias Syncano.Triggers.create
		 * @param {object} params
		 * @param {string} params.klass - name of the objects class
		 * @param {Number} params.codebox - codebox to run
		 * @param {string} params.signal - when to run codebox (possible values: post_create, post_update, post_delete)
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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

		/**
		 * Returns all defined triggers as a list
		 *
		 * @method Syncano#listTriggers
		 * @alias Syncano.Triggers.list
		 * @param  {object} [params]
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		listTriggers: function(params, callbackOK, callbackError) {
			return this.genericList(params, 'instance_triggers', callbackOK, callbackError);
		},

		/**
		 * Returns the trigger with specified id
		 *
		 * @method Syncano#getTrigger
		 * @alias Syncano.Triggers.get
		 * @param {Number|object} id
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		getTrigger: function(id, callbackOK, callbackError) {
			return this.genericGet(id, 'instance_triggers', callbackOK, callbackError);
		},

		/**
		 * Updates trigger identified by specified id
		 *
		 * @method Syncano#updateTrigger
		 * @alias Syncano.Triggers.update
		 * @param {Number} id - trigger id
		 * @param {Object} params - new values of the trigger parameters
		 * @param {string} params.klass -
		 * @param {string} params.signal - post_update / post_create / post_delete
		 * @param {Number} params.codebox - new codebox id
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {Object} promise
		 */
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

		/**
		 * Removes trigger identified by specified id
		 *
		 * @method Syncano#removeTrigger
		 * @alias Syncano.Triggers.remove
		 * @param {Number|object} id - identifier of the trigger to remove
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		removeTrigger: function(id, callbackOK, callbackError) {
			return this.genericRemove(id, 'instance_triggers', callbackOK, callbackError);
		},

		/********************
		   SCHEDULES METHODS
		*********************/
		/**
		 * Creates new schedule
		 *
		 * @method Syncano#createSchedule
		 * @alias Syncano.Schedules.create
		 * @param {object} params
		 * @param {string} params.name - name of the new schedule
		 * @param {Number} params.codebox - codebox to run
		 * @param {string} params.interval_sec - how often (in seconds) the schedule should run
		 * @param {string} params.crontab - ???
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		createSchedule: function(params, callbackOK, callbackError) {
			if (typeof params !== 'object') {
				throw new Error('Missing parameters object');
			}
			if (typeof params.codebox === 'object') {
				params.codebox = params.codebox.id;
			}
			if (typeof linksObject.instance_schedules === 'undefined') {
				throw new Error('Not connected to any instance');
			}
			return this.request('POST', linksObject.instance_schedules, params, callbackOK, callbackError);
		},

		/**
		 * Returns all defined schedules as a list
		 *
		 * @method Syncano#listSchedules
		 * @alias Syncano.Schedules.list
		 * @param  {object} [params]
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		listSchedules: function(params, callbackOK, callbackError) {
			return this.genericList(params, 'instance_schedules', callbackOK, callbackError);
		},

		/**
		 * Returns the schedule with specified id
		 *
		 * @method Syncano#getSchedule
		 * @alias Syncano.Schedules.get
		 * @param {Number|object} id
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		getSchedule: function(id, callbackOK, callbackError) {
			return this.genericGet(id, 'instance_schedules', callbackOK, callbackError);
		},

		/**
		 * Removes schedule identified by specified id
		 *
		 * @method Syncano#removeSchedule
		 * @alias Syncano.Schedules.remove
		 * @param {Number|object} id - identifier of the schedule to remove
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		removeSchedule: function(id, callbackOK, callbackError) {
			return this.genericRemove(id, 'instance_schedules', callbackOK, callbackError);
		},

		/**
		 * List all traces for single schedule
		 *
		 * @method Syncano#listScheduleTraces
		 * @alias Syncano.Schedules.traces
		 * @param {Number|object} scheduleId
		 * @param {object} [params]
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		listScheduleTraces: function(scheduleId, params, callbackOK, callbackError) {
			if (typeof scheduleId === 'object') {
				scheduleId = scheduleId.id;
			}
			return this.request('GET', linksObject.instance_schedules + scheduleId + '/traces/', params, callbackOK, callbackError);
		},

		/**
		 * Get single trace for single schedule
		 *
		 * @method Syncano#getScheduleTrace
		 * @alias Syncano.Schedules.trace
		 * @param {Number|object} scheduleId
		 * @param {Number|object} traceId
		 * @param {object} [params]
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		getScheduleTrace: function(scheduleId, traceId, params, callbackOK, callbackError) {
			if (typeof scheduleId === 'object') {
				scheduleId = scheduleId.id;
			}
			if (typeof traceId === 'object') {
				traceId = traceId.id;
			}
			return this.request('GET', linksObject.instance_schedules + scheduleId + '/traces/' + traceId + '/', params, callbackOK, callbackError);
		},


		/********************
		   GENERIC METHODS
		*********************/
		/*
			These methods are used internally by other list*, get* and remove* methods
		 */
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

		/**
		 * Generic request method. Sends request to Syncano backend via XMLHttpRequest (in browser) or Request module (in Node.js)
		 *
		 * @method Syncano#request
		 * @param {string} requestType - GET / POST / PUT / PATCH / DELETE
		 * @param {string} method - Syncano API method to call
		 * @param {object} params -  - parameters to API call
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
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
					url += (url.indexOf('?') === -1 ? '?' : '&') + 'api_key=' + apiKey + '&format=json';
				}
				var ajaxParams = {
					type: requestType,
					url: url,
					data: params
				};
				ajaxParams.success = function(data) {
					if (typeof data === 'object' && typeof data.objects !== 'undefined' && typeof data.prev !== 'undefined' && typeof data.next !== 'undefined') {
						callbackOK(createList(this, data));
					} else {
						callbackOK(data);
					}
				}.bind(this);

				ajaxParams.error = function(xhr) {
					var err = 'Error sending request: ' + method;
					if (xhr.responseText) {
						try {
							err = JSON.parse(xhr.responseText);
							if (err.detail) {
								err = err.detail;
							}
						} catch (e) {
							err = xhr.responseText;
						};
					}
					callbackError(err);
				};

				if (!isNode) {
					ajax(ajaxParams);
				} else if (isNode) {
					nodeRequest(ajaxParams);
				}
			}
			return deferred.promise;
		}
	};

	/**
	 * Schema is the builder for the classes definition
	 *
	 * @constructor
	 * @class Syncano.Schema
	 *
	 * @example
	 * var schema = new Syncano.Schema()
	 *   .addField('last_name', 'string').addOrderIndex()
	 *   .addField('year_of_birth', 'integer').addFilterIndex()
	 *   .toString();
	 */
	Syncano.Schema = function() {
		this.data = [];
	};

	Syncano.Schema.prototype = {
		/**
		 * Adds new field to the schema
		 *
		 * @method Syncano.Schema#addField
		 * @param {string} name - name of the field
		 * @param {string} type - string / text / integer / float / boolean / datetime / file / reference
		 * @param {string} target - if type equals 'reference', target describes className of the reference object
		 * @return {object} this - Schema object
		 */
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

		/**
		 * Defines that last added field can be used in order_by query
		 *
		 * @method Syncano.Schema#addOrderIndex
		 * @return {object} this - Schema object
		 */
		addOrderIndex: function() {
			this.data[this.data.length - 1]['order_index'] = true;
			return this;
		},

		/**
		 * Defines that last added field can be used for filtering objects
		 *
		 * @method Syncano.Schema#addFilterIndex
		 * @return {object} this - Schema object
		 */
		addFilterIndex: function() {
			this.data[this.data.length - 1]['filter_index'] = true;
			return this;
		},

		/**
		 * Converts schema to string (used internally)
		 *
		 * @method Syncano.Schema#toString
		 * @return {string}
		 */
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

if (isNode || isWebpack) {
	module.exports = Syncano;
}