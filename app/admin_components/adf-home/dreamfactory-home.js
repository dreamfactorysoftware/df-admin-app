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
    .run(['DSP_URL', '$templateCache', function (DSP_URL, $templateCache) {



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
                    href: "//www.dreamfactory.com/in_product_welcome.html",
                    attributes: []
                },
                {
                    name: 'resource-home',
                    label: 'Resources',
                    href: "//www.dreamfactory.com/in_product_resources.html",
                    attributes: []
                },
                {
                    name: 'download-home',
                    label: 'Download',
                    href: "//www.dreamfactory.com/in_product_downloads.html",
                    attributes: []
                }
            ];

            $scope.links.push({
                name: 'quickstart-home',
                label: 'Quickstart',
                href: null,
                attributes: []
            });

            angular.forEach($scope.links, function (link) {
                if (!link.label) {
                    link.label = link.name;
                }
            });
        }])

    .directive('dfQuickstart', ['MOD_HOME_ASSET_PATH', 'dfApplicationData', 'dfApplicationPrefs', 'dfNotify', 'dfObjectService', 'dfStringService', function(MOD_HOME_ASSET_PATH, dfApplicationData, dfApplicationPrefs, dfNotify, dfObjectService, dfStringService) {
        return {

            restrict: 'E',
            scope: {
                userData: '=?',
                newUser: '=?'
            },
            templateUrl: MOD_HOME_ASSET_PATH + 'views/df-quickstart.html',
            link: function (scope, elem, attrs) {

                var App = function  (appData) {

                    var _app = {
                        name: ''
                    };

                    appData = appData || _app;

                    return {
                        __dfUI: {
                            quickStartAppType: 'web',   // web or native
                            quickStartWebType: null     // force selection, desktop or admin
                        },
                        record: angular.copy(appData),
                        recordCopy: angular.copy(appData)
                    }
                };


                scope.step = 1;

                // This is where we will store your new app object during the
                // quickstart
                scope.app = new App();


                // Let's get the other apps so that we can compare
                // api names to make sure you haven't already created
                // an app with the same api name.
                scope.apps = dfApplicationData.getApiData('app');

                // We'll need your storage containers because we 'll need to assign
                // this app to a storage container if it is a 'hosted on this system' app.
                scope.storageServices = dfApplicationData.getApiData('service', {type: 'local_file'});

                scope.downloadSDK = function() {

                    window.top.location = location.protocol + '//' + location.host + '/api/v2/system/app/' + scope.app.record.id + '?sdk=true&app_name=admin';
                };


                scope.setStep = function (step) {

                    scope._setStep(step);
                };

                scope.goToDocs = function() {
                    $location.path( '/apidocs' );
                };


                // This checks to see if you have already used this app name
                // for an application
                scope._isAppNameUnique = function () {

                    // let's loop through the apps
                    for (var i = 0; i < scope.apps.length; i++) {

                        // Do we already have an app with that name
                        if (dfStringService.areIdentical(scope.apps[i].name, scope.app.record.name)) {

                            // Yes.
                            return false;
                        }
                    }

                    // The name is unique.
                    return true;
                };

                scope._saveAppToServer = function (requestDataObj) {

                    return dfApplicationData.saveApiData('app', requestDataObj).$promise;
                };

                scope._prepareAppData = function (record) {

                    var _app = angular.copy(record);

                    // translate UI selections to actual app type

                    switch (_app.__dfUI.quickStartAppType) {

                        case 'web':

                            if (_app.__dfUI.quickStartWebType === "desktop") {

                                // native
                                _app.record.type = 0;

                            } else {

                                // local file storage
                                _app.record.type = 1;

                                // TODO can't assume service and container exist
                                angular.forEach(scope.storageServices, function (service) {

                                    if (service.type === 'local_file') {
                                        _app.record.storage_service_id = service.id;
                                        _app.record.storage_container = 'applications';
                                    }
                                });
                            }

                            break;

                        case 'native':

                            // native
                            _app.record.type = 0;

                            break;
                    }

                    return _app.record;
                };

                scope._createApp = function () {

                    // Create our request obj
                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'role_by_role_id'
                        },
                        data: scope._prepareAppData(scope.app)
                    };

                    scope._saveAppToServer(requestDataObj).then(

                        function (result) {

                            // notify success
                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: scope.app.record.name + ' saved successfully.'
                            };

                            dfNotify.success(messageOptions);

                            // save and restore UI settings
                            var ui = angular.copy(scope.app.__dfUI);
                            scope.app = new App (result);
                            scope.app.__dfUI = ui;

                            scope.setStep(3);
                        },

                        function (reject) {

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                        }
                    )
                }

                scope._setStep = function (step) {

                    switch (step) {

                        case 1:
                            scope.step = step;

                        case 2:
                            if (scope.app.__dfUI.quickStartAppType === 'native') {
                                scope._createApp();
                                break;
                            }

                            scope.step = step;
                            break;

                        case 3:
                            scope.step = step;
                            break;

                        default:
                            scope.step = step;

                    }
                }
            }
        }
    }])

