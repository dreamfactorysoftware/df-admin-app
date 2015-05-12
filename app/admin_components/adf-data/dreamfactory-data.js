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


angular.module('dfData', ['ngRoute', 'dfUtility', 'dfTable'])
    .constant('MOD_DATA_ROUTER_PATH', '/data')
    .constant('MOD_DATA_ASSET_PATH', 'admin_components/adf-data/')
    .config(['$routeProvider', 'MOD_DATA_ROUTER_PATH', 'MOD_DATA_ASSET_PATH',
        function ($routeProvider, MOD_DATA_ROUTER_PATH, MOD_DATA_ASSET_PATH) {
            $routeProvider
                .when(MOD_DATA_ROUTER_PATH, {
                    templateUrl: MOD_DATA_ASSET_PATH + 'views/main.html',
                    controller: 'DataCtrl',
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
    .controller('DataCtrl', ['$scope', 'DSP_URL', 'dfApplicationData', function($scope, DSP_URL, dfApplicationData) {

        $scope.$parent.title = 'Data';

        // Set module links
        $scope.links = [

            {
                name: 'manage-data',
                label: 'Manage',
                path: 'manage-data'
            }
        ];


        $scope.__services__ = dfApplicationData.getApiData('service', {type: "Local SQL DB,Remote SQL DB"});
        // $scope.__services__.push({api_name:'system', name: 'System'});

        $scope.selected = {
            service: null,
            resource: null
        };

        $scope.options = {
            service: $scope.selected.service,
            table: $scope.selected.resource,
            url: DSP_URL + '/api/v2/' + $scope.selected.service + '/' + $scope.selected.resource,
            allowChildTable: true,
            childTableAttachPoint: '#child-table-attach'
        };

        $scope.$watchCollection('selected', function (newValue, oldValue) {

            var options = {
                service: newValue.service,
                table: newValue.resource,
                url: DSP_URL + '/api/v2/' + newValue.service + '/' + newValue.resource,
                allowChildTable: true,
                childTableAttachPoint: '#child-table-attach'
            };

            $scope.options = options;
        });
    }]);



