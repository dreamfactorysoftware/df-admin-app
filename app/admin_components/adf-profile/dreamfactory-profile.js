'use strict';


angular.module('dfProfile', ['ngRoute', 'dfUtility', 'dfUserManagement', 'dfApplication'])
    .constant('MOD_PROFILE_ROUTER_PATH', '/profile')
    .constant('MOD_PROFILE_ASSET_PATH', 'admin_components/adf-profile/')
    .config(['$routeProvider', 'MOD_PROFILE_ROUTER_PATH', 'MOD_PROFILE_ASSET_PATH',
        function ($routeProvider, MOD_PROFILE_ROUTER_PATH, MOD_PROFILE_ASSET_PATH) {
            $routeProvider
                .when(MOD_PROFILE_ROUTER_PATH, {
                    templateUrl: MOD_PROFILE_ASSET_PATH + 'views/main.html',
                    controller: 'ProfileCtrl',
                    resolve: {
                        checkProfileRoute: ['UserDataService', '$location', function (UserDataService, $location) {
                            if (!UserDataService.getCurrentUser()) {
                                $location.url('/login');
                            }
                        }]

                    }
                });
        }])
    .run([function () {

    }])
    .controller('ProfileCtrl', ['$scope', 'UserDataService', 'dfApplicationData', 'dfNotify', '$http', 'INSTANCE_URL', function ($scope, UserDataService, dfApplicationData, dfNotify, $http, INSTANCE_URL) {

        $scope.user = null;
        $scope.isAdminUser = UserDataService.getCurrentUser().is_sys_admin;
        $scope.resource = $scope.isAdminUser ? 'system/admin' : 'user';

        $http({
            method: 'GET',
            url: INSTANCE_URL.url + '/' + $scope.resource + '/profile'
        }).then(
            function (result) {
                $scope.user = result.data;
                if($scope.user.adldap || $scope.user.oauth_provider) {
                    angular.element('#set-password-section').hide();
                    angular.element('#set-security-question-section').hide();
                }
            },
            function (error) {
                var messageOptions = {
                    module: 'Profile',
                    provider: 'dreamfactory',
                    type: 'error',
                    message: 'There was an error loading User Profile data. Please try refreshing your browser and logging in again.'
                };
                dfNotify.error(messageOptions);
            }
        );

        // Set Title in parent
        $scope.$parent.title = '';

        // Set module links
        $scope.links = [

            {
                name: 'edit-profile',
                label: 'Profile',
                path: 'edit-profile'
            }
        ];
    }])
    .directive('dfEditProfile', ['MOD_PROFILE_ASSET_PATH', 'INSTANCE_URL', 'dfNotify', 'dfApplicationData', 'UserDataService', 'dfObjectService', '$http', '$cookies', 'SystemConfigDataService', function (MOD_APPS_ASSET_PATH, INSTANCE_URL, dfNotify, dfApplicationData, UserDataService, dfObjectService, $http, $cookies, SystemConfigDataService) {

        return {

            restrict: 'E',
            scope: false,
            templateUrl: MOD_APPS_ASSET_PATH + 'views/df-edit-profile.html',
            link: function (scope, elem, attrs) {

                var messageOptions, requestDataObj, session_token, existingUser;

                scope.loginAttribute = 'email';
                scope.bitnami_demo = false;
                var systemConfig = SystemConfigDataService.getSystemConfig();
                if (systemConfig && systemConfig.authentication && systemConfig.authentication.hasOwnProperty('login_attribute')) {
                    scope.loginAttribute = systemConfig.authentication.login_attribute;
                }
                if (systemConfig && systemConfig.platform && systemConfig.platform.hasOwnProperty('bitnami_demo')) {
                    scope.bitnami_demo = systemConfig.platform.bitnami_demo;
                }

                // Require the user's password if a user wants to change their email.
                scope.requireCurrentPassword = false;
                scope.emailChange = function () {
                    scope.requireCurrentPassword = true;
                }

                scope.updateUser = function () {
                    
                    if (scope.setPassword) {
                        // update password and profile. try to update password first. if it fails then don't update profile.
                        scope.updatePassword();
                    } else {
                        // no password change. just update profile.
                        scope.updateProfile(false);
                    }
                };

                scope.updatePassword = function () {

                    // check for old, new, verify password values

                    if (!scope.password.old_password || !scope.password.new_password || !scope.password.verify_password) {

                        return;
                    }

                    // check that new and verify password values match
                    if (scope.password.new_password !== scope.password.verify_password) {

                        messageOptions = {
                            module: 'Profile',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: 'Passwords do not match.'
                        };

                        dfNotify.error(messageOptions);
                        return;
                    }

                    // password info looks ok, send to server

                    requestDataObj = {

                        params: {
                            reset: false,
                            login: true
                        },
                        data: {
                            old_password: scope.password.old_password,
                            new_password: scope.password.new_password
                        }
                    };

                    scope.updateUserPasswordToServer(requestDataObj).then(

                        function (result) {

                            // update token if password was changed
                            session_token = result.data.session_token;
                            if (session_token) {
                                existingUser = UserDataService.getCurrentUser();
                                existingUser.session_token = session_token;
                                UserDataService.setCurrentUser(existingUser);
                            }

                            // success, now update profile
                            // check if the email address is gonna be changed, if it is, then 
                            // as we have done validation with the password change, we can set it as the current
                            // password (so user doesnt have to enter it twice)
                            if (scope.requireCurrentPassword) {
                                scope.user.current_password = scope.password.new_password;
                            }
                            scope.updateProfile(true);
                        },

                        function (reject) {

                            var messageOptions = {
                                module: 'Profile',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                        }
                    )
                };

                scope.updateProfile = function (passwordUpdated) {

                    requestDataObj = {
                        params: {
                            fields: '*'
                        },
                        data: scope.user,
                        url: INSTANCE_URL.url + '/' + scope.resource + '/profile'
                    };

                    scope.updateUserToServer(requestDataObj).then(

                        function (result) {

                            // update token if email was changed
                            session_token = result.data.session_token;
                            if (session_token) {
                                existingUser = UserDataService.getCurrentUser();
                                existingUser.session_token = session_token;
                                UserDataService.setCurrentUser(existingUser);
                            }

                            // Remove these properties if they have been set
                            // before merging and setting current user obj in
                            // user data service;

                            if (scope.user.hasOwnProperty('security_question')) {
                                delete scope.user.security_question;
                            }

                            if (scope.user.hasOwnProperty('security_answer')) {
                                delete scope.user.security_answer;
                            }

                            UserDataService.setCurrentUser(dfObjectService.mergeObjects(scope.user, UserDataService.getCurrentUser()));

                            // delete admin cache to force reload
                            if (scope.isAdminUser) {
                                dfApplicationData.deleteApiDataFromCache('admin');
                            }

                            // flags stored on utility directives
                            scope.setPassword = false;
                            scope.setQuestion = false;

                            var message = passwordUpdated ? 'Profile and password' : 'Profile';

                            messageOptions = {
                                module: 'Profile',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: message + " updated successfully."
                            };
                            scope.requireCurrentPassword = false;
                            dfNotify.success(messageOptions);
                        },

                        function (reject) {

                            var message = passwordUpdated ? 'Password updated successfully but Profile could not be saved.' : reject;

                            var messageOptions = {
                                module: 'Profile',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: message
                            };
                            
                            dfNotify.error(messageOptions);
                        }
                    ).finally( function () {
                        // we want to clear this box no matter what happens
                        scope.user.current_password = '';
                    })
                };

                scope.updateUserToServer = function (requestDataObj) {

                    return $http({
                        method: 'PUT',
                        url: INSTANCE_URL.url + '/' + scope.resource + '/profile',
                        data: requestDataObj.data
                    })
                };

                scope.updateUserPasswordToServer = function (requestDataObj) {

                    return $http({
                        method: 'POST',
                        url: INSTANCE_URL.url + '/' + scope.resource + '/password',
                        params: requestDataObj.params,
                        data: requestDataObj.data
                    })
                };

                scope.$watch('setPassword', function (newValue) {

                    
                    if (newValue) {
                        // if changing the password, we dont need the user to put their current password in two places
                        // i.e in the email section either
                        scope.user.current_password = '';
                        scope.requireOldPassword = true;

                        scope.password = {
                            old_password: '',
                            new_password: '',
                            verify_password: ''
                        };
                    }
                    else {
                        scope.password = null;
                        scope.identical = true;
                    }
                });
            }
        }
    }]);