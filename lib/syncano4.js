/*
 * Syncano 4 javascript library
 * ver 4.0.1
 * last changed: 2015-02-05 by Artur Wróbel
 * Copyright 2015 Syncano Inc.
 */

var isNode = false;
if (typeof module !== 'undefined' && module.exports) {
	isNode = true;
}

if (isNode) {
	var Request = require('request');
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

	/*
		private methods
	*/
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
	}


	Syncano.prototype = {

		/**
		 * Connects to Syncano using either auth token (api key) or email / password.
		 * Calls proper auth method based on arguments passed.
		 *
		 * @method Syncano#connect
		 * @param {string} email or token
		 * @param {string} [password] - used only if first parameter is email
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object}	promise
		 */
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

		/**
		 * Connects to Syncano using email and password
		 *
		 * @method Syncano#authWithPassword
		 * @param {string} email
		 * @param {string} password
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
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

		/**
		 * Returns all defined instance admins as a list
		 *
		 * @method Syncano#listInstanceAdmins
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
				saveLinks('class_' + params.name, result);
				typeof callbackOK === 'function' && callbackOK(result);
			}.bind(this), callbackError);
		},

		/**
		 * Returns all defined classes as a list
		 *
		 * @method Syncano#listClasses
		 * @param  {object} [params]
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
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

		/**
		 * Returns details of the class with specified name
		 *
		 * @method Syncano#getClass
		 * @param {string|object} name
		 * @param {string} name.name - when passed parameter is an object, we use its name property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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

		/**
		 * Returns details of the currently logged user
		 *
		 * @method Syncano#getAccount
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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

		/**
		 * Returns all data objects withing a single class as a list
		 *
		 * @method Syncano#listDataObjects
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

		/**
		 * Returns all defined api keys as a list
		 *
		 * @method Syncano#listApiKeys
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
		 * @param {Number|object} id
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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

		/**
		 * Returns all defined codeboxes as a list
		 *
		 * @method Syncano#listCodeBoxes
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
		 * @param  {object} [params]
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
		listCodeBoxRuntimes: function(params, callbackOK, callbackError) {
			return this.genericList(params, 'instance_codebox_runtimes', callbackOK, callbackError);
		},

		/**
		 * Returns the codebox with specified id
		 *
		 * @method Syncano#getCodeBox
		 * @param {Number|object} id
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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

		/**
		 * Returns all created invitations as a list
		 *
		 * @method Syncano#listInvitations
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
		 * @param {Number|object} id
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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

		/**
		 * Returns all defined webhooks as a list
		 *
		 * @method Syncano#listWebHooks
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
		 * @param {Number|object} id
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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

		/**
		 * Returns all defined triggers as a list
		 *
		 * @method Syncano#listTriggers
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
		 * @param {Number|object} id
		 * @param {Number} id.id - when passed parameter is an object, we use its id property
		 * @param {function} [callbackOK] - optional method to call on success
		 * @param {function} [callbackError] - optional method to call when request fails
		 * @returns {object} promise
		 */
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
				}.bind(this);

				if (!isNode) {
					this.ajax(ajaxParams);
				} else if (isNode) {
					this.nodeRequest(ajaxParams);
				}
			}
			return deferred.promise;
		},

		buildUrlParams: function(params) {
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
		},

		nodeRequest: function(params) {
			var opt = {
				url: params.url,
				method: params.type,
				strictSSL: false,
				body: this.buildUrlParams(params.data)
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
			}.bind(this));
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
					params.error(request);
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

if (isNode) {
	module.exports = Syncano;
}