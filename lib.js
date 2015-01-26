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
	var authToken = null;
	var accountObject = {};
	var instanceObject = {};
	var linksObject = {};

	var tempInstance = null;

	/*
		private methods
	*/
	function normalizeUrl(url) {
		if (url.substr(-1) !== '/') {
			url += '/';
		}
		return url.replace(/\/\//g, '/');
	}


	function List(data) {
		this.data = data.objects;
		this.nextPage = data.next;
		this.prevPage = data.prev;
	}
	List.prototype = {
		at: function(idx) {
			return this.data[idx];
		},

		hasNextPage: function() {
			return this.nextPage !== null;
		},

		hasPrevPage: function() {
			return this.prevPage !== null;
		}
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

		var conn = this;
		this.models = {};
		this.models.Klass = {
			create: function() {
				return conn.createClass.apply(conn, arguments);
			},

			list: function() {
				return conn.listClasses.apply(conn, arguments);
			}
		};
	}


	Syncano.prototype = {

		connect: function() {
			var promise;
			if (arguments.length >= 2 && arguments[0].indexOf('@') > 0) {
				// arguments are: email and password and optional callbacks
				promise = this.authWithPassword.apply(this, arguments);
			} else if (arguments.length >= 1) {
				// arguments are: token and optional callbacks
				promise = this.authWithToken.apply(this, arguments);
			} else {
				throw new Error('Incorrect arguments');
			}
			if (tempInstance !== null) {
				promise = this.setInstance(tempInstance);
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
				this.setAuthToken(res.account_key);
				typeof callbackOK === 'function' && callbackOK(res);
			}.bind(this), callbackError);
		},

		/*
		 */
		authWithToken: function(token, callbackOK) {
			this.setAuthToken(token);
			var deferred = $.Deferred();
			accountObject = {
				account_key: token
			};
			typeof callbackOK === 'function' && callbackOK(accountObject);
			deferred.resolve(accountObject);
			return deferred.promise();
		},

		/*
		 */
		setAuthToken: function(token) {
			authToken = token;
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

		/*
			classes:
				create
				list
		*/
		createClass: function(params, callbackOK, callbackError) {
			params.description = params.description || '';
			if (typeof params.schema !== 'string') {
				params.schema = params.schema.toString();
			}
			return this.request('POST', linksObject.instance_classes, params, function(result) {
				this.saveLinks('class_' + params.name, result);
				typeof callbackOK === 'function' && callbackOK(result);
			}.bind(this), callbackError);
		},

		listClasses: function(callbackOK, callbackError) {
			return this.request('GET', linksObject.instance_classes, {}, callbackOK, callbackError);
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
			var deferred = $.Deferred();
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
				if (authToken !== null) {
					url += '?api_key=' + authToken
				}
				var ajaxParams = {
					type: requestType,
					url: url,
					data: params
				}
				$.ajax(ajaxParams)
					.done(function(data, textStatus, jqXHR) {
						if (typeof data.objects !== 'undefined' && typeof data.prev !== 'undefined' && typeof data.next !== 'undefined') {
							callbackOK(new List(data))
						} else {
							callbackOK(data);
						}
					})
					.fail(function(xhr, textStatus, errorThrown) {
						var err = errorThrown;
						if (xhr.responseText) {
							var err = JSON.parse(xhr.responseText);
							if (err.detail) {
								err = err.detail;
							}
						}
						callbackError(err);
					});
			}
			return deferred.promise();
		}
	};

	/*
	 */
	Syncano.Schema = function() {
		this.data = [];
	};

	Syncano.Schema.prototype = {
		addField: function(name, type) {
			this.data.push({
				name: name,
				type: type
			});
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

	return Syncano;

})();