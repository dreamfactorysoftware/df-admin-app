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
    .run(['INSTANCE_URL', '$templateCache', function (INSTANCE_URL, $templateCache) {

    }])
    .controller('ProfileCtrl', ['$scope', 'UserDataService', 'dfApplicationData', 'dfNotify', '$http', 'INSTANCE_URL', function ($scope, UserDataService, dfApplicationData, dfNotify, $http, INSTANCE_URL) {

        $scope.user = null;
        $scope.isAdminUser = UserDataService.getCurrentUser().is_sys_admin;
        $scope.resource = $scope.isAdminUser ? 'system/admin' : 'user';

        $http({
            method: 'GET',
            url: INSTANCE_URL + '/api/v2/' + $scope.resource + '/profile'
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
    .directive('dfEditProfile', ['MOD_PROFILE_ASSET_PATH', 'INSTANCE_URL', 'dfNotify', 'dfApplicationData', 'UserDataService', 'dfObjectService', '$http', '$cookies', '$cookieStore', 'SystemConfigDataService', function (MOD_APPS_ASSET_PATH, INSTANCE_URL, dfNotify, dfApplicationData, UserDataService, dfObjectService, $http, $cookies, $cookieStore, SystemConfigDataService) {

        return {

            restrict: 'E',
            scope: false,
            templateUrl: MOD_APPS_ASSET_PATH + 'views/df-edit-profile.html',
            link: function (scope, elem, attrs) {

                var messageOptions, requestDataObj, session_token, existingUser;
                var config = SystemConfigDataService.getSystemConfig();
                scope.loginAttribute = config.authentication.login_attribute;
                scope.bitnami_demo = config.platform.bitnami_demo;

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
                                $http.defaults.headers.common['X-DreamFactory-Session-Token'] = session_token;
                                $cookies.PHPSESSID = session_token;

                                existingUser = UserDataService.getCurrentUser();
                                existingUser.session_token = session_token;
                                existingUser.session_id = session_token;
                                $cookieStore.put('CurrentUserObj', existingUser);
                            }

                            // success, now update profile
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
                        url: INSTANCE_URL + '/api/v2/' + scope.resource + '/profile'
                    };

                    scope.updateUserToServer(requestDataObj).then(

                        function (result) {

                            // update token if email was changed
                            session_token = result.data.session_token;
                            if (session_token) {
                                $http.defaults.headers.common['X-DreamFactory-Session-Token'] = session_token;
                                $cookies.PHPSESSID = session_token;

                                existingUser = UserDataService.getCurrentUser();
                                existingUser.session_token = session_token;
                                existingUser.session_id = session_token;
                                $cookieStore.put('CurrentUserObj', existingUser);
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
                    );
                };

                scope.updateUserToServer = function (requestDataObj) {

                    return $http({
                        method: 'PUT',
                        url: INSTANCE_URL + '/api/v2/' + scope.resource + '/profile',
                        data: requestDataObj.data
                    })
                };

                scope.updateUserPasswordToServer = function (requestDataObj) {

                    return $http({
                        method: 'POST',
                        url: INSTANCE_URL + '/api/v2/' + scope.resource + '/password',
                        params: requestDataObj.params,
                        data: requestDataObj.data
                    })
                };

                scope.$watch('setPassword', function (newValue) {

                    if (newValue) {

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