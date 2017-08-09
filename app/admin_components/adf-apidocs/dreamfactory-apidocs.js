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


angular.module('dfApiDocs', ['ngRoute', 'dfUtility'])
    .constant('MOD_APIDOCS_ROUTER_PATH', '/apidocs')
    .constant('MOD_APIDOCS_ASSET_PATH', 'admin_components/adf-apidocs/')
    .config(['$routeProvider', 'MOD_APIDOCS_ROUTER_PATH', 'MOD_APIDOCS_ASSET_PATH',
        function ($routeProvider, MOD_APIDOCS_ROUTER_PATH, MOD_APIDOCS_ASSET_PATH) {
            $routeProvider
                .when(MOD_APIDOCS_ROUTER_PATH, {
                    templateUrl: MOD_APIDOCS_ASSET_PATH + 'views/main.html',
                    controller: 'ApiDocsCtrl',
                    resolve: {
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
                                };
                            }

                            // There is a currentUser but they are not an admin
                            else if (currentUser && !currentUser.is_sys_admin) {

                                $location.url('/launchpad');

                                // This will stop the route from loading anything
                                // it's caught by the global error handler in
                                // app.js
                                throw {
                                    routing: true
                                };
                            }

                            defer.resolve();
                            return defer.promise;
                        }]
                    }
                });
        }])
    .run(['INSTANCE_URL', '$templateCache', function (INSTANCE_URL, $templateCache) {


    }])
    .controller('ApiDocsCtrl', ['$scope', function($scope) {

        $scope.$parent.title = 'API Docs';

        // Set module links
        $scope.links = [
            {
                name: 'apidocs',
                label: 'View',
                path: 'apidocs'
            }
        ];
    }])
    .directive('apiDocs', ['MOD_APIDOCS_ASSET_PATH', '$location', function(MOD_APIDOCS_ASSET_PATH, $location) {

        return {
            restrict: 'E',
            scope: {},
            templateUrl: MOD_APIDOCS_ASSET_PATH + 'views/apidocs.html',
            link: function( scope, elem, attrs ) {

                var port;

                scope.server = $location.protocol() + '://' + $location.host();

                port = $location.port();
                if (port) {
                    scope.server += ':' + port;
                }

                scope.server += "/df-api-docs-ui/dist/index.html?admin_app=1";

                scope.$broadcast('apidocs:loaded');
            }
        };
    }])



