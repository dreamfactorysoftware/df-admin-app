'use strict';

/**
 * @ngdoc overview
 * @name dreamfactoryApp
 * @description
 * # dreamfactoryApp
 *
 * Main module of the application.
 */
angular
    .module('dreamfactoryApp', [
        'ngAnimate',
        'ngCookies',
        'ngResource',
        'ngRoute',
        'ngSanitize',
        'ngTouch',
        'dfUtility',
        'dfHome',
        'dfSystemConfig',
        'dfAdmins',
        'dfUsers',
        'dfApps',
        'dfData',
        'dfServices',
        'dfRoles',
        'dfSchema',
        'dfUserManagement',
        'dfScripts',
        'dfProfile',
        'dfApplication',
        'dfHelp',
        'dfLaunchPad',
        'dfApiDocs',
        'dfFileManager',
        'dfPackageManager',
        'dfLimit'
    ])

    // each tab uses this in its resolve function to make sure user is allowed access
    // if access is not allowed the user is sent to launchpad
    .factory('checkUserService', function ($location, $q, SystemConfigDataService) {

        return {

            checkUser: function () {

                var deferred = $q.defer();

                // check if admin app access is allowed
                // it will be allowed for admin users, and non-admin users whose role allows it
                // if no role is assigend for the user for the admin app the default role can also allow access

                var systemConfig = SystemConfigDataService.getSystemConfig();
                var result = false;
                if (systemConfig) {
                    result = (systemConfig.apps && systemConfig.apps.filter(function (item) {
                        return (item.name === 'admin');
                    }).length > 0);
                }
                if (result) {
                    // user has access to admin, proceed to load the requested admin route
                    deferred.resolve();
                } else {
                    // user does not have access to admin, redirect to launchpad
                    $location.url('/launchpad');
                    deferred.reject();
                }
                return deferred.promise;
            }
        };
    })

    // some tabs need to check if user is an admin

    .factory('checkAdminService', function ($q, UserDataService, $location) {

        return {

            checkAdmin: function () {

                var deferred = $q.defer();
                var currentUser = UserDataService.getCurrentUser();

                if (currentUser && currentUser.is_sys_admin) {
                    // admin
                    deferred.resolve();
                } else {
                    // not admin
                    $location.url('/launchpad');
                    deferred.reject();
                }

                return deferred.promise;
            }
        };
    })

    .factory('allowAdminAccess', function (SystemConfigDataService) {

        return {

            get: function () {
                var result = false;
                var systemConfig = SystemConfigDataService.getSystemConfig();
                if (systemConfig) {
                    result = (systemConfig.apps && systemConfig.apps.filter(function (item) {
                        return (item.name === 'admin');
                    }).length > 0);
                }
                return result;
            }
        };
    })

    // Set application version number
    .constant('APP_VERSION', '2.15.0')

    // Set global url for this application
    .constant('INSTANCE_BASE_URL', '')

    // Make prefix configurable
    .constant('INSTANCE_API_PREFIX', '/api/v2')

    // App should use this service when making calls to the API
    .service('INSTANCE_URL', ['INSTANCE_BASE_URL', 'INSTANCE_API_PREFIX', function (INSTANCE_BASE_URL, INSTANCE_API_PREFIX) { this.url = INSTANCE_BASE_URL + INSTANCE_API_PREFIX;}])

    // Set API key for this application
    .constant('APP_API_KEY', '6498a8ad1beb9d84d63035c5d1120c007fad6de706734db9689f8996707e0f7d')

    // Set global header for calls made to DreamFactory instance
    .config(['$httpProvider', 'APP_API_KEY', function($httpProvider, APP_API_KEY) {

        $httpProvider.defaults.headers.common['X-Dreamfactory-API-Key'] = APP_API_KEY;
        $httpProvider.defaults.headers.delete = {'Content-Type': 'application/json;charset=utf-8'};
    }])

    // Configure main app routing rules
    .config(['$routeProvider', '$locationProvider', '$httpProvider', '$qProvider', function ($routeProvider, $locationProvider, $httpProvider, $qProvider) {

        $locationProvider.hashPrefix("");

        $routeProvider
            .when('/login', {
                controller: 'LoginCtrl',
                templateUrl: 'views/login.html',
                resolve: {

                    checkOtherRoute: ['$q', 'UserDataService', '$location', 'SystemConfigDataService', function ($q, UserDataService, $location, SystemConfigDataService) {

                        var deferred = $q.defer();
                        var currentUser = UserDataService.getCurrentUser();

                        // we're trying to go to login
                        // if we have a valid session then no need to go to login
                        if (currentUser && currentUser.session_token) {
                            if (currentUser.is_sys_admin) {
                                var systemConfig = SystemConfigDataService.getSystemConfig();
                                if ('user@example.com' === currentUser.email) {
                                    if (systemConfig && systemConfig.platform && systemConfig.platform.hasOwnProperty('bitnami_demo') && !systemConfig.platform.bitnami_demo) {
                                        $location.url('/profile');
                                    } else {
                                        $location.url('/home');
                                    }
                                } else {
                                    $location.url('/home');
                                }
                            } else {
                                $location.url('/launchpad');
                            }
                            deferred.reject();
                        } else {
                            deferred.resolve();
                        }
                        return deferred.promise;
                    }]
                }
            })
            .when('/logout', {
                templateUrl: 'views/logout.html',
                controller: 'LogoutCtrl'
            })
            .when('/register', {
                templateUrl: 'views/register.html',
                controller: 'RegisterCtrl',
                resolve: {

                    checkRegisterRoute: ['$q', 'UserDataService', '$location', 'SystemConfigDataService', function ($q, UserDataService, $location, SystemConfigDataService) {

                        var deferred = $q.defer();
                        var currentUser = UserDataService.getCurrentUser();

                        if (currentUser) {
                            if (currentUser.is_sys_admin) {
                                $location.url('/home');
                            } else {
                                $location.url('/launchpad');
                            }
                            deferred.reject();
                        } else {
                            var systemConfig = SystemConfigDataService.getSystemConfig();
                            if (systemConfig && systemConfig.authentication && systemConfig.authentication.hasOwnProperty('allow_open_registration') && systemConfig.authentication.allow_open_registration) {
                                deferred.resolve();
                            } else {
                                $location.url('/login');
                                deferred.reject();
                            }
                        }
                        return deferred.promise;
                    }]
                }
            })
            .when('/register-complete', {
                templateUrl: 'views/register-complete.html',
                controller: 'RegisterCompleteCtrl',
                resolve: {

                    checkRegisterCompleteRoute: ['$q', 'UserDataService', '$location', 'SystemConfigDataService', function ($q, UserDataService, $location, SystemConfigDataService) {

                        var deferred = $q.defer();
                        var currentUser = UserDataService.getCurrentUser();

                        if (currentUser) {
                            if (currentUser.is_sys_admin) {
                                $location.url('/home');
                            } else {
                                $location.url('/launchpad');
                            }
                            deferred.reject();
                        } else {
                            var systemConfig = SystemConfigDataService.getSystemConfig();
                            if (systemConfig && systemConfig.authentication && systemConfig.authentication.hasOwnProperty('allow_open_registration') && systemConfig.authentication.allow_open_registration) {
                                deferred.resolve();
                            } else {
                                $location.url('/login');
                                deferred.reject();
                            }
                        }
                        return deferred.promise;
                    }]
                }
            })
            .when('/register-confirm', {
                templateUrl: 'views/register-confirm.html',
                controller: "RegisterConfirmCtrl",
                resolve: {

                    checkRegisterConfirmRoute: ['$q', 'UserDataService', '$location', 'SystemConfigDataService', function ($q, UserDataService, $location, SystemConfigDataService) {

                        var deferred = $q.defer();
                        var currentUser = UserDataService.getCurrentUser();

                        if (currentUser) {
                            if (currentUser.is_sys_admin) {
                                $location.url('/home');
                            } else {
                                $location.url('/launchpad');
                            }
                            deferred.reject();
                        } else {
                            var systemConfig = SystemConfigDataService.getSystemConfig();
                            if (systemConfig && systemConfig.authentication && systemConfig.authentication.hasOwnProperty('allow_open_registration') && systemConfig.authentication.allow_open_registration) {
                                deferred.resolve();
                            } else {
                                $location.url('/login');
                                deferred.reject();
                            }
                        }
                        return deferred.promise;
                    }]
                }
            })
            .when('/reset-password', {
                templateUrl: 'views/reset-password-email.html',
                controller: 'ResetPasswordEmailCtrl',
                resolve: {

                    checkResetPasswordRoute: ['$q', 'UserDataService', '$location', function ($q, UserDataService, $location) {

                        var deferred = $q.defer();
                        var currentUser = UserDataService.getCurrentUser();

                        if (currentUser) {
                            if (currentUser.is_sys_admin) {
                                $location.url('/home');
                            } else {
                                $location.url('/launchpad');
                            }
                            deferred.reject();
                        } else {
                            deferred.resolve();
                        }
                        return deferred.promise;
                    }]
                }
            })
            .when('/user-invite', {
                templateUrl: 'views/user-invite.html',
                controller: 'UserInviteCtrl',
                resolve: {

                    checkUserInviteRoute: ['$q', 'UserDataService', '$location', function ($q, UserDataService, $location) {

                        var deferred = $q.defer();
                        var currentUser = UserDataService.getCurrentUser();

                        if (currentUser) {
                            if (currentUser.is_sys_admin) {
                                $location.url('/home');
                            } else {
                                $location.url('/launchpad');
                            }
                            deferred.reject();
                        } else {
                            deferred.resolve();
                        }
                        return deferred.promise;
                    }]
                }
            })
            .otherwise({
                controller: 'LoginCtrl',
                templateUrl: 'views/login.html',
                resolve: {

                    checkOtherRoute: ['$q', 'UserDataService', '$location', 'SystemConfigDataService', function ($q, UserDataService, $location, SystemConfigDataService) {

                        var deferred = $q.defer();
                        var currentUser = UserDataService.getCurrentUser();

                        // if we are loading the base URL of index.html then the path will be ""
                        // if we have a valid session then go to admin app or launchpad
                        // if there is no session then go to login
                        if (currentUser && currentUser.session_token) {
                            if (currentUser.is_sys_admin) {
                                var systemConfig = SystemConfigDataService.getSystemConfig();
                                if (currentUser.email === 'user@example.com' && systemConfig && systemConfig.platform.hasOwnProperty('bitnami_demo') && !systemConfig.platform.bitnami_demo) {
                                    $location.url('/profile');
                                } else {
                                    $location.url('/home');
                                }
                            } else {
                                $location.url('/launchpad');
                            }
                        } else {
                            $location.url('/login');
                        }
                        deferred.reject();
                        return deferred.promise;
                    }]
                }
            });

        $httpProvider.interceptors.push('httpValidSession');
    }])

    // Configure Error handling
    .config(['$provide', function($provide) {

        $provide.decorator('$exceptionHandler', ['$delegate', '$injector', function($delegate, $injector) {

            return function(exception, foo) {

                // Angular 1.6 requires exceptions thrown in promises to be caught.
                // The admin app itself should use dfNotify and not throw exceptions
                // for rejected promises. In order to allow modules like user mgt,
                // tables, and utility to continue to throw exceptions we add this
                // check here.

                if (typeof exception === 'string') {
                    var prefix = "Possibly unhandled rejection: ";
                    if (exception.indexOf(prefix) === 0) {
                        exception = angular.fromJson(exception.slice(prefix.length));
                    }
                }

                // Was this error thrown explicitly by a module

                if (exception.provider && (exception.provider === 'dreamfactory')) {

                    $injector.invoke(['dfNotify', function(dfNotify) {

                        var messageOptions = {
                            module: exception.module,
                            type: exception.type,
                            provider: exception.provider,
                            message: exception.exception
                        };

                        dfNotify.error(messageOptions);
                    }]);
                }
                else {

                    // Continue on to normal error handling
                    return $delegate(exception);
                }
            };
        }]);
    }]);