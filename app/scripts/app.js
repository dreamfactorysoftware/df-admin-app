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

    .factory('checkUserService', function ($location, $q, dfApplicationData) {

        return {

            checkUser: function () {

                var deferred = $q.defer();

                // check if admin app access is allowed
                // it will be allowed for admin users, and non-admin users whose role allows it
                // if no role is assigend for the user for the admin app the default role can also allow access

                var config;
                dfApplicationData.getApiData(['environment']).then(
                    function (response) {
                        config = response[0];
                    },
                    function (error) {
                        config = null;
                    }
                ).finally(function() {
                    var result = false;
                    if (config) {
                        var groupedApp = config.app_group, noGroupApp = config.no_group_app;
                        // TODO: may need to also look at grouped apps
                        result = (noGroupApp && noGroupApp.filter(function (item) {
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
                });

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

    .factory('allowAdminAccess', function (dfApplicationData) {

        return {

            get: function () {
                var result = false;
                var config = dfApplicationData.getApiDataFromCache('environment');
                if (config) {
                    var groupedApp = config.app_group, noGroupApp = config.no_group_app;
                    // TODO: may need to also look at grouped apps
                    result = (noGroupApp && noGroupApp.filter(function (item) {
                        return (item.name === 'admin');
                    }).length > 0);
                }
                return result;
            }
        };
    })

    // Set application version number
    .constant('APP_VERSION', '2.11.0')

    // Set global url for this application
    .constant('INSTANCE_URL', '')

    // Set API key for this application
    .constant('ADMIN_API_KEY', '6498a8ad1beb9d84d63035c5d1120c007fad6de706734db9689f8996707e0f7d')

    // Set global header for calls made to DreamFactory instance
    .config(['$httpProvider', 'ADMIN_API_KEY', function($httpProvider, ADMIN_API_KEY) {

        $httpProvider.defaults.headers.common['X-Dreamfactory-API-Key'] = ADMIN_API_KEY;
        $httpProvider.defaults.headers.delete = {'Content-Type': 'application/json;charset=utf-8'};
    }])

    // Configure main app routing rules
    .config(['$routeProvider', '$httpProvider', function ($routeProvider, $httpProvider) {
        $routeProvider
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
                        var sysConfig = SystemConfigDataService.getSystemConfig();

                        if (currentUser) {
                            if (currentUser.is_sys_admin) {
                                $location.url('/home');
                            } else {
                                $location.url('/launchpad');
                            }
                            deferred.reject();
                        } else {
                            if (!sysConfig.authentication.allow_open_registration) {
                                $location.url('/login');
                                deferred.reject();
                            } else {
                                deferred.resolve();
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
                        var sysConfig = SystemConfigDataService.getSystemConfig();

                        if (currentUser) {
                            if (currentUser.is_sys_admin) {
                                $location.url('/home');
                            } else {
                                $location.url('/launchpad');
                            }
                            deferred.reject();
                        } else {
                            if (!sysConfig.authentication.allow_open_registration) {
                                $location.url('/login');
                                deferred.reject();
                            } else {
                                deferred.resolve();
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
                        var sysConfig = SystemConfigDataService.getSystemConfig();

                        if (currentUser) {
                            if (currentUser.is_sys_admin) {
                                $location.url('/home');
                            } else {
                                $location.url('/launchpad');
                            }
                            deferred.reject();
                        } else {
                            if (!sysConfig.authentication.allow_open_registration) {
                                $location.url('/login');
                                deferred.reject();
                            } else {
                                deferred.resolve();
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

                    checkLoginRoute: ['$q', 'UserDataService', '$location', 'SystemConfigDataService', function ($q, UserDataService, $location, SystemConfigDataService) {

                        var deferred = $q.defer();
                        var systemConfig = SystemConfigDataService.getSystemConfig();
                        var currentUser = UserDataService.getCurrentUser();

                        // we're trying to go to login
                        // if we have a valid session then no need to go to login
                        if (currentUser && currentUser.session_id) {
                            if (currentUser.is_sys_admin) {
                                if (currentUser.email === 'user@example.com' && !systemConfig.platform.bitnami_demo) {
                                    $location.url('/profile');
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
            });

        // $httpProvider.interceptors.push('httpVerbInterceptor');
        //$httpProvider.interceptors.push('httpWrapperInterceptor');
        $httpProvider.interceptors.push('httpValidSession');
    }])

    // Configure Error handling
    .config(['$provide', function($provide) {

        $provide.decorator('$exceptionHandler', ['$delegate', '$injector', function($delegate, $injector) {

            return function(exception) {

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