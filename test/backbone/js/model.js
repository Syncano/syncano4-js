var Todo = SyncanoModel.extend({
	syncanoParams: {
		className: 'todo'
	},

	defaults: {
		title: '',
		completed: false
	}
});