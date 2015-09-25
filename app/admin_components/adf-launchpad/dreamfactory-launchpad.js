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

                        loadApps: ['SystemConfigDataService', 'UserDataService', '$location', '$q', '$http', 'INSTANCE_URL', function (SystemConfigDataService, UserDataService, $location, $q, $http, INSTANCE_URL) {


                            var defer = $q.defer(),
                                systemConfig = SystemConfigDataService.getSystemConfig(),
                                groupedApp = systemConfig.app_group,
                                noGroupApp = systemConfig.no_group_app;

                            var queryString = location.search.substring(1);

                            if(queryString){
                                //OAuth attempt, go to login page.
                                $location.url('/login');
                                return;
                            } else if(((!groupedApp || groupedApp.length == 0) && (!noGroupApp || noGroupApp.length == 0)) && !UserDataService.getCurrentUser()){
                                $location.url('/login');
                                return;
                            } else if(!UserDataService.getCurrentUser()){
                                defer.resolve(systemConfig);
                            } else if (UserDataService.getCurrentUser()) {

                                // We make a call to user session to get user apps
                                $http.get(INSTANCE_URL + '/api/v2/system/environment').then(
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

                                //return defer.promise;
                            }

                            return defer.promise;
                        }]
                    }
                });
        }])
    .run(['INSTANCE_URL', '$templateCache', function (INSTANCE_URL, $templateCache) {


    }])
    .controller('LaunchpadCtrl', ['$scope', 'UserDataService', 'SystemConfigDataService', 'loadApps', function ($scope, UserDataService, SystemConfigDataService, loadApps) {


        $scope.apps = [];
        $scope.noAppsMsg = false;
        $scope.onlyNoGroupApps = false;
        $scope.noGroupTitle = 'Other Apps';


        $scope.$watch(function () {
            return loadApps
        }, function (newValue, oldValue) {

            if (!newValue) return;

            $scope.apps = [];


            if (newValue.hasOwnProperty('app_group')) {

                angular.forEach(newValue.app_group, function (appGroup) {

                    if (appGroup.app.length) {

                        angular.forEach(appGroup.app, function (app, index) {
                            if (!app.url) {
                                appGroup.app.splice(index, 1);
                            }

                        });
                        $scope.apps.push(appGroup)
                    }
                })
            }

            if (newValue.hasOwnProperty('no_group_app') && newValue.no_group_app.length > 0) {

                $scope.onlyNoGroupApps = $scope.apps.length === 0;

                var temp = [];

                angular.forEach(newValue.no_group_app, function (app, index) {
                    if (app.url) {
                        temp.push(app);
                    }
                });


                if ($scope.onlyNoGroupApps) {
                    $scope.apps = temp
                }
                else if (temp.length > 0) {
                    $scope.apps.push({name: $scope.noGroupTitle, id: '000', app: temp});
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
            link: function (scope, elem, attrs) {

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
            link: function (scope, elem, attrs) {


                scope.launchApp = function (app) {

                    scope._launchApp(app);
                };

                scope._launchApp = function (app) {

                    $window.open(dfReplaceParams(app.url, app.name));
                };
            }
        }
    }]);


