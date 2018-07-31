'use strict';

/**
 * @ngdoc function
 * @name dreamfactoryApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the dreamfactoryApp
 */
angular.module('dreamfactoryApp')

    // MainCtrl is the parent controller of everything.  Checks routing and deals with navs
    .controller('MainCtrl', ['$scope', 'UserDataService', 'SystemConfigDataService', '$location', 'dfApplicationData', 'dfNotify', 'dfIconService', 'allowAdminAccess', '$animate',
        function ($scope, UserDataService, SystemConfigDataService, $location, dfApplicationData, dfNotify, dfIconService, allowAdminAccess, $animate) {

            // workaround for issue that causes flickering when loading schema tab
            // https://github.com/angular/angular.js/issues/14015
            $animate.enabled(false);

            // So child controllers can set the app section title
            $scope.title = '';

            // CurrentUser
            $scope.currentUser = UserDataService.getCurrentUser();

            // Top Level Links
            $scope.topLevelLinks = [

                {
                    path: 'https://www.dreamfactory.com/products',
                    target: '_blank',
                    label: 'Upgrade',
                    name: 'upgrade',
                    icon: dfIconService().upgrade,
                    show: false
                },
                {
                    path: 'http://www.dreamfactory.com/support',
                    target: '_blank',
                    label: 'Support',
                    name: 'support',
                    icon: dfIconService().support,
                    show: false
                },
                {
                    path: '#/launchpad',
                    target: null,
                    label: 'LaunchPad',
                    name: 'launchpad',
                    icon: dfIconService().launchpad,
                    show: false
                },
                {
                    path: '#/home',
                    target: null,
                    label: 'Admin',
                    name: 'admin',
                    icon: dfIconService().admin,
                    show: false
                },
                {
                    path: '#/login',
                    target: null,
                    label: 'Login',
                    name: 'login',
                    icon: dfIconService().login,
                    show: false
                },
                {
                    path: '#/register',
                    target: null,
                    label: 'Register',
                    name: 'register',
                    icon: dfIconService().register,
                    show: false
                },
                {
                    path: null,
                    target: null,
                    label: UserDataService.getCurrentUser().name,
                    name: 'user',
                    icon: dfIconService().user,
                    show: false,
                    subLinks: [
                        {
                            path: '#/profile',
                            target: null,
                            label: 'Profile',
                            name: 'profile',
                            icon: null,
                            show: false
                        },
                        {
                            path: '#/logout',
                            target: null,
                            label: 'Logout',
                            name: 'logout',
                            icon: null,
                            show: false
                        }
                    ]
                }
            ];

            $scope.topLevelNavOptions = {
                links: $scope.topLevelLinks
            };

            // View options
            $scope.showAdminComponentNav = false;
            $scope.showHeader = true;
            $scope.showLicenseExpiredBanner = true;

            var navLinks = [

                {
                    name: 'home',
                    label: 'Home',
                    path: '/home'
                },
                {
                    name: 'apps',
                    label: 'Apps',
                    path: '/apps'
                },
                {
                    name: 'admins',
                    label: 'Admins',
                    path: '/admins'
                },
                {
                    name: 'users',
                    label: 'Users',
                    path: '/users'
                },
                {
                    name: 'roles',
                    label: 'Roles',
                    path: '/roles'
                },
                {
                    name: 'services',
                    label: 'Services',
                    path: '/services'
                },
                {
                    name: 'apidocs',
                    label: 'API Docs',
                    path: '/apidocs'
                },
                {
                    name: 'schema',
                    label: 'Schema',
                    path: '/schema'
                },
                {
                    name: 'data',
                    label: 'Data',
                    path: '/data'
                },
                {
                    name: 'file-manager',
                    label: 'Files',
                    path: '/file-manager'
                },
                {
                    name: 'scripts',
                    label: 'Scripts',
                    path: '/scripts'
                },
                {
                    name: 'config',
                    label: 'Config',
                    path: '/config'
                },
                {
                    name: 'package-manager',
                    label: 'Packages',
                    path: '/package-manager'
                },
                {
                    name: 'limit',
                    label: 'Limits',
                    path: '/limits'
                }
            ];

            $scope.componentNavOptions = {

                links: navLinks
            };

            // PRIVATE API

            $scope._setComponentLinks = function (isAdmin) {

                var links = angular.copy(navLinks);

                if (!isAdmin) {
                    // remove admins, roles, limits for non-admins
                    links.splice(2, 1);
                    links.splice(3, 1);
                    links.splice(11, 1);
                }

                $scope.componentNavOptions = {

                    links: links
                };
            };

        // Sets links for navigation
        $scope._setActiveLinks = function(linksArr, activeLinksArr) {

            var found, i;

            angular.forEach(linksArr, function(link) {

                found = false;

                for (i = 0; i < activeLinksArr.length; i++) {

                    if (link.name === activeLinksArr[i]) {

                        found = true;
                        break;
                    }
                }

                link.show = found;
            });
        };

        // Sets a property on a link in the top level links
        $scope.setTopLevelLinkValue = function (linkName, linkProp, value) {


            for (var i = 0;  i < $scope.topLevelLinks.length; i++) {

                if ($scope.topLevelLinks[i].name === linkName) {

                    $scope.topLevelLinks[i][linkProp] = value;
                    break;
                }
            }
        };


        // WATCHERS


        $scope.$watch('currentUser', function (newValue, oldValue) {

            var links, systemConfig;

            if (!angular.equals(newValue, oldValue)) {
                // user changed, reset application object to force reload of all data
                dfApplicationData.resetApplicationObj();
            }

            links = ['support'];

            // get updated system config. it changes on login/logout
            systemConfig = SystemConfigDataService.getSystemConfig();
            if (systemConfig) {
                // Check for apps.
                if (systemConfig.apps && systemConfig.apps.length > 0) {
                    // There are apps so show launchpad option.
                    links.push("launchpad");
                }

                if (systemConfig.hasOwnProperty('platform') && systemConfig.platform.license == 'OPEN SOURCE'){
                    links.push("upgrade");
                }
            }

            // Check for currentUser.
            if (!newValue) {
                // There is no currentUser.

                links.push('login');

                // If no config available then hide register option.
                // Else if open reg is enabled then show register option.
                if (systemConfig && systemConfig.authentication && systemConfig.authentication.hasOwnProperty('allow_open_registration') && systemConfig.authentication.allow_open_registration) {
                    links.push('register');
                }

                // Not logged in. Hide chat.
                Comm100API.showChat(false);
            }
            else {
                // We have a current user. Set name in menu button. Have to set this explicitly.
                $scope.setTopLevelLinkValue('user', 'label', newValue.name);
                if (newValue.is_sys_admin) {
                    // Enable/disable chat for admins. Default to enabled in case nothing is set in db or there's an error.
                    var chatEnabled = true;
                    dfApplicationData.getApiData(['custom']).then(
                        function (response) {
                            var custom = response[0].resource.filter(function (obj) {
                                return (obj.name === 'chat');
                            });
                            if (custom.length > 0) {
                                chatEnabled = Boolean(custom[0].value);
                            }
                        }
                    ).finally(
                        function () {
                            Comm100API.showChat(chatEnabled);
                        }
                    );
                }
                links.push('user');
            }

            // add admin option if system config says we have access to it
            if (allowAdminAccess.get()) {
                links.push('admin');
            }

            $scope._setActiveLinks($scope.topLevelLinks, links);
            $scope._setComponentLinks(newValue && newValue.is_sys_admin);
        });

        $scope.$watch(function () {return UserDataService.getCurrentUser().name}, function (n, o) {


            if (!n) return;

            $scope.setTopLevelLinkValue('user', 'label', n);
        });

        // on $routeChangeSuccess show/hide admin top nav bar

        $scope.$on('$routeChangeSuccess', function (e) {

            $scope.showHeader = true;
            $scope.showLicenseExpiredBanner = true;

            switch ($location.path()) {
                case '/home':
                case '/apps':
                case '/admins':
                case '/users':
                case '/roles':
                case '/services':
                case '/apidocs':
                case '/schema':
                case '/data':
                case '/file-manager':
                case '/scripts':
                case '/config':
                case '/package-manager':
                case '/limits':
                    $scope.showAdminComponentNav = true;
                    break;
                case '/license-expired':
                    $scope.showHeader = false;
                    $scope.showLicenseExpiredBanner = false;
                    $scope.showAdminComponentNav = false;
                    break;
                default:
                    $scope.showAdminComponentNav = false;
                    break;
            }
        });
    }])

    // Our LoginCtrl controller inherits from our TopLevelAppCtrl controller
    // This controller provides an attachment point for our Login Functionality
    // We inject $location because we'll want to update our location on a successful
    // login and the UserEventsService from our DreamFactory User Management Module to be able
    // to respond to events generated from that module
    .controller('LoginCtrl', ['$scope', '$window', '$location', '$timeout', 'UserDataService', 'UserEventsService', 'dfApplicationData', 'SystemConfigDataService', 'dfNotify', function($scope, $window, $location, $timeout, UserDataService, UserEventsService, dfApplicationData, SystemConfigDataService, dfNotify) {

        // Login options array
        $scope.loginOptions = {
            showTemplate: true
        };

        // Listen for a password set success message
        // This returns a user credentials object which is just the email and password
        // from the register form
        // on success we...
        $scope.$on(UserEventsService.password.passwordSetSuccess, function(e, userCredsObj) {

            // alert success to user
            var messageOptions = {
                module: 'Users',
                type: 'success',
                provider: 'dreamfactory',
                message: 'Password reset successful.'
            };

            dfNotify.success(messageOptions);

            // Send a message to our login directive requesting a login.
            // We send our user credentials object that we received from our successful
            // registration along to it can log us in.
            $scope.$broadcast(UserEventsService.login.loginRequest, userCredsObj);
        });

        // Handle a login error
        // The directive will handle showing the message.  We just have to
        // stop the event propagation
        $scope.$on(UserEventsService.login.loginError, function (e) {
            e.stopPropagation();
        });


        // Listen for the login success message which returns a user data obj
        // When we have a successful login...
        $scope.$on(UserEventsService.login.loginSuccess, function(e, userDataObj) {

            // For normal logins, we need to make sure data is reset before getting system config again
            // in order for the user@example.com/bitnami_demo logic to work. The watcher on currentUser
            // will reset the data, but that happens too late so it also needs to be done here.
            if (!angular.equals($scope.$parent.currentUser, userDataObj)) {
                // user changed, reset application object to force reload of all data
                dfApplicationData.resetApplicationObj();
            }

            // Set our parent's current user var
            $scope.$parent.currentUser = userDataObj;

            //Login using OAuth...
            var queryString = location.search.substring(1);

            // Hide our login template while services build
            $scope.loginOptions.showTemplate = false;

            if (userDataObj.is_sys_admin) {
                // Change our app location back to the home page
                if (queryString) {
                    // if logging in using oauth then do a full reload
                    // is needed to remove oauth related info from url.
                    var uri = $location.absUrl().split('?');
                    $window.location.href = uri[0] + '#/home';
                } else {
                    if (userDataObj.is_sys_admin && 'user@example.com' === userDataObj.email) {
                        var systemConfig = SystemConfigDataService.getSystemConfig();
                        if (systemConfig && systemConfig.platform && systemConfig.platform.hasOwnProperty('bitnami_demo') && !systemConfig.platform.bitnami_demo) {
                            $location.url('/profile');
                        } else {
                            $location.url('/home');
                        }
                    } else {
                        $location.url('/home');
                    }
                }
            } else {
                // Send em to launchpad
                if(queryString){
                    // if logging in using oauth then do a full reload
                    // is needed to remove oauth related info from url.
                    var uri = $location.absUrl().split('?');
                    $window.location.href = uri[0]+'#/launchpad';
                } else {
                    $location.url('/launchpad');
                }
            }
        });

    }])

    // Our LogoutCtrl controller inherits from out TopLevelAppCtrl controller
    // This controller provides an attachment point for our logout functionality
    // We inject $location and the UserEventsService...same as the LoginCtrl.
    .controller('LogoutCtrl', ['$scope', '$location', 'UserEventsService', 'dfApplicationData', function($scope, $location, UserEventsService, dfApplicationData) {

        // Listen for the logout success message
        // then we...
        $scope.$on(UserEventsService.logout.logoutSuccess, function(e, userDataObj) {

            // Set the current user var on the parent
            // the userDataObj passed with the success message is just a boolean
            // and should be 'false'
            $scope.$parent.currentUser = userDataObj;

            // go to login
            $location.url('/login');
        });
    }])

    // Our RegisterCtrl controller inherits from our TopLevelAppCtrl controller
    // This controller provides an attachment point for our register users functionality
    // We inject $location and UserEventService for the same reasons as stated in the LoginCtrl controller
    // description.
    .controller('RegisterCtrl', ['$scope', '$location', 'UserEventsService', 'SystemConfigDataService', function($scope, $location, UserEventsService, SystemConfigDataService) {


        // If we have an email service registered with open registration then
        // we require confirmation.  If that value is null...then we do not require
        // confirmation
        var confirmationRequired = true;
        var systemConfig = SystemConfigDataService.getSystemConfig();
        if (systemConfig && systemConfig.authentication && systemConfig.authentication.hasOwnProperty('open_reg_email_service_id')) {
            confirmationRequired = !!systemConfig.authentication.open_reg_email_service_id;
        }

        $scope.options = {
            confirmationRequired: confirmationRequired
        };

        // Listen for a register success message
        // This returns a user credentials object which is just the email and password
        // from the register form
        // on success we...
        $scope.$on(UserEventsService.register.registerSuccess, function(e, userCredsObj) {

            // Send a message to our login directive requesting a login.
            // We send our user credentials object that we received from our successful
            // registration along to it can log us in.
            $scope.$broadcast(UserEventsService.login.loginRequest, userCredsObj);
        });


        // Listen for a register confirmation message
        // on confirmation required we...
        $scope.$on(UserEventsService.register.registerConfirmation, function(e) {

            // redirect to our registration thanks page
            // that contains more directions
            $location.url('/register-complete')
        });

        // We handle login the same way here as we did in the LoginCtrl controller
        // While this breaks the DRY(Don't repeat yourself) rule... we don't have access
        // to the LoginCtrl to do this for us and although we could ping from route to route
        // in order not to write the same code twice...the user experience would suffer and
        // we would probably write more code trying not to repeat ourselves.
        $scope.$on(UserEventsService.login.loginSuccess, function(e, userDataObj) {

            // Assign the user to the parent current user var
            $scope.$parent.currentUser = userDataObj;

            // redirect to the app home page
            $location.url('/launchpad');
        });

        $scope.$on(UserEventsService.login.loginError, function (e) {
            e.stopPropagation();
        });
    }])

    // displays our thanks for registering page
    .controller('RegisterCompleteCtrl', ['$scope', function($scope) {

        // Don't need anything in here.  Just yet anyway.
    }])

    // Controls confirmation flow
    .controller('RegisterConfirmCtrl', ['$scope', '$location', 'dfApplicationData', 'UserEventsService', 'SystemConfigDataService', 'dfNotify',  function($scope, $location, dfApplicationData, UserEventsService, SystemConfigDataService, dfNotify) {


        $scope.confirmOptions = {

            showTemplate: true,
            title: 'Registration Confirmation'
        };

        $scope.loginOptions = {
            showTemplate: false
        };

        $scope.registerLoginErrorMsg = '';
        $scope.inviteType = 'user';

        // Listen for a confirmation success message
        // This returns a user credentials object which is just the email and password
        // from the register form
        // on success we...
        $scope.$on(UserEventsService.confirm.confirmationSuccess, function(e, userCredsObj) {

            // Send a message to our login directive requesting a login.
            // We send our user credentials object that we received from our successful
            // registration along to it can log us in.
            $scope.$broadcast(UserEventsService.login.loginRequest, userCredsObj);
        });


        // We handle login the same way here as we did in the LoginCtrl controller
        // While this breaks the DRY(Don't repeat yourself) rule... we don't have access
        // to the LoginCtrl to do this for us and although we could ping from route to route
        // in order not to write the same code twice...the user experience would suffer and
        // we would probably write more code trying not to repeat ourselves.
        $scope.$on(UserEventsService.login.loginSuccess, function(e, userDataObj) {

            // alert success to user
            var messageOptions = {
                module: 'Users',
                type: 'success',
                provider: 'dreamfactory',
                message: 'Registration Confirmation successful.'
            };

            dfNotify.success(messageOptions);

            // Assign the user to the parent current user var
            $scope.$parent.currentUser = userDataObj;

            // redirect to the app home page
            $location.url('/launchpad');
        });

        // Handle a login error
        $scope.$on(UserEventsService.login.loginError, function(e, errMsg) {

            e.stopPropagation();
            $scope.registerLoginErrorMsg = errMsg.data.error.message;
        });
    }])

    // Controls Reset of password
    .controller('ResetPasswordEmailCtrl', ['$scope', '$location', 'dfApplicationData', 'UserEventsService', 'SystemConfigDataService', 'dfNotify', '$timeout',  function($scope, $location, dfApplicationData, UserEventsService, SystemConfigDataService, dfNotify, $timeout) {

        // Login options array
        $scope.loginOptions = {
            showTemplate: false
        };

        $scope.resetPasswordLoginErrorMsg = '';

        // Listen for a confirmation success message
        // This returns a user credentials object which is just the email and password
        // from the register form
        // on success we...
        $scope.$on(UserEventsService.password.passwordSetSuccess, function(e, userCredsObj) {

            e.stopPropagation();


            // Send a message to our login directive requesting a login.
            // We send our user credentials object that we received from our successful
            // registration along to it can log us in.
            $scope.$broadcast(UserEventsService.login.loginRequest, userCredsObj);
        });


        // We handle login the same way here as we did in the LoginCtrl controller
        // While this breaks the DRY(Don't repeat yourself) rule... we don't have access
        // to the LoginCtrl to do this for us and although we could ping from route to route
        // in order not to write the same code twice...the user experience would suffer and
        // we would probably write more code trying not to repeat ourselves.
        $scope.$on(UserEventsService.login.loginSuccess, function(e, userDataObj) {

            // alert success to user
            var messageOptions = {
                module: 'Users',
                type: 'success',
                provider: 'dreamfactory',
                message: 'Password reset successful.'
            };

            dfNotify.success(messageOptions);

            // Set our parent's current user var
            $scope.$parent.currentUser = userDataObj;

            // Hide our login template while services build
            $scope.loginOptions.showTemplate = false;

            // Change our app location back to the home page
            if (userDataObj.is_sys_admin && 'user@example.com' === userDataObj.email) {
                var systemConfig = SystemConfigDataService.getSystemConfig();
                if (systemConfig && systemConfig.platform && systemConfig.platform.hasOwnProperty('bitnami_demo') && !systemConfig.platform.bitnami_demo) {
                    $location.url('/profile');
                } else {
                    $location.url('/home');
                }
            } else {
                $location.url('/home');
            }
        });


        // Handle a login error
        $scope.$on(UserEventsService.login.loginError, function(e, errMsg) {

            e.stopPropagation();
            $scope.resetPasswordLoginErrorMsg = errMsg.data.error.message;
        });

    }])

    // Controls User Invite Page
    .controller('UserInviteCtrl', ['$scope', '$location', 'dfApplicationData', 'UserEventsService', 'SystemConfigDataService', 'dfNotify',  function($scope, $location, dfApplicationData, UserEventsService, SystemConfigDataService, dfNotify) {

        $scope.confirmOptions = {

            showTemplate: true,
            title: 'Invitation Confirmation'
        };

        // == is on purpose
        $scope.inviteType = ($location.search().admin == 1) ? 'admin' : 'user';

        $scope.loginOptions = {
            showTemplate: false
        };

        $scope.confirmLoginErrorMsg = '';

        // Listen for a confirmation success message
        // This returns a user credentials object which is just the email and password
        // from the register form
        // on success we...
        $scope.$on(UserEventsService.confirm.confirmationSuccess, function(e, userCredsObj) {

            // Send a message to our login directive requesting a login.
            // We send our user credentials object that we received from our successful
            // registration along to it can log us in.
            $scope.$broadcast(UserEventsService.login.loginRequest, userCredsObj);
        });


        // We handle login the same way here as we did in the LoginCtrl controller
        // While this breaks the DRY(Don't repeat yourself) rule... we don't have access
        // to the LoginCtrl to do this for us and although we could ping from route to route
        // in order not to write the same code twice...the user experience would suffer and
        // we would probably write more code trying not to repeat ourselves.
        $scope.$on(UserEventsService.login.loginSuccess, function(e, userDataObj) {

            // alert success to user
            var messageOptions = {
                module: 'Users',
                type: 'success',
                provider: 'dreamfactory',
                message: 'User Confirmation successful.'
            };

            dfNotify.success(messageOptions);

            // Assign the user to the parent current user var
            $scope.$parent.currentUser = userDataObj;

            // redirect to the app home page
            $location.url('/launchpad');
        });


        // Handle a login error
        $scope.$on(UserEventsService.login.loginError, function(e, errMsg) {

            e.stopPropagation();
            $scope.confirmLoginErrorMsg = errMsg.data.error.message;
        });
    }]);