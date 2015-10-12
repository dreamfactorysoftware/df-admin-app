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
                        checkAppObj: ['dfApplicationData', function (dfApplicationData) {

                            if (dfApplicationData.initInProgress) {

                                return dfApplicationData.initDeferred.promise;
                            }
                        }],

                        checkProfileRoute: ['dfApplicationData', 'SystemConfigDataService', '$location', 'dfNotify', function (dfApplicationData, SystemConfigDataService, $location, dfNotify) {

                            var currentUser = dfApplicationData.getCurrentUser(),
                                sysConfig = SystemConfigDataService.getSystemConfig(),
                                messageOptions = {};

                            /*if (currentUser && currentUser.is_sys_admin && currentUser.session_id) {
                             $location.url('/users');

                             messageOptions = {
                             module: 'DreamFactory Profile Module',
                             type: 'warn',
                             provider: 'dreamfactory',
                             message: 'Profile not available as Admin.  Please edit the current user through the Users page.'
                             }

                             dfNotify.warn(messageOptions);
                             return;
                             }*/

                            if (!currentUser && sysConfig.allow_guest_user) {

                                messageOptions = {
                                    module: 'DreamFactory Profile Module',
                                    type: 'warn',
                                    provider: 'dreamfactory',
                                    message: 'Profile not available for guest users.'
                                };

                                dfNotify.warn(messageOptions);

                                $location.url('/launchpad');
                                return;
                            }


                            if (!currentUser && !sysConfig.allow_guest_user) {

                                $location.url('/login');
                            }
                        }]

                    }
                });
        }])
    .run(['INSTANCE_URL', '$templateCache', function (INSTANCE_URL, $templateCache) {


    }])
    .controller('ProfileCtrl', ['$scope', 'UserDataService', function ($scope, UserDataService) {

        $scope.currentUser = UserDataService.getCurrentUser();

        // Set Title in parent
        // $scope.$parent.title = $scope.currentUser.name + ' Profile';
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
    .directive('dfEditProfile', ['MOD_PROFILE_ASSET_PATH', 'INSTANCE_URL', 'dfNotify', 'dfApplicationData', 'UserDataService', 'dfObjectService', '$http', function (MOD_APPS_ASSET_PATH, INSTANCE_URL, dfNotify, dfApplicationData, UserDataService, dfObjectService, $http) {

        return {

            restrict: 'E',
            scope: {},
            templateUrl: MOD_APPS_ASSET_PATH + 'views/df-edit-profile.html',
            link: function (scope, elem, attrs) {


                var User = function (userData) {

                    return {
                        __dfUI: {},
                        record: angular.copy(userData),
                        recordCopy: angular.copy(userData)
                    }
                }

                var Password = function () {

                    return {
                        reset: true,
                        login: false,
                        old_password: null,
                        new_password: null
                    }
                };


                scope.user = null;
                scope.password = null;

                scope.apps = dfApplicationData.getApiData('app');


                // PUBLIC API
                scope.updateUser = function () {

                    scope._updateUser();
                };


                // PRIVATE API
                scope._getUserProfileFromServer = function () {

                    return $http({
                        method: 'GET',
                        url: INSTANCE_URL + '/api/v2/user/profile'
                    })
                };

                scope._updateUserToServer = function (requestDataObj) {

                    return $http({
                        method: 'POST',
                        url: INSTANCE_URL + '/api/v2/user/profile',
                        data: requestDataObj.data
                    })
                };

                scope._updateUsers = function (update) {

                    return dfApplicationData.updateApiData('admin', update).$promise;
                };

                scope._updateUserPasswordToServer = function (requestDataObj) {

                    return $http({
                        method: 'POST',
                        url: INSTANCE_URL + '/api/v2/user/password',
                        params: requestDataObj.params,
                        data: requestDataObj.data
                    })
                };

                scope._updateAdminPasswordToServer = function (requestDataObj) {

                    return $http({
                        method: 'POST',
                        url: INSTANCE_URL + '/api/v2/system/admin/password',
                        params: requestDataObj.params,
                        data: requestDataObj.data
                    })
                };


                // COMPLEX IMPLEMENTATION
                scope._updateUser = function () {

                    // If the user is an admin we have to update dfApplicationObj
                    if (UserDataService.getCurrentUser().is_sys_admin) {

                        // If the user is an admin we have to update dfApplicationObj
                        var admindata = scope.user.record;
                        admindata.id = UserDataService.getCurrentUser().id;

                        var update = {
                            params: {
                                fields: '*'
                            },
                            data: admindata
                        };

                        scope._updateUsers(update).then(
                            function (result) {

                                var messageOptions = {
                                    module: 'Profile',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: "Profile updated successfully."
                                };

                                // Flag stored on df-set-security-question directive
                                scope.setQuestion = false;

                                dfNotify.success(messageOptions);

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
                        );

                        // Remove these properties if they have been set
                        // before merging and setting current user obj in
                        // user data service;

                        if (scope.user.record.hasOwnProperty('security_question')) {
                            delete scope.user.record.security_question;
                        }

                        if (scope.user.record.hasOwnProperty('security_answer')) {
                            delete scope.user.record.security_answer;
                        }

                        UserDataService.setCurrentUser(dfObjectService.mergeObjects(scope.user.record, UserDataService.getCurrentUser()));


                        if (scope.setPassword) {


                            var requestDataObj2 = {

                                params: {
                                    reset: scope.password.reset,
                                    login: scope.password.login

                                },
                                data: {
                                    old_password: scope.password.old_password,
                                    new_password: scope.password.new_password
                                }

                            }

                            scope._updateAdminPasswordToServer(requestDataObj2).then(
                                function (result) {

                                    var messageOptions = {
                                        module: 'Profile',
                                        type: 'success',
                                        provider: 'dreamfactory',
                                        message: "Password updated successfully."
                                    };

                                    dfNotify.success(messageOptions);

                                    scope.setPassword = false;

                                },

                                function (reject) {

                                    var messageOptions = {
                                        module: 'Api Error',
                                        type: 'error',
                                        provider: 'dreamfactory',
                                        message: reject
                                    };

                                    dfNotify.error(messageOptions);

                                }
                            )
                        }
                    } else {

                        var requestDataObj1 = {
                            data: scope.user.record
                        };

                        scope._updateUserToServer(requestDataObj1).then(
                            function (result) {

                                var messageOptions = {
                                    module: 'Profile',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: "Profile updated successfully."
                                };

                                // Flag stored on df-set-security-question directive
                                scope.setQuestion = false;

                                dfNotify.success(messageOptions);

                                // Remove these properties if they have been set
                                // before merging and setting current user obj in
                                // user data service;

                                if (scope.user.record.hasOwnProperty('security_question')) {
                                    delete scope.user.record.security_question;
                                }

                                if (scope.user.record.hasOwnProperty('security_answer')) {
                                    delete scope.user.record.security_answer;
                                }

                                UserDataService.setCurrentUser(dfObjectService.mergeObjects(scope.user.record, UserDataService.getCurrentUser()));

                            },
                            function (reject) {

                                var messageOptions = {
                                    module: 'Api Error',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    message: reject
                                }

                                dfNotify.error(messageOptions);
                            }
                        );

                        if (scope.setPassword) {


                            var requestDataObj2 = {

                                params: {
                                    reset: scope.password.reset,
                                    login: scope.password.login

                                },
                                data: {
                                    old_password: scope.password.old_password,
                                    new_password: scope.password.new_password
                                }

                            }

                            scope._updateUserPasswordToServer(requestDataObj2).then(
                                function (result) {

                                    var messageOptions = {
                                        module: 'Profile',
                                        type: 'success',
                                        provider: 'dreamfactory',
                                        message: "Password updated successfully."
                                    };

                                    dfNotify.success(messageOptions);

                                    scope.setPassword = false;

                                },

                                function (reject) {

                                    var messageOptions = {
                                        module: 'Api Error',
                                        type: 'error',
                                        provider: 'dreamfactory',
                                        message: reject
                                    };

                                    dfNotify.error(messageOptions);

                                }
                            )
                        }
                    }
                };


                var watchCurrentUser = scope.$watch('user', function (newValue, oldValue) {

                    if (newValue === null) {

                        scope._getUserProfileFromServer().then(
                            function (result) {

                                scope.user = new User(result.data);

                            },
                            function (reject) {

                                var messageOptions = {
                                    module: 'Api Error',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    message: reject
                                };

                                dfNotify.error(messageOptions);

                                scope.user = 'error';
                            }
                        )
                    }
                });

                var watchSetPassword = scope.$watch('setPassword', function (n, o) {

                    if (n) {

                        // Flag stored on df-set-user-password directive
                        scope.updatePassword = true;

                        scope.password = new Password();
                    }
                    else {
                        scope.password = null;
                    }
                });


                scope.$on('$destroy', function (e) {

                    watchCurrentUser();
                    watchSetPassword();
                })

            }
        }
    }]);