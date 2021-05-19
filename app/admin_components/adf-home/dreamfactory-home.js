/**
 * This file is part of DreamFactory (tm)
 *
 * http://github.com/dreamfactorysoftware/dreamfactory
 * Copyright 2012-2017 DreamFactory Software, Inc. <dspsupport@dreamfactory.com>
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


angular.module('dfHome', ['ngRoute', 'dfUtility', 'dfApplication', 'dfHelp', 'ngCookies'])

    .constant('MOD_HOME_ROUTER_PATH', '/home')
    .constant('MOD_HOME_ASSET_PATH', 'admin_components/adf-home/')
    .config(['$routeProvider', 'MOD_HOME_ROUTER_PATH', 'MOD_HOME_ASSET_PATH',
        function ($routeProvider, MOD_HOME_ROUTER_PATH, MOD_HOME_ASSET_PATH) {
            $routeProvider
                .when(MOD_HOME_ROUTER_PATH, {
                    templateUrl: MOD_HOME_ASSET_PATH + 'views/main.html',
                    controller: 'HomeCtrl',
                    resolve: {
                        checkUser:['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }])

    .run([function () {

    }])

    .controller('HomeCtrl', ['$q', '$scope', '$sce', 'dfApplicationData', 'SystemConfigDataService','$cookies',
        function($q, $scope, $sce, dfApplicationData, SystemConfigDataService, $cookies){

            $scope.trustUrl = function (url) {
                return $sce.trustAsResourceUrl(url);
            };

            $scope.$parent.title = 'Home';
            $scope.$parent.titleIcon = 'home';

            // Set module links

            // defaults

            var links = [
                {
                    name: 'welcome-home',
                    label: 'Welcome',
                    // href: "//www.dreamfactory.com/in_product_v2/welcome.html",
                    template: 'admin_components/adf-home/views/welcome.html',
                    attributes: []
                },
                {
                    name: 'quickstart-home',
                    label: 'Quickstart',
                    // href: "//www.dreamfactory.com/in_product_v2/quickstart.html",
                    template: 'admin_components/adf-home/views/quickstart.html',
                    attributes: []
                },
                {
                    name: 'resource-home',
                    label: 'Resources',
                    // href: "//www.dreamfactory.com/in_product_v2/resources.html",
                    template: 'admin_components/adf-home/views/resources.html',
                    attributes: []
                },
                {
                    name: 'download-home',
                    label: 'Download',
                    // href: "//www.dreamfactory.com/in_product_v2/downloads.html",
                    template: 'admin_components/adf-home/views/download.html',
                    attributes: []
                }
            ];

            // system config will override defaults

            var systemConfig = SystemConfigDataService.getSystemConfig();
            if (systemConfig && systemConfig.hasOwnProperty('home_links')) {
                links = angular.copy(systemConfig.home_links);
            }

            $scope.links = links;

            angular.forEach($scope.links, function (link) {
                if (!link.label) {
                    link.label = link.name;
                }
            });

            // To open the wizard manually, we need to remove the wizard cookie, so ng-if in adf-home will pick up the change
            // and fire it up.
            $scope.removeCookie = function() {
                $cookies.remove("Wizard");
            }
        }])
