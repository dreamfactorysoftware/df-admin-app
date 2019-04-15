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


angular.module('dfReports', ['ngRoute', 'dfUtility', 'dfApplication', 'dfHelp'])
    .constant('MOD_REPORT_ROUTER_PATH', '/reports')
    .constant('MOD_REPORT_ASSET_PATH', 'admin_components/adf-reports/')
    .config(['$routeProvider', 'MOD_REPORT_ROUTER_PATH', 'MOD_REPORT_ASSET_PATH',
        function ($routeProvider, MOD_REPORT_ROUTER_PATH, MOD_REPORT_ASSET_PATH) {
            $routeProvider
                .when(MOD_REPORT_ROUTER_PATH, {
                    templateUrl: MOD_REPORT_ASSET_PATH + 'views/main.html',
                    controller: 'ReportsCtrl',
                    resolve: {
                        checkRootAdmin:['checkRootAdminService', function (checkRootAdminService) {
                            return checkRootAdminService.checkRootAdmin();
                        }],
                        checkAdmin:['checkAdminService', function (checkAdminService) {
                            return checkAdminService.checkAdmin();
                        }],
                        checkUser:['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }])

    .run([function () {

    }])

    .controller('ReportsCtrl', ['$rootScope', '$scope', 'dfApplicationData', 'dfNotify', '$location',
        function($rootScope, $scope, dfApplicationData, dfNotify, $location) {

            $scope.$parent.title = 'Reports';

            // Set module links
            $scope.links = [
                {
                    name: 'manage-service-reports',
                    label: 'Manage service reports',
                    path: 'manage-service-reports'
                },
            ];

            // Set empty search result message
            $scope.emptySearchResult = {
                title: 'You have no Reports that match your search criteria!',
                text: ''
            };

            // load data

            $scope.apiData = null;

            $scope.loadTabData = function () {

                $scope.dataLoading = true;

                var apis = ['service_report'];

                dfApplicationData.getApiData(apis).then(
                    function (response) {
                        var newApiData = {};
                        apis.forEach(function (value, index) {
                            newApiData[value] = response[index].resource ? response[index].resource : response[index];
                        });
                        $scope.apiData = newApiData;
                    },
                    function (error) {
                        var msg = 'To use the Reports tab you must be Root Admin.';

                        if (error && error.error && (error.error.code === 401 || error.error.code === 403)) {
                            $location.url('/home');
                        }

                        var messageOptions = {
                            module: 'Reports',
                            provider: 'dreamfactory',
                            type: 'error',
                            message: msg
                        };
                        dfNotify.error(messageOptions);
                    }
                ).finally(
                    function () {
                        $scope.dataLoading = false;
                    }
                );
            };

            $scope.loadTabData();
        }])

    .directive('dfManageServiceReports', ['$rootScope', 'MOD_REPORT_ASSET_PATH', 'dfApplicationData', 'dfNotify', '$location', function ($rootScope, MOD_REPORT_ASSET_PATH, dfApplicationData, dfNotify, $location) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_REPORT_ASSET_PATH + 'views/df-manage-service-reports.html',
            link: function (scope, elem, attrs) {

                var ManagedServiceReport = function (serviceReportData) {
                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: serviceReportData
                    };
                };

                scope.serviceReports = null;

                scope.fields = [
                    {
                        name: 'id',
                        label: 'ID',
                        active: true
                    },
                    {
                        name: 'time',
                        label: 'Time',
                        active: true
                    },
                    {
                        name: 'service_id',
                        label: 'Service Id',
                        active: true
                    },
                    {
                        name: 'service_name',
                        label: 'Service Name',
                        active: true
                    },
                    {
                        name: 'user_email',
                        label: 'User Email',
                        active: true
                    },
                    {
                        name: 'action',
                        label: 'Action',
                        active: true
                    },
                    {
                        name: 'request_method',
                        label: 'Request',
                        active: true
                    },
                ];

                scope.order = {
                    orderBy: 'id',
                    orderByReverse: false
                };

                scope.selectedReports = [];

                // PUBLIC API

                /*scope.deleteServiceReport = function (serviceReport) {

                    if (dfNotify.confirm("Delete " + serviceReport.record.id + "?")) {
                        scope._deleteServiceReport(serviceReport);
                    }
                };

                scope.deleteSelectedServiceReports = function () {

                    if (dfNotify.confirm("Delete selected service reports?")) {
                        scope._deleteSelectedReports();
                    }
                };
*/
                scope.orderOnSelect = function (fieldObj) {

                    scope._orderOnSelect(fieldObj);
                };


                /*scope.setSelected = function (serviceReport) {

                    scope._setSelected(serviceReport);
                };*/

                // COMPLEX IMPLEMENTATION

                /*scope._deleteServiceReport = function(serviceReport) {

                    var requestDataObj = {
                        params: {
                            id: serviceReport.record.id
                        }
                    };

                    dfApplicationData.deleteApiData('service_report', requestDataObj).$promise.then(

                        function(result) {

                            // notify success
                            var messageOptions = {
                                module: 'Reports',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Reports successfully deleted.'
                            };

                            dfNotify.success(messageOptions);

                            // Was this service previously selected before
                            // we decided to remove them individually
                            if (serviceReport.__dfUI.selected) {

                                // This will remove the report from the selected
                                // report array
                                scope.setSelected(serviceReport);
                            }

                            scope.$broadcast('toolbar:paginate:service_report:delete');
                        },

                        function(reject) {

                            var messageOptions = {
                                module: 'Api Error',
                                provider: 'dreamfactory',
                                type: 'error',
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function() {

                        }
                    );
                };*/

                scope._orderOnSelect = function (fieldObj) {

                    var orderedBy = scope.order.orderBy;

                    if (orderedBy === fieldObj.name) {
                        scope.order.orderByReverse = !scope.order.orderByReverse;
                    } else {
                        scope.order.orderBy = fieldObj.name;
                        scope.order.orderByReverse = false;
                    }
                };


                /*scope._setSelected = function (report) {

                    var i = 0;

                    while (i < scope.selectedReports.length) {

                        if (report.record.id === scope.selectedReports[i]) {

                            report.__dfUI.selected = false;
                            scope.selectedReports.splice(i, 1);
                            return;
                        }

                        i++;
                    }

                    report.__dfUI.selected = true;
                    scope.selectedReports.push(report.record.id);
                };*/

                /*scope._deleteSelectedReports = function () {

                    var requestDataObj = {
                        params: {
                            ids: scope.selectedReports.join(','),
                            rollback: true
                        }
                    };

                    dfApplicationData.deleteApiData('service_report', requestDataObj).$promise.then(

                        function(result) {

                            var messageOptions = {
                                module: 'Reports',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Reports deleted successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.selectedReports = [];

                            scope.$broadcast('toolbar:paginate:service_report:reset');
                        },

                        function(reject) {

                            var messageOptions = {
                                module: 'Api Error',
                                provider: 'dreamfactory',
                                type: 'error',
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function () {

                        }
                    );
                };*/


                // WATCHERS

                // this fires when the API data changes
                var watchApiData = scope.$watchCollection(function() {

                    return dfApplicationData.getApiDataFromCache('service_report');

                }, function (newValue, oldValue) {

                    var _serviceReports = [];

                    if (newValue) {
                        angular.forEach(newValue, function (serviceReport) {
                            _serviceReports.push(new ManagedServiceReport(serviceReport));
                        });
                    }

                    scope.serviceReports = _serviceReports;
                });

                // MESSAGES

                scope.$on('$destroy', function (e) {

                    // Destroy watchers
                    watchApiData();
                    // when filter is changed the controller is reloaded and we get destroy event
                    // the reset event tells pagination engine to update based on filter
                    scope.$broadcast('toolbar:paginate:service_report:reset');
                });
            }
        };
    }])

    .directive('dfReportsLoading', [function() {
      return {
        restrict: 'E',
        template: "<div class='col-lg-12' ng-if='dataLoading'><span style='display: block; width: 100%; text-align: center; color: #A0A0A0; font-size: 50px; margin-top: 100px'><i class='fa fa-refresh fa-spin'></i></div>"
      };
    }]);

    /*.directive('dfExportServiceReports', ['MOD_REPORT_ASSET_PATH', 'INSTANCE_URL', 'UserDataService', '$http', '$window', 'APP_API_KEY', function (MOD_REPORT_ASSET_PATH, INSTANCE_URL, UserDataService, $http, $window, APP_API_KEY) {

        return {

            restrict: 'A',
            scope: false,
            replace: true,
            link: function (scope, elem, attrs) {

                scope.fileFormatStr = null;

                scope.exportServiceReports = function(fileFormatStr) {
                    scope._exportServiceReports(fileFormatStr);
                };

                scope._getFile = function (urlStr) {

                    return $http({
                        method: 'GET',
                        url: urlStr
                    });
                };

                scope._exportServiceReports = function (fileFormatStr) {

                    if (fileFormatStr === 'csv' || fileFormatStr === 'json' || fileFormatStr === 'xml' ) {

                        scope.fileFormatStr = fileFormatStr;

                        var params = 'file=ServiceReport.' + scope.fileFormatStr + '&api_key=' + APP_API_KEY;
                        var currentUser = UserDataService.getCurrentUser();
                        if (currentUser && currentUser.session_token) {
                            params += '&session_token=' + currentUser.session_token;
                        }

                        // Jason's method to make it work.  He doesn't check for bad response.
                        // I'll look into angularJS's $location to fix this.
                        $window.location.href= INSTANCE_URL.url + '/system/service_report?' + params;
                    }
                };
            }
        };
    }]);*/
