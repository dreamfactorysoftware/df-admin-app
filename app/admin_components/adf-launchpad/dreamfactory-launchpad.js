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

                        loadApps: ['SystemConfigDataService', 'UserDataService', '$location', '$q', function (SystemConfigDataService, UserDataService, $location, $q) {

                            var defer = $q.defer(),
                                systemConfig = SystemConfigDataService.getSystemConfig();

                            var queryString = location.search.substring(1);

                            if (queryString) {
                                //OAuth attempt, go to login page.
                                $location.url('/login');
                                defer.reject();
                            } else if ((!systemConfig || !systemConfig.apps || systemConfig.apps.length === 0) && !UserDataService.getCurrentUser()){
                                $location.url('/login');
                                defer.reject();
                            } else {
                                defer.resolve(systemConfig);
                            }

                            return defer.promise;
                        }]
                    }
                });
        }])

    .run([function () {

    }])

    .controller('LaunchpadCtrl', ['$scope', 'UserDataService', 'SystemConfigDataService', 'loadApps', function ($scope, UserDataService, SystemConfigDataService, loadApps) {

        $scope.apps = [];
        $scope.error = false;

        $scope.$watch(function () {

            return loadApps;
        }, function (newValue, oldValue) {

            var apps = [];
            var error = true;
            if (newValue && newValue.hasOwnProperty('apps')) {

                error = false;

                angular.forEach(newValue.apps, function (app) {
                    if (app.url) {
                        apps.push(app);
                    }
                });
            }
            $scope.apps = apps;
            $scope.error = error;
        }, true);
    }])

    .directive('dfApp', ['MOD_LAUNCHPAD_ASSET_PATH', '$window', function (MOD_LAUNCHPAD_ASSET_PATH, $window) {

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

                    $window.open(app.url);
                };
            }
        };
    }]);