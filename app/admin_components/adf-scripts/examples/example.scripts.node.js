//	Here are a few basic Node.js examples.
//  See wiki.dreamfactory.com for more examples and Node.js setup info.
//  console.log() can be used to log script output.

//****************** Pre-processing script on a table ******************

//	A script that is triggered by a POST on /api/v2/db/_table/<tablename>. Runs before the db call is made.
//  The script validates that every record in the request has a value for the name field.

console.log(event.request); // outputs to file in storage/log of dreamfactory install directory

// use NPM to install lodash

var lodash = require("lodash");

if (event.request.payload.resource) { // use 'payload' for request

    lodash._.each(event.request.payload.resource, function( record ) {

        if (!record.name) {
            throw 'Name field is required';
        }
    });
}

//****************** Post-processing script on a table ******************

//  A script that is triggered by a GET on /api/v2/db/_table/<tablename>. Runs after the db call is made.
//  The script adds a new field to each record in the response.
//  To allow modification of response content, select checkbox in scripting tab of admin console.

console.log(event.response); // outputs to file in storage/log of dreamfactory install directory

// use NPM to install lodash

var lodash = require("lodash");

if (event.response.content.resource) {  // use 'content' for response

    // For this change to take effect you have to enable modification of response in admin console script editor.
    // Checkbox label is 'Allow script to modify request (pre-process) or response (post-process)'.
    lodash._.each(event.response.content.resource, function( record ) {

        record.extraField = 'Feed the dog';
    });
}