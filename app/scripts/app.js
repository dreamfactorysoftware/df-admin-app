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
        'dfWidgets',
        'dfSwaggerEditor',
        'dfApiDocs',
        'dfFileManager',
        'dfPackageManager'
    ])

    // Set application version number
    .constant('APP_VERSION', '2.0.0')

    // Set global url for this application
    .constant('INSTANCE_URL', '')

    // Set API key for this application
    .constant('ADMIN_API_KEY', '6498a8ad1beb9d84d63035c5d1120c007fad6de706734db9689f8996707e0f7d')

    // Set global header for calls made to DreamFactory instance
    .config(['$httpProvider', 'ADMIN_API_KEY', function($httpProvider, ADMIN_API_KEY) {

        $httpProvider.defaults.headers.common['X-Dreamfactory-API-Key'] = ADMIN_API_KEY;
    }])

    // Configure main app routing rules
    .config(['$routeProvider', '$httpProvider', function ($routeProvider, $httpProvider) {
        $routeProvider
            .when('/login', {
                controller: 'LoginCtrl',
                templateUrl: 'views/login.html',
                resolve: {

                    checkLoginRoute: ['dfApplicationData', '$location', function (dfApplicationData, $location) {

                        var currentUser = dfApplicationData.getCurrentUser();

                        if (currentUser && currentUser.session_id) {
                            if (currentUser.is_sys_admin) {
                                if (currentUser.email === 'user@example.com') {
                                    $location.url('/profile');
                                } else {
                                    $location.url('/home');
                                }
                            } else {
                                $location.url('/launchpad');
                            }
                        }
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

                    checkRegisterRoute: ['SystemConfigDataService', 'dfApplicationData', '$location', function (SystemConfigDataService, dfApplicationData, $location) {

                        var sysConfig = SystemConfigDataService.getSystemConfig(),
                            currentUser = dfApplicationData.getCurrentUser();

                        // No guest users and no open registration
                        if (!currentUser && !sysConfig.authentication.allow_open_registration) {
                            $location.url('/login');
                            return;
                        }

                        // User is guest or not an admin and we don't allow open registration
                        if (currentUser && !currentUser.is_sys_admin && !sysConfig.authentication.allow_open_registration) {
                            $location.url('/launchpad');
                            return;
                        }

                        // we have a user and that user is an admin
                        if (currentUser && currentUser.is_sys_admin) {
                            $location.url('/home');
                            return;
                        }


                    }]
                }
            })
            .when('/register-complete', {
                templateUrl: 'views/register-complete.html',
                controller: 'RegisterCompleteCtrl',
                resolve: {

                    checkRegisterConfirmRoute: ['SystemConfigDataService', 'dfApplicationData', '$location', function (SystemConfigDataService, dfApplicationData, $location) {

                        var sysConfig = SystemConfigDataService.getSystemConfig(),
                            currentUser = dfApplicationData.getCurrentUser();

                        if (!currentUser && !sysConfig.authentication.allow_open_registration) {
                            $location.url('/login');
                            return;
                        }

                        if (currentUser && currentUser.is_sys_admin) {
                            $location.url('/home');
                            return;
                        }

                        if (currentUser && !currentUser.is_sys_admin) {
                            $location.url('/launchpad');
                            return;
                        }
                    }]
                }
            })
            .when('/register-confirm', {
                templateUrl: 'views/register-confirm.html',
                controller: "RegisterConfirmCtrl",
                resolve: {

                    checkRegisterConfirmRoute: ['SystemConfigDataService', 'dfApplicationData', '$location', function (SystemConfigDataService, dfApplicationData, $location) {

                        var sysConfig = SystemConfigDataService.getSystemConfig(),
                            currentUser = dfApplicationData.getCurrentUser();

                        if (!currentUser && !sysConfig.authentication.allow_open_registration) {
                            $location.url('/login');
                            return;
                        }

                        if (currentUser && currentUser.is_sys_admin) {
                            $location.url('/home');
                            return;
                        }

                        if (currentUser && !currentUser.is_sys_admin) {
                            $location.url('/launchpad');
                            return;
                        }
                    }]
                }
            })
            .when('/reset-password', {
                templateUrl: 'views/reset-password-email.html',
                controller: 'ResetPasswordEmailCtrl',
                resolve: {

                    checkRegisterConfirmRoute: ['SystemConfigDataService', 'dfApplicationData', '$location', function (SystemConfigDataService, dfApplicationData, $location) {

                        var currentUser = dfApplicationData.getCurrentUser();

                        if (currentUser && currentUser.is_sys_admin) {
                            $location.url('/home');
                            return;
                        }

                        if (currentUser && !currentUser.is_sys_admin) {
                            $location.url('/launchpad');
                            return;
                        }
                    }]

                }

            })
            .when('/user-invite', {
                templateUrl: 'views/user-invite.html',
                controller: 'UserInviteCtrl',
                resolve: {

                    checkRegisterConfirmRoute: ['SystemConfigDataService', 'dfApplicationData', '$location', function (SystemConfigDataService, dfApplicationData, $location) {

                        var currentUser = dfApplicationData.getCurrentUser();

                        if (currentUser && currentUser.is_sys_admin) {
                            $location.url('/home');
                            return;
                        }

                        if (currentUser && !currentUser.is_sys_admin) {
                            $location.url('/launchpad');
                            return;
                        }
                    }]
                }
            })
            .otherwise({
                redirectTo: '/launchpad'
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
                else if (exception.routing) {

                    $injector.invoke(['dfNotify', function(dfNotify) {

                        var messageOptions = {
                            module: 'Admin Application',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: 'Access to this route requires Admin role.'
                        };

                        dfNotify.error(messageOptions);
                    }]);
                }

                else {

                    // Continue on to normal error handling
                    return $delegate(exception);
                }
            }
        }]);
    }])

    // Get the System Configuration and set in SystemConfigDataService
    // This is a synchronous call because we need the system config before
    // anything else should happen
    .run(['SystemConfigDataService',
        function(SystemConfigDataService) {

            var SystemConfig = SystemConfigDataService.getSystemConfigFromServerSync();

            SystemConfigDataService.setSystemConfig(SystemConfig);
    }]);

