'use strict';
// @TODO: Changed login function to include apps/app groups for launchpad
// Module definition and dependencies
angular.module('dfUserManagement', ['ngRoute', 'ngCookies', 'dfUtility'])

    // Set constants for path resolution.
    .constant('MODUSRMNGR_ROUTER_PATH', '/user-management')
    .constant('MODUSRMNGR_ASSET_PATH', 'admin_components/adf-user-management/')

    // Define a router to handle module routes.  None used here
    /*.config(['$routeProvider', 'MODUSRMNGR_ROUTER_PATH', 'MODUSRMNGR_ASSET_PATH',
        function ($routeProvider, MODUSRMNGR_ROUTER_PATH, MODUSRMNGR_ASSET_PATH) {

            $routeProvider
                .when(MODUSRMNGR_ROUTER_PATH, {
                    templateUrl: MODUSRMNGR_ASSET_PATH + 'views/main.html'
                });
        }])
    */

    .run(['$cookieStore', '$http', 'UserDataService', function ($cookieStore, $http, UserDataService) {

        // Let us know what the module is up to
        //console.log('RUN BLOCK: Check for and set current user');

        var cookie = $cookieStore.get('CurrentUserObj');

        // Check if there is a CurrentUserObj in the cookie
        if (cookie) {

            // There is so store it for a sec
            UserDataService.setCurrentUser($cookieStore.get('CurrentUserObj'));

            $http.defaults.headers.common['X-DreamFactory-Session-Token'] = cookie.session_id;

        }
    }])

    // Part of the DreamFactory Angular module definition.  We don't use this yet.
    // Future versions will also include directives/templates for editing current user profile
    // and password stuff to complete the module.
    .controller('UserManagementCtrl', ['$scope', function ($scope) {
    }])

    // Part of the DreamFactory Angular module definition.  We don't use this yet.
    // Future versions will require this as a nav component to move between sections of the
    // module for editing user profile/password information
    .directive('modusrmngrNavigation', ['MODUSRMNGR_ASSET_PATH',
        function (MODUSRMNGR_ASSET_PATH) {

            return {
                restrict: 'E',
                templateUrl: MODUSRMNGR_ASSET_PATH + 'views/navigation.html',
                link: function (scope, elem, attrs) {

                }
            }
        }])

    // Directive for Login.  This is does our login work and provides the attachment point for
    // the login portion of our module.
    .directive('dreamfactoryUserLogin', ['MODUSRMNGR_ASSET_PATH', 'INSTANCE_URL', '$http', '$cookies', '$cookieStore', 'UserEventsService', 'UserDataService', '_dfObjectService', 'SystemConfigDataService',
        function (MODUSRMNGR_ASSET_PATH, INSTANCE_URL, $http, $cookies, $cookieStore, UserEventsService, UserDataService, _dfObjectService, SystemConfigDataService) {

            return {

                // only allow as HTML tag
                restrict: 'E',

                // don't show directive tag
                replace: true,

                // isolate scope
                scope: {

                    // define optional options attribute
                    options: '=?',
                    inErrorMsg: '=?'
                },

                // template path
                templateUrl: MODUSRMNGR_ASSET_PATH + 'views/login.html',

                // link it up
                link: function (scope, elem, attrs) {

                    // CREATE SHORT NAMES
                    scope.es = UserEventsService.login;

                    // PUBLIC VARS
                    // This holds our options object.  If we don't provide an options object
                    // it defaults to showing the template.  This is currently the only option

                    var defaults = {showTemplate: true};

                    scope.options = _dfObjectService.mergeObjects(scope.options, defaults);

                    // This is included on the top level tag of our directive template and
                    // controls whether the template is rendered or not.
                    scope.showTemplate = scope.options.showTemplate;

                    scope.loginFormTitle = 'Login';
                    scope.loginActive = true;

                    // PUBLIC API
                    // The public api section contains any functions that we wish to call
                    // in our HTML templates.  Functions placed here should be the only
                    // functions that are 'accessible' or called through our HTML template.
                    // The only logic that should ever be included is logic pertaining to whether
                    // or not we should run the complex implementation.  Things like using a confirm
                    // function to decide whether a record should be deleted or not go here.

                    // User Creds Obj
                    scope.creds = {
                        email: '',
                        password: ''
                    }

                    scope.errorMsg = scope.inErrorMsg || '';
                    scope.successMsg = '';
                    scope.loginWaiting = false;
                    scope.showOAuth = true;

                    scope.loginForm = {};

                    scope.systemConfig = SystemConfigDataService.getSystemConfig();
                    scope.adldap = scope.systemConfig.authentication.adldap || [];
                    scope.adldapAvailable = (scope.adldap.length>0)? true : false;
                    scope.selectedService = null;
                    scope.rememberMe = false;

                    scope.userField = {
                        icon: 'fa-envelope',
                        text: 'Enter Email',
                        type: 'email'
                    };

                    scope.rememberLogin = function(checked){
                        scope.rememberMe = checked;
                    }

                    scope.useAdLdapService = function(service){
                        scope.selectedService = service;

                        if(service){
                            scope.userField = {
                                icon: 'fa-user',
                                text: 'Enter Username',
                                type: 'text'
                            }

                            scope.creds = {
                                username: '',
                                password: '',
                                service: service
                            }
                        } else {
                            scope.userField = {
                                icon: 'fa-envelope',
                                text: 'Enter Email',
                                type: 'email'
                            };

                            scope.creds = {
                                email: '',
                                password: ''
                            }
                        }
                    }

                    //////////////////////[Arif's changes for OAuth]//////////////////////
                    var queryString = location.search.substring(1);

                    if(queryString){
                        scope.loginWaiting = true;
                        scope.showOAuth = false;
                        $http.post(INSTANCE_URL + '/api/v2/user/session?oauth_callback=true&'+queryString).then(
                            // success method
                            function (result) {

                                // Set the cookies
                                scope._setCookies(result.data);

                                // Set the DreamFactory session header
                                $http.defaults.headers.common['X-DreamFactory-Session-Token'] = $cookies.PHPSESSID;

                                // Set the current user in the UserDataService service
                                UserDataService.setCurrentUser(result.data);

                                // Emit a success message so we can hook in
                                scope.$emit(scope.es.loginSuccess, result.data);
                            }
                        );
                    }
                    /////////////////////////////////////////////////////////////////////////////

                    // This is the function we call in the UI for login.
                    scope.login = function (credsDataObj) {

                        // check if the user has entered creds or if
                        // they were supplied through a browser mechanism
                        if(scope.selectedService){
                            credsDataObj.username = $('#df-login-email').val();
                            credsDataObj.password = $('#df-login-password').val();
                            credsDataObj.service = scope.selectedService;
                        } else if (credsDataObj.email === '' || credsDataObj.password === '') {


                            // They were either supplied by a browser mechanism or
                            // they weren't entered.  We use jQuery to grab the vals
                            // If they are still empty the error handler will take care of
                            // it for us.
                            credsDataObj.email = $('#df-login-email').val();
                            credsDataObj.password = $('#df-login-password').val();
                        }

                        credsDataObj.remember_me = scope.rememberMe;

                        // This calls our complex implementation of login()
                        scope._login(credsDataObj);
                    };

                    scope.forgotPassword = function () {
                        // scope._toggleForms();

                        scope._forgotPassword();
                    };

                    scope.showLoginForm = function () {
                        scope._toggleForms();
                    };

                    // I was lazy.  These two dismiss errors don't
                    // follow the module pattern.
                    // Public functions setting values directly
                    scope.dismissError = function () {
                        scope.errorMsg = '';
                    }

                    scope.dismissSuccess = function () {
                        scope.successMsg = '';
                    }

                    // PRIVATE API
                    // The private api section contains functions that do most of our heavy lifting
                    // Although they are on the $scope(scope) of the directive we never call these
                    // from the HTML templates.  They are meant to be called from the 'Complex Implementation'
                    // section below.

                    // POST to the DreamFactory(DF) rest api to login
                    scope._loginRequest = function (credsDataObj, admin) {

                        if(!admin) {
                            // Return the posted request data as a promise
                            return $http.post(INSTANCE_URL + '/api/v2/user/session', credsDataObj);
                        } else {
                            return $http.post(INSTANCE_URL + '/api/v2/system/admin/session', credsDataObj);
                        }
                    };


                    // Set the session token
                    scope._setSessionToken = function (sessionDataObj) {

                        // Set the session id from a passed in session data object
                        // as a cookie
                        $cookies.PHPSESSID = sessionDataObj.session_id;
                    };

                    // Store the logged in user
                    scope._setCurrentUser = function (sessionDataObj) {

                        // Stores the logged in user in a cookie
                        $cookieStore.put('CurrentUserObj', sessionDataObj)
                    };

                    // Call our cookie setting functions
                    scope._setCookies = function (sessionDataObj) {

                        // Check if the session id has been updated.  If so use that to set the cookie
                        // If it hasn't just use the old session id
                        $cookies.PHPSESSID = $cookies.PHPSESSID === sessionDataObj.session_id ? $cookies.PHPSESSID : sessionDataObj.session_id;

                        // call set current user with the session data obj
                        scope._setCurrentUser(sessionDataObj);
                    };

                    // toggle login/forgot password forms
                    scope._toggleFormsState = function () {

                        scope.loginActive = !scope.loginActive;
                        scope.resetPasswordActive = !scope.resetPasswordActive;
                    };

                    // COMPLEX IMPLEMENTATION
                    // The complex implementation section is where our Private Api is called to action.
                    // This is where the magic happens for our public api.  Generally, these functions relate
                    // directly with our Public Api and are denoted as so with an underscore preceding the
                    // function name.

                    // Run login implementation
                    scope._login = function (credsDataObj) {

                        // fire up waiting directive
                        scope.loginWaiting = true;

                        // call private login request function with a credentials object
                        scope._loginRequest(credsDataObj, false).then(

                            // success method
                            function (result) {

                                // remove unnecessary apps data
                                // this is temporary and cleans up our
                                // session obj that is returned by the login function
                                // If a user has a large number of apps it can overflow our cookie
                                // So we're not going to store this info
                                delete result.data.no_group_apps;
                                delete result.data.app_groups;

                                // Set the cookies
                                scope._setCookies(result.data);

                                // Set the DreamFactory session header
                                $http.defaults.headers.common['X-DreamFactory-Session-Token'] = $cookies.PHPSESSID;

                                // Set the current user in the UserDataService service
                                UserDataService.setCurrentUser(result.data);

                                // Emit a success message so we can hook in
                                scope.$emit(scope.es.loginSuccess, result.data);
                                scope.$root.$emit(scope.es.loginSuccess, result.data)
                            },

                            // Error method
                            function (reject) {
                                if((reject.status == '401' || reject.status == '404') && !scope.selectedService){
                                    scope.loginWaiting = true;
                                    scope._loginRequest(credsDataObj, true).then(

                                        // success method
                                        function (result) {

                                            // remove unnecessary apps data
                                            // this is temporary and cleans up our
                                            // session obj that is returned by the login function
                                            // If a user has a large number of apps it can overflow our cookie
                                            // So we're not going to store this info
                                            delete result.data.no_group_apps;
                                            delete result.data.app_groups;

                                            // Set the cookies
                                            scope._setCookies(result.data);

                                            // Set the DreamFactory session header
                                            $http.defaults.headers.common['X-DreamFactory-Session-Token'] = $cookies.PHPSESSID;

                                            // Set the current user in the UserDataService service
                                            UserDataService.setCurrentUser(result.data);

                                            // Emit a success message so we can hook in
                                            scope.$emit(scope.es.loginSuccess, result.data);
                                            scope.$root.$emit(scope.es.loginSuccess, result.data)
                                        },

                                        // Error method
                                        function (reject) {
                                            // Handle Login error with template error message
                                            scope.errorMsg = reject.data.error.message;
                                            scope.$emit(scope.es.loginError, reject);
                                        }
                                    ).finally(
                                        function () {
                                            // shutdown waiting directive
                                            scope.loginWaiting = false;
                                        }
                                    )
                                } else {
                                    // Handle Login error with template error message
                                    scope.errorMsg = reject.data.error.message;
                                    scope.$emit(scope.es.loginError, reject);
                                }

                            }
                        ).finally(
                            function () {
                                // shutdown waiting directive
                                scope.loginWaiting = false;
                            }
                        )
                    };

                    scope._toggleForms = function () {

                        scope._toggleFormsState();

                    };

                    scope._forgotPassword = function () {

                        scope.$broadcast(UserEventsService.password.passwordResetRequest, {email: scope.creds.email});

                    }

                    // WATCHERS AND INIT
                    // We define any watchers or init code that needs to be run here.
                    var watchOptions = scope.$watch('options', function (newValue, oldValue) {

                        if (!newValue) return;

                        if (newValue.hasOwnProperty('showTemplate')) {
                            scope.showTemplate = newValue.showTemplate;
                        }
                    }, true);


                    // HANDLE MESSAGES
                    // We handle messages passed to our directive here.  Most commonly this will
                    // serve as a way to invoke directive functionality without the need to call
                    // the public api function directly

                    // Invoke the complex implementation for _login().  This requires you
                    // to pass the proper creds object
                    scope.$on(scope.es.loginRequest, function (e, userDataObj) {

                        // Call the complex implementation to handle the login request
                        scope._login(userDataObj);
                    });

                }
            }
        }])

    // Forgot Password Email Confirmation
    .directive('dreamfactoryForgotPwordEmail', ['MODUSRMNGR_ASSET_PATH', 'INSTANCE_URL', '$http', '_dfStringService', 'UserEventsService', function (MODUSRMNGR_ASSET_PATH, INSTANCE_URL, $http, _dfStringService, UserEventsService) {


        return {
            restrict: 'E',
            replace: true,
            scope: false,
            templateUrl: MODUSRMNGR_ASSET_PATH + 'views/fp-email-conf.html',
            link: function (scope, elem, attrs) {


                // CREATE SHORT NAMES
                scope.es = UserEventsService.password;


                scope.emailForm = true;
                scope.emailError = false;
                scope.securityQuestionForm = false;
                scope.hidePasswordField = false;
                scope.allowForeverSessions = scope.systemConfig.authentication.allow_forever_sessions;

                scope.sq = {
                    email: null,
                    security_question: null,
                    security_answer: null,
                    new_password: null,
                    verify_password: null
                };

                scope.identical = true;
                scope.requestWaiting = false;
                scope.questionWaiting = false;


                // PUBLIC API

                // I was lazy.  These two dismiss errors don't
                // follow the module pattern.
                // Public functions setting values directly
                /*scope.dismissError = function () {
                    scope.errorMsg = '';
                }

                scope.dismissSuccess = function () {
                    scope.successMsg = '';
                }*/


                scope.requestPasswordReset = function (emailDataObj) {

                    // Pass email address in object to the _requestPasswordReset function
                    scope._requestPasswordReset(emailDataObj);
                };

                scope.securityQuestionSubmit = function (reset) {

                    if (!scope.identical) {
                        scope.errorMsg = 'Passwords do not match.'
                        return;
                    }

                    if (!scope._verifyPasswordLength(reset)) {
                        scope.errorMsg = 'Password must be at least 5 characters.'
                        return;
                    }


                    scope._securityQuestionSubmit(reset);
                }

                scope.verifyPassword = function (user) {

                    scope._verifyPassword(user);
                };


                // PRIVATE API
                scope._resetPasswordRequest = function (requestDataObj, admin) {

                    if(!admin) {
                        // Post request for password change and return promise
                        return $http.post(INSTANCE_URL + '/api/v2/user/password?reset=true', requestDataObj);
                    }
                    else{
                        return $http.post(INSTANCE_URL + '/api/v2/system/admin/password?reset=true', requestDataObj);
                    }
                };

                scope._resetPasswordSQ = function (requestDataObj, admin) {

                    if(!admin) {
                        // Post request for password change and return promise
                        return $http.post(INSTANCE_URL + '/api/v2/user/password?login=false', requestDataObj);
                    }
                    else{
                        return $http.post(INSTANCE_URL + '/api/v2/system/admin/password?login=false', requestDataObj);
                    }
                };

                // Test if our entered passwords are identical
                scope._verifyPassword = function (userDataObj) {

                    scope.identical = _dfStringService.areIdentical(userDataObj.new_password, userDataObj.verify_password);
                };

                // Test if our passwords are long enough
                scope._verifyPasswordLength = function (credsDataObj) {

                    return credsDataObj.new_password.length >= 5;
                };


                // COMPLEX IMPLEMENTATION
                scope._requestPasswordReset = function (requestDataObj) {

                    // Add property to the request data
                    // this contains an object with the email address
                    requestDataObj['reset'] = true;

                    // Turn on waiting directive
                    scope.requestWaiting = true;

                    // Ask to reset the password via email confirmation
                    scope._resetPasswordRequest(requestDataObj, false).then(

                        // handle successful password reset
                        function (result) {


                            if (result.data.hasOwnProperty('security_question')) {

                                scope.emailForm = false;
                                scope.securityQuestionForm = true;

                                scope.sq.email = requestDataObj.email;
                                scope.sq.security_question = result.data.security_question
                            }
                            else {

                                scope.successMsg = 'A password reset email has been sent to the provided email address.';

                                // Emit a confirm message indicating that is the next step
                                scope.$emit(scope.es.passwordResetRequestSuccess, requestDataObj.email);
                            }
                        },

                        // handle error
                        function (reject) {
                            if(reject.status=='401' || reject.status=='404'){
                                scope._resetPasswordRequest(requestDataObj, true).then(

                                    // handle successful password reset
                                    function (result) {


                                        if (result.data.hasOwnProperty('security_question')) {

                                            scope.emailForm = false;
                                            scope.securityQuestionForm = true;

                                            scope.sq.email = requestDataObj.email;
                                            scope.sq.security_question = result.data.security_question
                                        }
                                        else {

                                            scope.successMsg = 'A password reset email has been sent to the provided email address.';

                                            // Emit a confirm message indicating that is the next step
                                            scope.$emit(scope.es.passwordResetRequestSuccess, requestDataObj.email);
                                        }
                                    },

                                    // handle error
                                    function (reject) {

                                        // Message received from server
                                        scope.errorMsg = reject.data.error.message;

                                    }
                                ).finally(
                                    function () {

                                        // turn off waiting directive
                                        scope.requestWaiting = false;
                                    }
                                )
                            }
                            else {
                                // Message received from server
                                scope.errorMsg = reject.data.error.message;
                            }

                        }
                    ).finally(
                            function () {

                                // turn off waiting directive
                                scope.requestWaiting = false;
                            }
                        )
                };


                scope._securityQuestionSubmit = function (reset) {

                    scope.questionWaiting = true;

                    scope._resetPasswordSQ(reset, false).then(

                        function (result) {

                            var userCredsObj = {
                                email: reset.email,
                                password: reset.new_password
                            }

                            scope.$emit(UserEventsService.password.passwordSetSuccess, userCredsObj)

                        },
                        function (reject) {
                            if(reject.status == '401' || reject.status == '404'){
                                scope._resetPasswordSQ(reset, true).then(

                                    function (result) {

                                        var userCredsObj = {
                                            email: reset.email,
                                            password: reset.new_password
                                        }

                                        scope.$emit(UserEventsService.password.passwordSetSuccess, userCredsObj)

                                    },
                                    function (reject) {

                                        scope.questionWaiting = false;
                                        scope.errorMsg = reject.data.error.message;
                                        scope.$emit(UserEventsService.password.passwordSetError);
                                    }

                                ).finally(function() {})
                            } else {
                                scope.questionWaiting = false;
                                scope.errorMsg = reject.data.error.message;
                                scope.$emit(UserEventsService.password.passwordSetError);
                            }
                        }

                    ).finally(function() {})
                }

                // WATCHERS AND INIT


                // HANDLE MESSAGES



                scope.$on(UserEventsService.password.passwordResetRequest, function (e, resetDataObj) {


                    scope._toggleForms();
                    // scope._requestPasswordReset(resetDataObj);
                });
            }
        }
    }])

    // Forgot Password Security Question
    .directive('dreamfactoryForgotPwordQuestion', ['MODUSRMNGR_ASSET_PATH', function (MODUSRMNGR_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MODUSRMNGR_ASSET_PATH + 'views/fp-security-question.html',
            link: function (scope, elem, attrs) {





            }
        }
    }])

    // Password Reset Directive
    .directive('dreamfactoryPasswordReset', ['MODUSRMNGR_ASSET_PATH', 'INSTANCE_URL', '$http', 'UserEventsService', '_dfStringService', '_dfObjectService', 'dfNotify',
        function (MODUSRMNGR_ASSET_PATH, INSTANCE_URL, $http, UserEventsService, _dfStringService, _dfObjectService, dfNotify) {

            return {
                restrict: 'E',
                scope: {
                    options: '=?',
                    inErrorMsg: '=?'
                },
                templateUrl: MODUSRMNGR_ASSET_PATH + 'views/password-reset.html',
                link: function (scope, elem, attrs) {


                    // CREATE SHORT NAMES
                    scope.es = UserEventsService.password;


                    // PUBLIC VARS
                    // This holds our options object.  If we don't provide an options object
                    // it defaults to showing the template.
                    var defaults = {showTemplate: true, login: false};
                    scope.options = _dfObjectService.mergeObjects(scope.options, defaults);

                    // This is included on the top level tag of our directive template and
                    // controls whether the template is rendered or not.
                    scope.showTemplate = scope.options.showTemplate;

                    // Holds value to for identical password check
                    scope.identical = true;

                    scope.successMsg = '';
                    scope.errorMsg = '';

                    scope.resetWaiting = false;


                    // PUBLIC API

                    // I was lazy.  These two dismiss errors don't
                    // follow the module pattern.
                    // Public functions setting values directly
                    scope.dismissError = function () {
                        scope.errorMsg = '';
                    }

                    scope.dismissSuccess = function () {
                        scope.successMsg = '';
                    }



                    // PUBLIC API
                    scope.resetPassword = function (credsDataObj) {

                        if (!scope.identical) {
                            scope.errorMsg = 'Passwords do not match.'
                            return;
                        }

                        if (!scope._verifyPasswordLength(credsDataObj)) {
                            scope.errorMsg = 'Password must be at least 5 characters.'
                            return;
                        }


                        scope._resetPassword(credsDataObj)
                    };

                    scope.verifyPassword = function (user) {

                        scope._verifyPassword(user);
                    };


                    // PRIVATE API
                    scope._setPasswordRequest = function (requestDataObj, admin) {

                        var url = INSTANCE_URL + '/api/v2/system/admin/password';
                        if(!admin){
                            url = INSTANCE_URL + '/api/v2/user/password';
                        }

                        return $http({
                            url: url,
                            method: 'POST',
                            params: {
                                login: scope.options.login
                            },
                            data: requestDataObj
                        });
                    };

                    // Test if our entered passwords are identical
                    scope._verifyPassword = function (userDataObj) {

                        scope.identical = _dfStringService.areIdentical(userDataObj.new_password, userDataObj.verify_password);
                    };

                    // Test if our passwords are long enough
                    scope._verifyPasswordLength = function (credsDataObj) {

                        return credsDataObj.new_password.length >= 5;
                    };


                    // COMPLEX IMPLEMENTATION
                    scope._resetPassword = function (credsDataObj) {

                        scope.resetWaiting = true;

                        var requestDataObj = {
                            email: credsDataObj.email,
                            code: credsDataObj.code,
                            new_password: credsDataObj.new_password
                        };

                        scope._setPasswordRequest(requestDataObj, false).then(
                            function (result) {

                                var userCredsObj = {
                                    email: credsDataObj.email,
                                    password: credsDataObj.new_password
                                }

                                scope.$emit(scope.es.passwordSetSuccess, userCredsObj);

                                scope.showTemplate = false;


                            },
                            function (reject) {
                                if(reject.status == '401' || reject.status == '404'){
                                    scope._setPasswordRequest(requestDataObj, true).then(
                                        function (result) {

                                            var userCredsObj = {
                                                email: credsDataObj.email,
                                                password: credsDataObj.new_password
                                            }

                                            scope.$emit(scope.es.passwordSetSuccess, userCredsObj);

                                            scope.showTemplate = false;


                                        },
                                        function (reject) {

                                            scope.errorMsg = reject.data.error.message;
                                            scope.$emit(scope.es.passwordSetError);
                                            scope.resetWaiting = false;
                                        }
                                    ).finally(
                                        function() {
                                            scope.resetWaiting = false;
                                        }
                                    )
                                } else {
                                    scope.errorMsg = reject.data.error.message;
                                    scope.$emit(scope.es.passwordSetError);
                                    scope.resetWaiting = false;
                                }
                            }
                        ).finally(
                                function() {
                                    scope.resetWaiting = false;
                                }
                            )
                    };


                    // WATCHERS AND INIT

                    // WATCHERS AND INIT
                    var watchInErrorMsg = scope.$watch('inErrorMsg', function (n, o) {

                        scope.confirmWaiting = false;
                        scope.errorMsg = n;
                    });

                    //HANDLE MESSAGES

                    scope.$on(scope.es.passwordSetRequest, function (e, credsDataObj) {

                        scope._resetPassword(credsDataObj);
                    });

                    scope.$on('$destroy', function (e) {

                        watchInErrorMsg();
                    })
                }
            }
        }])

    // Logout Directive
    .directive('dreamfactoryUserLogout', ['INSTANCE_URL', '$http', '$cookieStore', 'UserEventsService', 'UserDataService',
        function (INSTANCE_URL, $http, $cookieStore, UserEventsService, UserDataService) {
            return {

                restrict: 'E',
                scope: {},
                link: function (scope, elem, attrs) {

                    // CREATE SHORT NAMES
                    scope.es = UserEventsService.logout;

                    // PUBLIC API ** See login directive for more info **
                    // No methods defined here.


                    // PRIVATE API ** See login directive for more info **

                    // DELETE request for logging out user
                    scope._logoutRequest = function (admin) {

                        if(!admin) {
                            // return a promise object from the rest call
                            return $http.delete(INSTANCE_URL + '/api/v2/user/session');
                        }
                        else{
                            return $http.delete(INSTANCE_URL + '/api/v2/system/admin/session');
                        }
                    };

                    // COMPLEX IMPLEMENTATION ** See login directive for more info **

                    scope._logout = function () {

                        // Call to server for logout request
                        scope._logoutRequest(false).then(

                            // success method
                            function () {

                                // remove session cookie
                                $cookieStore.remove('PHPSESSID');

                                // remove current user cookie
                                $cookieStore.remove('CurrentUserObj');

                                // remove user from UserDataService
                                UserDataService.unsetCurrentUser();

                                // Unset DreamFactory header
                                $http.defaults.headers.common['X-DreamFactory-Session-Token'] = '';

                                // Emit success message so we can hook in
                                scope.$emit(scope.es.logoutSuccess, false);
                            },

                            // Error method
                            function (reject) {
                                if(reject.status == '401' || reject.status == '404'){
                                    scope._logoutRequest(true).then(

                                        // success method
                                        function () {

                                            // remove session cookie
                                            $cookieStore.remove('PHPSESSID');

                                            // remove current user cookie
                                            $cookieStore.remove('CurrentUserObj');

                                            // remove user from UserDataService
                                            UserDataService.unsetCurrentUser();

                                            // Unset DreamFactory header
                                            $http.defaults.headers.common['X-DreamFactory-Session-Token'] = '';

                                            // Emit success message so we can hook in
                                            scope.$emit(scope.es.logoutSuccess, false);
                                        },

                                        // Error method
                                        function (reject) {

                                            // Throw DreamFactory error object
                                            throw {
                                                module: 'DreamFactory User Management',
                                                type: 'error',
                                                provider: 'dreamfactory',
                                                exception: reject
                                            }
                                        })
                                }
                                else {
                                    // Throw DreamFactory error object
                                    throw {
                                        module: 'DreamFactory User Management',
                                        type: 'error',
                                        provider: 'dreamfactory',
                                        exception: reject
                                    }
                                }
                            })
                    };

                    // WATCHERS AND INIT ** See login directive for more info **
                    // No watchers defined

                    // HANDLE MESSAGES ** See login directive for more info **

                    // Handle logout request message from application
                    scope.$on(scope.es.logoutRequest, function (e) {

                        // call complex implementation of logout
                        scope._logout();
                    });

                    // CALL METHOD ON INVOKE
                    // If we include our logout directive in a template this will automatically
                    // run when we hit the route and subsequently log us out.
                    scope._logout();
                }
            }
        }])

    // Register Directive.  Takes care of registering a user for our application
    .directive('dreamfactoryRegisterUser', ['MODUSRMNGR_ASSET_PATH', 'INSTANCE_URL', '$http', '$rootScope', '$cookieStore', 'UserEventsService', '_dfStringService', '_dfObjectService', 'dfXHRHelper',
        function (MODUSRMNGR_ASSET_PATH, INSTANCE_URL, $http, $rootScope, $cookieStore, UserEventsService, _dfStringService, _dfObjectService, dfXHRHelper) {


            return {
                restrict: 'E',
                templateUrl: MODUSRMNGR_ASSET_PATH + 'views/register.html',
                scope: {
                    options: '=?'
                },
                link: function (scope, elem, attrs) {


                    // CREATE SHORT NAMES
                    scope.es = UserEventsService.register;

                    // PUBLIC VARS
                    // This holds our options object.  If we don't provide an options object
                    // it defaults to showing the template.  It also defines a confirmationRequired attribute
                    // which can be set at the time of instantiation.  If it's not set then it will default
                    // to the instance settings.
                    var defaults = {showTemplate: true, login: false};
                    scope.options = _dfObjectService.mergeObjects(scope.options, defaults);

                    // This is included on the top level tag of our directive template and
                    // controls whether the template is rendered or not.
                    scope.showTemplate = scope.options.showTemplate;

                    // Holds value to for identical password check
                    scope.identical = true;

                    scope.errorMsg = '';


                    // I was lazy.  These two dismiss errors don't
                    // follow the module pattern.
                    // Public functions setting values directly
                    scope.dismissError = function () {
                        scope.errorMsg = '';
                    }


                    // PUBLIC API ** See login directive for more info **

                    // Public register function used in our HTML template
                    scope.register = function (registerDataObj) {

                        // Call complex implementation
                        scope._register(registerDataObj);
                    };

                    scope.verifyPassword = function (user) {

                        scope._verifyPassword(user);
                    };


                    // PRIVATE API ** See login directive for more info **

                    // Registers a user via REST API
                    scope._registerRequest = function (registerDataObj) {

                        return $http({
                            url: INSTANCE_URL + '/api/v2/user/register',
                            method: 'POST',
                            params: {
                                login: scope.options.login
                            },
                            data: registerDataObj
                        });
                    };

                    // Returns the system configuration object
                    scope._getSystemConfig = function () {

                        return $http.get(INSTANCE_URL + '/api/v2/system/environment');
                    };


                    // COMPLEX IMPLEMENTATION ** See login directive for more info **
                    scope._register = function (registerDataObj) {

                        if (scope.identical != true) {

                            // Handle error in module
                            scope.errorMsg = 'Password and confirm password do not match.';
                            return;

//                            // Throw an error
//                            throw {
//                                module: 'DreamFactory User Management',
//                                type: 'error',
//                                provider: 'dreamfactory',
//                                exception: 'Password and confirm password do not match.'
//                            }
                        }


                        // Store our implementation of registering a user
                        scope._runRegister = function (registerDataObj) {

                            // Add auto login bool


                            // Pass registerDataObj to scope._registerRequest function and
                            // then handle the response
                            scope._registerRequest(registerDataObj).then(

                                // success
                                function (result) {

                                    // The scope.options.confirmationRequired value should be set to
                                    // the value of the System Config's open_reg_email_service_id value.
                                    // This let's us know if the admin has required email confirmation for the
                                    // system.  Null means no confirmation required.

                                    // Do we need confirmation
                                    if (scope.options.confirmationRequired == null) {

                                        // Build a login object
                                        var userCredsObj = {
                                            email: registerDataObj.email,
                                            password: registerDataObj.new_password
                                        };

                                        // No we don't.  Send the success event and the registered user data
                                        scope.$emit(scope.es.registerSuccess, userCredsObj);

                                    } else {

                                        // We do require confirmation so Send the confirmation event and the user data
                                        scope.$emit(scope.es.registerConfirmation, result.data);
                                    }
                                },

                                // error
                                function (reject) {

                                    // Handle error in module
                                    var msg = "Validation failed. ";
                                    var context = reject.data.error.context;

                                    angular.forEach(context, function(value, key){
                                        msg = msg+key+': '+value+' ';
                                    }, msg);
                                    scope.errorMsg = msg;

                                    // Throw an error
//                                    throw {
//                                        module: 'DreamFactory User Management',
//                                        type: 'error',
//                                        provider: 'dreamfactory',
//                                        exception: reject
//                                    }
                                });
                        };


                        // If we have a SystemConfig and we have passed in the proper value(see scope.options explanation above)
                        // then we don't waste a call to the system.
                        // If we have not then we need to know this about the system.
                        if (scope.options.confirmationRequired == null) {

                            // We did not pass in a usable options object
                            // Ask the server for the config
                            scope._getSystemConfig().then(

                                // success
                                function (result) {

                                    // store the config object
                                    var systemConfigDataObj = result.data;


                                    // Set the options object to the proper values
                                    // The success method of scope._registerRequest function looks
                                    // for this property to determine which message to emit back up to
                                    // the application.  If this value is null the scope._registerRequest will emit a
                                    // 'user:register:success' method indicating that we are done registering
                                    // the user.  If it contains a value (denoting that an email service has been selected)
                                    // We emit a 'user:register:confirmation' message.  How you handle these messages is left
                                    // up to you.  We just notify you of the current state and the actions that have been taken as
                                    // a result of your config.
                                    scope.options.confirmationRequired = systemConfigDataObj.authentication.open_reg_email_service_id;


                                    // Now that we have all the info we need, lets run the
                                    // register routine
                                    scope._runRegister(registerDataObj);

                                },

                                // There was an error retrieving the config
                                function (reject) {

                                    // Throw an error
                                    throw {
                                        module: 'DreamFactory User Management',
                                        type: 'error',
                                        provider: 'dreamfactory',
                                        exception: reject
                                    }
                                }
                            )
                        }
                        else {

                            // We were passed an options object
                            // Run the register routine
                            scope._runRegister(registerDataObj);
                        }
                    };

                    // Test if our entered passwords are identical
                    scope._verifyPassword = function (userDataObj) {

                        scope.identical = _dfStringService.areIdentical(userDataObj.new_password, userDataObj.verify_password);
                    };


                    // WATCHERS AND INIT ** See login directive for more info **

                    // Watch our options object
                    scope.$watchCollection('options', function (newValue, oldValue) {

                        // If we don't have a confirmationRequiredProperty set
                        if (!newValue.hasOwnProperty('confirmationRequired')) {

                            // We go ask the server to get it.  Everything stops until this guy returns.
                            // SYNCHRONOUS
                            //scope.options.confirmationRequired = xhrHelper.getSystemConfigFromServer().authentication.allow_open_registration;

                            var config = dfXHRHelper.get({
                                url: 'system/environment'
                            });

                            scope.options.confirmationRequired = config.authentication.allow_open_registration && config.authentication.open_reg_email_service_id ? true : null;

                        }

                    });

                    // HANDLE MESSAGES ** See login directive for more info **
                    // We received a message to register a user.
                    scope.$on(scope.es.registerRequest, function (e, registerDataObj) {

                        // register the user
                        scope._register(registerDataObj);
                    });

                }
            }

        }])

    // User Profile Directive
    .directive('dreamfactoryUserProfile', ['MODUSRMNGR_ASSET_PATH', '_dfObjectService', 'UserDataService', 'UserEventsService', function(MODUSRMNGR_ASSET_PATH, _dfObjectService, UserDataService, UserEventsService) {

        return {

            restrict: 'E',
            replace: true,
            templateUrl: MODUSRMNGR_ASSET_PATH + 'views/edit-profile.html',
            scope: {
                options: '=?'
            },
            link: function(scope, elem, attrs) {


                scope.es = UserEventsService.profile;


                var defaults = {showTemplate: true}
                scope.options = _dfObjectService.mergeObjects(scope.options, defaults);






            }
        }
    }])

    // Remote Auth Providers Directive
    .directive('dreamfactoryRemoteAuthProviders', ['MODUSRMNGR_ASSET_PATH', '_dfObjectService', 'UserDataService', 'UserEventsService', 'SystemConfigDataService',
        function(MODUSRMNGR_ASSET_PATH, _dfObjectService, UserDataService, UserEventsService, SystemConfigDataService) {

            return {

                restrict: 'E',
                replace: true,
                templateUrl: MODUSRMNGR_ASSET_PATH + 'views/remote-auth-providers.html',
                scope: false,
                link: function(scope, elem, attrs) {


                    // @TODO: Google Plus Provider name needs to be worked out on server so I don't have to change it on the client
                    // @TODO: Fix providers {{client_id}} stuff


                    scope.systemConfig = SystemConfigDataService.getSystemConfig();


                    scope.oauths = scope.systemConfig.authentication.oauth;

                    scope.loginWithProvider = function (providerData) {

                        scope._loginWithProvider(providerData);
                    };


                    scope._loginWithProvider = function (providerData) {
                        window.top.location.href = '/api/v2/'+providerData;
                        //window.top.location.href = '/web/remoteLogin?pid=' + providerData.api_name + '&return_url=' + encodeURI(window.top.location);
                    }
                }
            }
    }])

    // Enter confirmation code page
    .directive('dreamfactoryConfirmUser', ['MODUSRMNGR_ASSET_PATH', 'INSTANCE_URL', '$http', '_dfObjectService', '_dfStringService', 'UserDataService', 'UserEventsService', 'SystemConfigDataService',
        function(MODUSRMNGR_ASSET_PATH, INSTANCE_URL, $http, _dfObjectService, _dfStringService, UserDataService, UserEventsService, SystemConfigDataService) {

            return {

                restrict: 'E',
                replace: true,
                templateUrl: MODUSRMNGR_ASSET_PATH + 'views/confirmation-code.html',
                scope: {
                    options: '=?',
                    inErrorMsg: '=?'
                },
                link: function(scope, elem, attrs) {


                    // PUBLIC VARS
                    // This holds our options object.  If we don't provide an options object
                    // it defaults to showing the template.  This is currently the only option
                    var defaults = {showTemplate: true, title: 'User Confirmation'};

                    scope.options = _dfObjectService.mergeObjects(scope.options, defaults);

                    // This is included on the top level tag of our directive template and
                    // controls whether the template is rendered or not.
                    scope.showTemplate = scope.options.showTemplate;

                    scope.identical = true;


                    scope.errorMsg = '';
                    scope.successMsg = '';
                    scope.confirmWaiting = false;



                    // I was lazy.  These two dismiss errors don't
                    // follow the module pattern.
                    // Public functions setting values directly
                    scope.dismissError = function () {
                        scope.errorMsg = '';
                    };

                    scope.dismissSuccess = function () {
                        scope.successMsg = '';
                    };



                    // PUBLIC API
                    scope.confirm = function (userConfirmObj) {

                        if (!scope.identical) {
                            scope.errorMsg = 'Passwords do not match.';
                            return;
                        }

                        if (!scope._verifyPasswordLength(userConfirmObj)) {
                            scope.errorMsg = 'Password must be at least 5 characters.';
                            return;
                        }



                        scope._confirm(userConfirmObj);
                    };

                    scope.verifyPassword = function (user) {

                        scope._verifyPassword(user);
                    };



                    // PRIVATE API
                    // Test if our entered passwords are identical
                    scope._verifyPassword = function (userDataObj) {

                        scope.identical = _dfStringService.areIdentical(userDataObj.new_password, userDataObj.verify_password);
                    };

                    // Test if our passwords are long enough
                    scope._verifyPasswordLength = function (user) {

                        return user.new_password.length >= 5;
                    };

                    // Send confim obj to the server for...you guessed it...confirmation
                    scope._confirmUserToServer = function (requestDataObj) {

                        return $http({
                            url: INSTANCE_URL + '/api/v2/user/password',
                            method: 'POST',
                            params: {
                                login: false
                            },
                            data: requestDataObj
                        });
                    };



                    // COMPLEX IMPLEMENTATION
                    scope._confirm = function (userConfirmObj) {

                        scope.confirmWaiting = true;

                       var requestDataObj = userConfirmObj;

                        scope._confirmUserToServer(requestDataObj).then(

                            function (result) {

                                var userCreds = {
                                    email: requestDataObj.email,
                                    password: requestDataObj.new_password
                                }

                                scope.$emit(UserEventsService.confirm.confirmationSuccess, userCreds)
                            },
                            function (reject) {

                                scope.errorMsg = reject.data.error.message;
                                scope.$emit(UserEventsService.confirm.confirmationError);

                                // there was an error
                                // stop the waiting directive
                                scope.confirmWaiting = false;

                            }
                        ).finally(

                                function () {

                                    // Do nothing..  We will have asked to login

                                }
                            )
                    };



                    // WATCHERS AND INIT
                    var watchInErrorMsg = scope.$watch('inErrorMsg', function (n, o) {

                        scope.confirmWaiting = false;
                        scope.errorMsg = n;
                    });


                    // MESSAGES
                    scope.$on('$destroy', function (e) {

                        watchInErrorMsg();
                    });

                    scope.$on(UserEventsService.confirm.confirmationRequest, function (e, confirmationObj) {

                        scope._confirm(confirmationObj);
                    });



                    // HELP



                }
            }
        }])

    // blockss entry forms while waiting for server
    // pops up working icon
    .directive('dreamfactoryWaiting', ['MODUSRMNGR_ASSET_PATH', function (MODUSRMNGR_ASSET_PATH) {


        return {
            restrict: 'E',
            scope: {
                show: '=?'
            },
            replace: false,
            templateUrl: MODUSRMNGR_ASSET_PATH + 'views/dreamfactory-waiting.html',
            link: function (scope, elem, attrs) {


                var el = $(elem),
                    container = el.children(),
                    h = el.parent('.panel-body').outerHeight(),
                    w = el.parent('.panel-body').outerWidth(),
                    t = (el.position().top + parseInt(el.parent().css('padding-top'))) + 'px',
                    l = (el.position().left + parseInt(el.parent().css('padding-left'))) + 'px';


               function size() {

                   h = el.parent('.panel-body').outerHeight();
                   w = el.parent('.panel-body').outerWidth();
                   t = el.parent('.panel-body').position().top;
                   l = el.parent('.panel-body').position().left;

                   container.css({
                       height: h + 'px',
                       width: w + 'px',
                       position: 'absolute',
                       left: l,
                       top: t

                   });

                   container.children('.df-spinner').css({
                       position: 'absolute',
                       top: (h - 110) /2,
                       left: (w - 70) /2
                   });
               }


                scope._showWaiting = function() {

                    size();
                    container.fadeIn('fast');
                };

                scope._hideWaiting = function() {

                    container.hide();
                };

                scope.$watch('show', function (n, o) {


                    if (n) {
                        scope._showWaiting()
                    }
                    else {
                        scope._hideWaiting();
                    }
                });


                $(window).on('resize load', function () {
                    size();
                })

            }
        }
    }])

    // This service gives us a way to pass namespaced events around our application
    // We inject this service in order to request and respond to different module events.
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
            },
            password: {
                passwordResetRequest: 'user:passwordreset:request',
                passwordResetRequestSuccess: 'user:passwordreset:requestsuccess',
                passwordSetRequest: 'user:passwordset:request',
                passwordSetSuccess: 'user:passwordset:success',
                passwordSetError: 'user:passwordset:error'
            },
            profile: {

            },
            confirm: {
                confirmationSuccess: 'user:confirmation:success',
                confirmationError: 'user:confirmation:error',
                confirmationRequest: 'user:confirmation:request'
            }
        }
    }])

    // This service gives us access to the current user.  While it's pretty sparse
    // at the moment it does give us access to critical user/session data.  Inject this
    // service where ever you need to access the current user.
    .service('UserDataService', ['$http', 'INSTANCE_URL', 'XHRHelper', function ($http, INSTANCE_URL, XHRHelper) {

        // Stored user.
        var currentUser = false;


        // Private methods
        // return current user
        function _getCurrentUser() {

            return currentUser;
        }

        function _saveUserSetting(userSettings) {

            return $http({
                url: INSTANCE_URL + '/api/v2/user/custom',
                method: 'POST',
                data: userSettings
            })
        }

        function _getUserSetting(setting, sync) {

            setting = setting || '';
            sync = sync || false;


            if (sync) {
                var requestDataObj = {
                    url: 'user/custom/' + setting
                };

                return XHRHelper.ajax(requestDataObj);
            }


            return $http({
                url: INSTANCE_URL + '/api/v2/user/custom/' + setting,
                method: 'GET'
            })
        }


        // set the current user
        function _setCurrentUser(userDataObj) {

            currentUser = userDataObj;
        }

        // remove/unset current user
        function _unsetCurrentUser() {

            currentUser = false;
        }

        // check if we have a user
        function _hasUser() {

            return !!currentUser;
        }

        return {

            // Public methods
            // These can be called via UserDataService.METHOD_NAME

            getCurrentUser: function () {

                return _getCurrentUser();
            },

            saveUserSetting: function (userSettings) {


                return _saveUserSetting(userSettings);

            },

            getUserSetting: function (userSetting, sync) {

                return _getUserSetting(userSetting, sync);
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
    }])
    .service('_dfStringService', [function () {

        return {
            areIdentical: function (stringA, stringB) {

                stringA = stringA || '';
                stringB = stringB || '';


                function _sameLength(stringA, stringB) {
                    return  stringA.length == stringB.length;
                }

                function _sameLetters(stringA, stringB) {

                    var l = Math.min(stringA.length, stringB.length);

                    for (var i = 0; i < l; i++) {
                        if (stringA.charAt(i) !== stringB.charAt(i)) {
                            return false;
                        }
                    }
                    return true;
                }

                if (_sameLength(stringA, stringB) && _sameLetters(stringA, stringB)) {
                    return true;
                }

                return false;
            }
        }

    }])
    .service('_dfObjectService', [function () {

        return {

            self: this,

            mergeObjects: function (obj1, obj2) {

                for (var key in obj1) {
                    obj2[key] = obj1[key]
                }

                return obj2;
            },

            deepMergeObjects: function (obj1, obj2) {

                var self = this;

                for (var _key in obj1) {
                    if (obj2.hasOwnProperty(_key)) {
                        if(typeof obj2[_key] === 'object') {

                            obj2[_key] = self.deepMergeObjects(obj1[_key], obj2[_key]);

                        }else {
                            obj2[_key] = obj1[_key];
                        }
                    }
                }

                return obj2;

            }
        }

    }])
    .service('dfXHRHelper', ['INSTANCE_URL', 'ADMIN_API_KEY', '$cookies', function (INSTANCE_URL, ADMIN_API_KEY, $cookies) {

        function _isEmpty(obj) {

            // null and undefined are "empty"
            if (obj == null) return true;

            // Assume if it has a length property with a non-zero value
            // that that property is correct.
            if (obj.length > 0)    return false;
            if (obj.length === 0)  return true;

            // Otherwise, does it have any properties of its own?
            // Note that this doesn't handle
            // toString and valueOf enumeration bugs in IE < 9
            for (var key in obj) {
                if (hasOwnProperty.call(obj, key)) return false;
            }

            return true;
        }

        // Set DreamFactory Headers as well as additional passed in headers
        function _setHeaders(_xhrObj, _headersDataObj) {

            // Setting Dreamfactory Headers
            _xhrObj.setRequestHeader("X-DreamFactory-API-Key", ADMIN_API_KEY);
            _xhrObj.setRequestHeader("X-DreamFactory-Session-Token", $cookies.PHPSESSID);

            // Set additional headers
            for (var _key in _headersDataObj) {

                _xhrObj.setRequestHeader(_key, _headersDataObj[_key]);
            }
        }

        // Create url params
        function _setParams(_paramsDataObj) {

            // Set a return var
            var params = '';

            // Check if we have any params
            if (!_isEmpty(_paramsDataObj)) {

                // We do.
                // begin query string
                params = '?';

                // Loop through object
                for (var _key in _paramsDataObj) {

                    // Create URL params out of object properties/values
                    params += _key + '=' + _paramsDataObj[_key] + '&';
                }
            }

            // Check if params is empty string
            // Did we have any params
            if (params !== '') {

                // We did so trim of the trailing '&' from building the string
                params = params.substring(0, params.length -1);

                // Encode the params
                encodeURI(params);
            }

            // Return our final params value
            return params;
        }


        function _makeRequest(_method, _url, _async, _params, _headers, _mimeType) {


            var xhr;

            // Create XHR object
            if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
                xhr = new XMLHttpRequest();
            }
            else {// code for IE6, IE5
                xhr = new ActiveXObject("Microsoft.XMLHTTP");
            }

            // set and encode params
            var params = _setParams(_params);


            // Do XHR
            xhr.open(_method, INSTANCE_URL + '/api/v2/' + _url + params, _async);

            // Set headers
            _setHeaders(xhr, _headers);

            // Set mime type override
            xhr.overrideMimeType(_mimeType);

            // Send our request
            xhr.send();

            // Check response
            if (xhr.readyState == 4 && xhr.status == 200) {

                // Good response.
                return angular.fromJson(xhr.responseText);
            } else {

                // Dad response
                return xhr.status;
            }
        }


        function _get(optionsDataObj) {

            // We need a valid URL
            // Do we have one?
            if (!optionsDataObj.url || optionsDataObj.url === '') {

                // No.  Throw an error
                throw {
                    module: 'DreamFactory System Config Module',
                    type: 'error',
                    provider: 'dreamfactory',
                    exception: 'XHRHelper Request Failure: No URL provided'
                }
            }

            // Default xhr options
            var defaults = {
                method: "GET",
                url: '',
                async: false,
                params: {},
                headers:{},
                mimeType: "application/json"
            };


            // Merge user xhr options object with default xhr options object
            for (var _key in defaults) {

                if (optionsDataObj.hasOwnProperty(_key)) {
                    defaults[_key] = optionsDataObj[_key];
                }
            }

            // Make the request with the merged object
            return _makeRequest(defaults.method, defaults.url, defaults.async, defaults.params, defaults.headers, defaults.mimeType);

        }


        return {

            get: function(requestOptions) {

                return _get(requestOptions);
            }
        }

    }]);
