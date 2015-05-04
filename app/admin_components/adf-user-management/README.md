## Angular DreamFactory User Management Module
===========================================

AngularJS module that authenticates and manages a single user for the DreamFactory Services Platform.


### Installation

While your more that welcome to download and include the module yourself we find that it is easier to manage through Bower.  To install via bower simply type `bower install dreamfactory-user-management --save` in the command line at the root of your AngularJS project.  Be sure to include the module script in your index.html file as well as inject `dfUserManagement` into your app definition.


### Usage

We've written a great three part tutorial on how to use this module.  Part one, which covers basic usage, is located at the [DreamFactory Blog] (http://blog.dreamfactory.com/the-authenticated-app-with-angularjs-dreamfactory-user-management-module) 


### Module Provided Services

The DreamFactory User Management module provides a service for injecting module events and a service for accessing user data.  They are respectively named UserEventsService and UserDataService.  


### Module Provided Services


The DreamFactory User Management module provides a service for injecting module events and a service for accessing user data.  They are respectively named UserEventsService and UserDataService.  

##### UserEventsService

Inject this service to access module events.  The service returns an object of namespaced the events and is defined below.

```javascript

.service('UserEventsService', [function () {

        return {
            login: {
                loginRequest: 'user:login:request',
                loginSuccess: 'user:login:success',
                loginError: 'user:login:error'
            },
            logout: {
                logoutRequest: 'user:logout:request',
                logoutSuccess: 'user:logout:success',
                logoutError: 'user:logout:error'

            },
            register: {
                registerRequest: 'user:register:request',
                registerSuccess: 'user:register:success',
                registerError: 'user:register:error',
                registerConfirmation: 'user:register:confirmation'
            }
        }
    }])
```

##### UserDataService

Inject this service to access a stored user.  The service contains the current user data in a private var.  If there is no current user this var is set to false.  The service and it's methods are defined below.

```javascript
.service('UserDataService', [function () {

        var currentUser = false;


        function _getCurrentUser() {

            return currentUser;
        }

        function _setCurrentUser(userDataObj) {

            currentUser = userDataObj;
        }

        function _unsetCurrentUser() {

            currentUser = false;
        }

        function _hasUser() {

            return !!currentUser;
        }


        return {

            getCurrentUser: function () {

                return _getCurrentUser();
            },

            setCurrentUser: function (userDataObj) {

                _setCurrentUser(userDataObj);
            },

            unsetCurrentUser: function () {

                _unsetCurrentUser();
            },

            hasUser: function () {

                return _hasUser();
            }
        }
    }]);
```

#### Options for directives

The DreamFactory login and register directives have an optional 'options' attribute.  Here you can pass an options
object to configure the directive.  Your options object should resemble:

```javascript
{

property: value

}
```

The options for each directive are listed below:

##### Login Directive Options

* showTemplate: boolean

##### Register Directive Options

* showTemplate: boolean
* confirmationRequired: email_service_id(this can be retrieved from the system config)

Generally, you don't have to specify the confirmationRequired attribute.  The directive will seek this information for the system
by itself.  However, if you want to specify it for flexibility in testing it you can.