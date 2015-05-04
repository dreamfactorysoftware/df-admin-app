//	Here are a few examples to get you started.

//****************** Working with System Events ******************

//	system.users.list.js
//	A script to be run when the event 'system.users.list' is triggered by a GET on /rest/system/user

var ENABLE_ADD_PROPERTY = true;

if (event.request.body.record) {
	_.each(event.request.body.record, function(record, index, list) {
		record.banned_for_life = ENABLE_ADD_PROPERTY && 'scripts@dreamfactory.com' == record.email;

		print(record.email + ' is ' + (
			record.banned_for_life ? '' : 'not'
		) + ' banned for life.');
	});
}

//	system.apps.create.js
//	A script to be run when the event 'system.apps.create' is triggered by a POST to /rest/system/app

//	Inspect the inbound request
if (event.request.body.record) {
	//	Loop through the record array and modify the data before it gets to the database.
	_.each(event.request.body.record, function(record, index, list) {
		record.api_name = 'user_' + record.api_name;
	});
}

//****************** Local Database Events ******************

//	db.todo.select.js
//	A script to be run when the event 'db.todo.select' is triggered by a GET to /rest/db/todo

//	Rename all outbound to-do items to be the same string
if (event.request.body.record) {
	_.each(event.request.body.record, function(record, index, list) {
		record.name = 'Feed the dogs again';
	});
}

//	db.todo.insert.js
//	A script to be run when the event 'db.todo.select' is triggered by a POST to /rest/db/todo

if (event.request.body.record) {
	//	Loop through the record array and add a complete indicator
	_.each(event.request.body.record, function(record, index, list) {
		record.complete = false;
	});
}