// Here are a few basic PHP examples.
// See wiki.dreamfactory.com for more examples.

// ****************** Pre-processing script on a table ******************

//  A script that is triggered by a POST on /api/v2/db/_table/tablename. Runs before the db call is made.
//  The script validates that every record in the request has a value for the name field.

// use 'payload' for request
$payload = $event['request']['payload'];

if(!empty($payload['resource'])){
    foreach($payload['resource'] as $record){
        if(!array_key_exists('name', $record)){
            throw new \Exception('Name field is required');
        }
    }
}

// ****************** Post-processing script on a table ******************

//  A script that is triggered by a GET on /api/v2/db/_table/tablename. Runs after the db call is made.
//  The script adds a new field to each record in the response.
//  To allow modification of response content, select checkbox in scripting tab of admin console.

// use 'content' for response
$content = $event['request']['$content'];

// For this change to take effect you have to enable modification of response in admin console script editor.
// Checkbox label is 'Allow script to modify request (pre-process) or response (post-process)'.
if(!empty($content['resource'])){
    foreach($content['resource'] as $record){
        $record['extraField'] = 'Feed the dog';
    }
}