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
                        checkUser:['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }])
    .run([function () {

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
    .directive('apiDocs', ['MOD_APIDOCS_ASSET_PATH', 'INSTANCE_URL', function(MOD_APIDOCS_ASSET_PATH, INSTANCE_URL) {

        return {
            restrict: 'E',
            scope: {},
            templateUrl: MOD_APIDOCS_ASSET_PATH + 'views/apidocs.html',
            link: function( scope, elem, attrs ) {

                scope.server = INSTANCE_URL + "/df-api-docs-ui/dist/index.html?admin_app=1";

                scope.$broadcast('apidocs:loaded');
            }
        };
    }]);



