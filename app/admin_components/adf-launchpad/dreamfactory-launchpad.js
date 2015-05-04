'use strict';


angular.module('dfLaunchPad', ['ngRoute', 'dfUtility', 'dfTable'])
    .constant('MOD_LAUNCHPAD_ROUTER_PATH', '/launchpad')
    .constant('MOD_LAUNCHPAD_ASSET_PATH', 'admin_components/adf-launchpad/')
    .config(['$routeProvider', 'MOD_LAUNCHPAD_ROUTER_PATH', 'MOD_LAUNCHPAD_ASSET_PATH',
        function ($routeProvider, MOD_LAUNCHPAD_ROUTER_PATH, MOD_LAUNCHPAD_ASSET_PATH) {
            $routeProvider
                .when(MOD_LAUNCHPAD_ROUTER_PATH, {
                    templateUrl: MOD_LAUNCHPAD_ASSET_PATH + 'views/main.html',
                    controller: 'LaunchpadCtrl',
                    resolve: {

                        loadApps: ['SystemConfigDataService', 'UserDataService', '$location', '$q', '$http', 'DSP_URL', function(SystemConfigDataService, UserDataService, $location, $q, $http, DSP_URL) {


                            var defer = $q.defer();

                            // Do we allow guest users and if there is no current user.
                            if (SystemConfigDataService.getSystemConfig().allow_guest_user && !UserDataService.getCurrentUser()) {

                                // We make a call to user session to get guest user apps
                                $http.get(DSP_URL + '/rest/user/session').then(
                                    function (result) {

                                        // we set the current user to the guest user
                                        defer.resolve(result.data);


                                    },
                                    function (reject) {

                                        var messageOptions = {
                                            module: 'DreamFactory Application',
                                            type: 'error',
                                            provider: 'dreamfactory',
                                            message: reject

                                        };

                                        // dfNotify.error(messageOptions);

                                        defer.reject(reject);
                                    }
                                )

                                return defer.promise;
                            }


                            // We don't allow guset users and there is no currentUser
                            if (!SystemConfigDataService.getSystemConfig().allow_guest_user && !UserDataService.getCurrentUser()) {

                                $location.url('/login');
                                return;
                            }


                            // We have a current user
                            if (UserDataService.getCurrentUser()) {

                                // We make a call to user session to get user apps
                                $http.get(DSP_URL + '/rest/user/session').then(
                                    function (result) {

                                        // we set the current user
                                        defer.resolve(result.data);

                                    },
                                    function (reject) {

                                        var messageOptions = {
                                            module: 'DreamFactory Application',
                                            type: 'error',
                                            provider: 'dreamfactory',
                                            message: reject

                                        };

                                        // dfNotify.error(messageOptions);
                                        defer.reject(reject);
                                    }
                                );

                                return defer.promise;
                            }
                        }]
                    }
                });
        }])
    .run(['DSP_URL', '$templateCache', function (DSP_URL, $templateCache) {


    }])
    .controller('LaunchpadCtrl', ['$scope', 'UserDataService', 'SystemConfigDataService', 'loadApps', function($scope, UserDataService, SystemConfigDataService, loadApps) {



        $scope.apps = [];
        $scope.noAppsMsg = false;
        $scope.onlyNoGroupApps = false;
        $scope.noGroupTitle = 'Other Apps';


        $scope.$watch(function() {return loadApps}, function (newValue, oldValue) {


            if (!newValue) return;

            $scope.apps = [];


            if (newValue.hasOwnProperty('app_groups')) {

                angular.forEach(newValue.app_groups, function (appGroup) {

                    if (appGroup.apps.length) {

                        angular.forEach(appGroup.apps, function (app, index) {
                            if (!app.launch_url) {
                                appGroup.apps.splice(index, 1);
                            }

                        });

                        $scope.apps.push(appGroup)
                    }
                })
            }

            if (newValue.hasOwnProperty('no_group_apps') && newValue.no_group_apps.length > 0) {

                $scope.onlyNoGroupApps = $scope.apps.length === 0;

                var temp = [];

                angular.forEach(newValue.no_group_apps, function (app, index) {
                    if (app.launch_url) {
                        temp.push(app);
                    }
                });


                if ($scope.onlyNoGroupApps) {
                    $scope.apps = temp
                }
                else if (temp.length > 0) {
                    $scope.apps.push({name: $scope.noGroupTitle, id:'000', apps: temp});
                }
            }

            $scope.noAppsMsg = $scope.apps.length === 0

        }, true)
    }])

    .directive('dfAppGroup', ['MOD_LAUNCHPAD_ASSET_PATH', function (MOD_LAUNCHPAD_ASSET_PATH) {


        return {
            restrict: 'E',
            scope: {
                appGroup: '='
            },
            replace: true,
            templateUrl: MOD_LAUNCHPAD_ASSET_PATH + 'views/df-app-group.html',
            link: function(scope, elem, attrs) {

            }
        }
    }])

    .directive('dfApp', ['MOD_LAUNCHPAD_ASSET_PATH', '$window', 'dfReplaceParams', function (MOD_LAUNCHPAD_ASSET_PATH, $window, dfReplaceParams) {

        return {
            restrict: 'E',
            scope: {
                app: '='
            },
            replace: true,
            templateUrl: MOD_LAUNCHPAD_ASSET_PATH + 'views/df-app.html',
            link: function(scope, elem, attrs) {


                scope.launchApp = function (app) {

                    scope._launchApp(app);
                };

                scope._launchApp = function (app) {

                    $window.open(dfReplaceParams(app.launch_url, app.name));
                };
            }
        }
    }]);


