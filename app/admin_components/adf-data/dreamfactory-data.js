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
                        checkUser:['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }])

    .run([function () {

    }])

    .controller('DataCtrl', ['$scope', 'INSTANCE_URL', 'dfApplicationData', 'dfNotify', '$location', function($scope, INSTANCE_URL, dfApplicationData, dfNotify, $location) {

        $scope.$parent.title = 'Data';
        $scope.$parent.titleIcon = 'database';

        // Set module links
        $scope.links = [

            {
                name: 'manage-data',
                label: 'Manage',
                path: 'manage-data'
            }
        ];

        $scope.services = null;

        $scope.selected = {
            service: null,
            resource: null
        };

        $scope.options = {
            service: $scope.selected.service,
            table: $scope.selected.resource,
            url: INSTANCE_URL.url + '/' + $scope.selected.service + '/_table/' + $scope.selected.resource,
            allowChildTable: true,
            childTableAttachPoint: '#child-table-attach'
        };

        $scope.$watchCollection('selected', function (newValue, oldValue) {

            var options = {
                service: newValue.service,
                table: newValue.resource,
                url: INSTANCE_URL.url + '/' + newValue.service + '/_table/' + newValue.resource,
                allowChildTable: true,
                childTableAttachPoint: '#child-table-attach'
            };

            $scope.options = options;
        });

        $scope.$watchCollection('apiData.service_list', function (newValue, oldValue) {

            if (newValue) {

                $scope.services = newValue.filter(function (obj) {
                    return ['mysql', 'pgsql', 'sqlite', 'sqlsrv', 'memsql', 'sqlanywhere', 'oracle', 'ibmdb2', 'informix', 'firebird', 'aws_redshift_db'].indexOf(obj.type) >= 0;
                });
            }
        });

        // load data

        $scope.apiData = null;

        $scope.loadTabData = function() {

            var apis = ['service_list'];

            dfApplicationData.getApiData(apis).then(
                function (response) {
                    var newApiData = {};
                    apis.forEach(function(value, index) {
                        newApiData[value] = response[index].resource ? response[index].resource : response[index];
                    });
                    $scope.apiData = newApiData;
                },
                function (error) {
                    var messageOptions = {
                        module: 'Data',
                        provider: 'dreamfactory',
                        type: 'error',
                        message: 'There was an error loading the Data tab. Please try refreshing your browser and logging in again.'
                    };
                    dfNotify.error(messageOptions);
                }
            );
        };

        $scope.loadTabData();
    }]);