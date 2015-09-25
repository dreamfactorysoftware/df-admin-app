/**
 * This file is part of DreamFactory (tm)
 *
 * http://github.com/dreamfactorysoftware/dreamfactory
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


angular.module('dfHome', ['ngRoute', 'dfUtility', 'dfApplication', 'dfHelp'])
    .constant('MOD_HOME_ROUTER_PATH', '/home')
    .constant('MOD_HOME_ASSET_PATH', 'admin_components/adf-home/')
    .config(['$routeProvider', 'MOD_HOME_ROUTER_PATH', 'MOD_HOME_ASSET_PATH',
        function ($routeProvider, MOD_HOME_ROUTER_PATH, MOD_HOME_ASSET_PATH) {
            $routeProvider
                .when(MOD_HOME_ROUTER_PATH, {
                    templateUrl: MOD_HOME_ASSET_PATH + 'views/main.html',
                    controller: 'HomeCtrl',
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
    .run(['INSTANCE_URL', '$templateCache', function (INSTANCE_URL, $templateCache) {



    }])

    .controller('HomeCtrl', ['$scope', '$sce', 'dfApplicationData', 'SystemConfigDataService',
        function($scope, $sce, dfApplicationData, SystemConfigDataService){

            $scope.trustUrl = function (url) {
                return $sce.trustAsResourceUrl(url);
            }

            $scope.$parent.title = 'Home';

            // Set module links
            $scope.links = angular.copy(SystemConfigDataService.getSystemConfig().home_links) || [
                {
                    name: 'welcome-home',
                    label: 'Welcome',
                    href: "//www.dreamfactory.com/in_product_v2/welcome.html",
                    attributes: []
                },
                {
                    name: 'quickstart-home',
                    label: 'Quickstart',
                    href: "//www.dreamfactory.com/in_product_v2/quickstart.html",
                    attributes: []
                },
                {
                    name: 'resource-home',
                    label: 'Resources',
                    href: "//www.dreamfactory.com/in_product_v2/resources.html",
                    attributes: []
                },
                {
                    name: 'download-home',
                    label: 'Download',
                    href: "//www.dreamfactory.com/in_product_v2/downloads.html",
                    attributes: []
                }
            ];

            angular.forEach($scope.links, function (link) {
                if (!link.label) {
                    link.label = link.name;
                }
            });
        }])

