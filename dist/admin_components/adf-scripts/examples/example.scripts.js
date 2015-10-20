//	Here are a few examples to get you started. var_dump() can be used to log script output.

//****************** Pre-processing script on a table ******************

//	A script that is triggered by a POST on /api/v2/db/_table/<tablename>. Runs before the db call is made.
//  The script validates that every record in the request has a value for the name field.

var_dump(event.request); // outputs to file in storage/log of dreamfactory install directory

var lodash = require("lodash.min.js");

if (event.request.payload.resource) {

    lodash._.each (event.request.payload.resource, function( record ) {

        if (!record.name) {
            throw 'Name cannot be empty';
        }
    });
}

//****************** Post-processing script on a table ******************

//  A script that is triggered by a GET on /api/v2/db/_table/<tablename>. Runs after the db call is made.
//  The script adds a new field to each record in the response.

var_dump(event.response); // outputs to file in storage/log of dreamfactory install directory

var lodash = require("lodash.min.js");

if (event.response.resource) {

    lodash._.each (event.response.resource, function( record ) {

        record.extraField = 'Feed the dog.';
    });
}
