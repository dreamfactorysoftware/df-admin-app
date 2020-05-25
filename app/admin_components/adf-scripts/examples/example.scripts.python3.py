# Here are a few basic Python3 examples.
# Requires Munch dictionary for dot notation, use PIP3 to install.
# See wiki.dreamfactory.com for more examples.

# ****************** Pre-processing script on a table ******************

#  A script that is triggered by a POST on /api/v2/db/_table/<tablename>. Runs before the db call is made.
#  The script validates that every record in the request has a value for the name field.

# use 'payload' for request
payload = event.request.payload;

if(payload.resource):
    for record in payload.resource:
        if 'name' not in record:
            raise ValueError('Name field is required');

# ****************** Post-processing script on a table ******************

#  A script that is triggered by a GET on /api/v2/db/_table/<tablename>. Runs after the db call is made.
#  The script adds a new field to each record in the response.
#  To allow modification of response content, select checkbox in scripting tab of admin console.

# use 'content' for response
content = event.response.content;

# For this change to take effect you have to enable modification of response in admin console script editor.
# Checkbox label is 'Allow script to modify request (pre-process) or response (post-process)'.
if(content.resource):
    for record in content.resource:
        print("record: ", end="");
        print(record);
        record.extraField = 'Feed the dog';
        print("extraField: ", end="");
        print(record.extraField);
