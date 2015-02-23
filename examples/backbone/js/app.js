var syncano = new Syncano(Config.instance);
var promise = syncano.connect(Config.apiKey);
promise = promise.then(function() {
	console.log('Connected to Syncano');

	// create Class
	return syncano.Classes.create({
		name: 'todomvc',
		description: 'Sample class to keep our todo-list items',
		schema: new Syncano.Schema()
			.addField('title', 'string')
			.addField('completed', 'boolean')
	});
});
promise.then(function() {
	console.log('Created ToDo Class definition');
	new View();
}, function(err) {
	if (typeof err.name !== 'undefined' && err.name[0] === 'Class with this Name already exists.') {
		console.log('Class ToDo exists, skipping');
		new View();
	} else {
		console.error('Error', err);
	}
});