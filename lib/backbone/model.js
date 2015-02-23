var SyncanoModel = Backbone.Model.extend({
	sync: function(method, model, options) {
		options = options || {};

		var success = function(data) {
			if (options.success) {
				options.success(data);
			}
		};

		var modelObject = model.toJSON();

		var error = function(err) {
			if (options.error) {
				options.error(err);
			}
		};

		var className;
		if (typeof this.syncanoParams !== 'undefined') {
			className = this.syncanoParams.className;
		}

		switch (method) {
			case 'read':
				syncano.DataObjects.get(className, modelObject).then(function(result) {
					success(result);
				}.bind(this), function(error) {
					error(error);
				}.bind(this));
				break;

			case 'delete':
				syncano.DataObjects.remove(className, modelObject).then(function(result) {
					success(result);
				}.bind(this), function(error) {
					error(error);
				}.bind(this));
				break;

			case 'update':
				syncano.DataObjects.update(className, modelObject).then(function(result) {
					success(result);
				}.bind(this), function(error) {
					error(error);
				}.bind(this));
				break;

			case 'create':
				syncano.DataObjects.create(className, modelObject).then(function(result) {
					success(result);
				}.bind(this), function(error) {
					error(error);
				}.bind(this));
				break;

			default:
				console.info('MODEL SYNC', method, model);
				break;
		}
	}
});