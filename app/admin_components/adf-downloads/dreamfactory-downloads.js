/**
 * This file is part of the DreamFactory Services Platform(tm) (DSP)
 *
 * DreamFactory Services Platform(tm) <http://github.com/dreamfactorysoftware/dsp-core>
 * Copyright 2012-2014 DreamFactory Software, Inc. <support@dreamfactory.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';


angular.module('dfDownloads', ['ngRoute', 'dfUtility', 'dfApplication', 'dfHelp'])
    .constant('MOD_DOWNLOADS_ROUTER_PATH', '/downloads')
    .constant('MOD_DOWNLOADS_ASSET_PATH', 'admin_components/adf-downloads/')
    .config(['$routeProvider', 'MOD_DOWNLOADS_ROUTER_PATH', 'MOD_DOWNLOADS_ASSET_PATH',
        function ($routeProvider, MOD_DOWNLOADS_ROUTER_PATH, MOD_DOWNLOADS_ASSET_PATH) {
            $routeProvider
                .when(MOD_DOWNLOADS_ROUTER_PATH, {
                    templateUrl: MOD_DOWNLOADS_ASSET_PATH + 'views/main.html',
                    controller: 'DownloadsCtrl',
                    resolve: {
                        checkAppObj:['dfApplicationData', function (dfApplicationData) {
                            if (dfApplicationData.initInProgress) {

                                return dfApplicationData.initDeferred.promise;
                            }
                        }],
                        checkCurrentUser: ['UserDataService', '$location', '$q', function (UserDataService, $location, $q) {

                            var currentUser = UserDataService.getCurrentUser(),
                                defer = $q.defer();

                            // If there is no currentUser and we don't allow guest users
                            if (!currentUser) {

                                $location.url('/login');

                                // This will stop the route from loading anything
                                // it's caught by the global error handler in
                                // app.js
                                throw {
                                    routing: true
                                }
                            }

                            // There is a currentUser but they are not an admin
                            else if (currentUser && !currentUser.is_sys_admin) {

                                $location.url('/launchpad');

                                // This will stop the route from loading anything
                                // it's caught by the global error handler in
                                // app.js
                                throw {
                                    routing: true
                                }
                            }

                            defer.resolve();
                            return defer.promise;
                        }]
                    }
                });
        }])
    .run(['DSP_URL', '$templateCache', function (DSP_URL, $templateCache) {


    }])

    .controller('DownloadsCtrl', ['$scope',
        function($scope){
            $scope.$parent.title = 'Download';
        }])

    .directive('dfDownloads', ['$sce', 'MOD_DOWNLOADS_ASSET_PATH', '$http', 'dfApplicationData', function ($sce, MOD_DOWNLOADS_ASSET_PATH, $http, dfApplicationData) {
        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_DOWNLOADS_ASSET_PATH + 'views/df-downloads.html',
            link: function (scope, elem, attrs) {
                var url = "//www.dreamfactory.com/in_product_downloads.html";

                angular.forEach(dfApplicationData.getApiData('app'), function (app) {
                    if (app.hasOwnProperty('api_name') && (app.hasOwnProperty('launch_url'))) {
                        if (app.api_name == 'df-downloads') {
                            url = app.launch_url;
                        }
                    }
                });

                scope.iframe_url = $sce.trustAsHtml('<iframe src="' + url + '" style="padding-bottom: 75px; height: 100%; width: 100%; border: 0px"></iframe>');
            }
        }
    }])