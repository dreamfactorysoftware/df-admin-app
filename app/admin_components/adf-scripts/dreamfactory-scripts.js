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

angular.module('dfScripts', ['ngRoute', 'dfUtility'])
    .constant('MODSCRIPTING_ROUTER_PATH', '/scripts')
    .constant('MODSCRIPTING_ASSET_PATH', 'admin_components/adf-scripts/')
    .constant('MODSCRIPTING_EXAMPLES_PATH', 'admin_components/adf-scripts/examples/')
    .config(['$routeProvider', 'MODSCRIPTING_ROUTER_PATH', 'MODSCRIPTING_ASSET_PATH',
        function ($routeProvider, MODSCRIPTING_ROUTER_PATH, MODSCRIPTING_ASSET_PATH) {
            $routeProvider
                .when(MODSCRIPTING_ROUTER_PATH, {
                    templateUrl: MODSCRIPTING_ASSET_PATH + 'views/main.html',
                    controller: 'ScriptsCtrl',
                    resolve: {
                        checkUser:['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }])

    .run([function () {

    }])

  .controller('ScriptsCtrl', ['INSTANCE_URL', 'SystemConfigDataService', '$scope', '$rootScope', '$http', 'dfApplicationData', 'dfNotify', '$location', '$window',
      function (INSTANCE_URL, SystemConfigDataService, $scope, $rootScope, $http, dfApplicationData, dfNotify, $location, $window) {

            $scope.$parent.title = 'Scripts';
            $scope.$parent.titleIcon = 'code';

            $scope.scriptGitHubTarget = 'scripts';
            $scope.newScript = true;
            $scope.isEventScriptEditable = true;
            $scope.eventScriptUpdateCounter = 0;
            $scope.disableServiceLinkRefresh = true;
            $scope.selections = {
                "service": null
            };

            $scope.search = {
              text: '',
            };

            $scope.searchForScripts = function() {
              $window.open('https://www.google.com/search?q=' + $scope.search.text, '_blank');
            };

            // Loosely defined script object for when a script is non-existent.
            var ScriptObj = function (name) {

                return {
                    name: name,
                    type: 'nodejs',
                    content: '',
                    is_active: false,
                    allow_event_modification: false,
                    storage_service_id: null,
                    scm_repository: null,
                    scm_reference: null,
                    storage_path: null
                };
            };

            $scope.handleFiles = function (element) {

                var file = element.files && element.files[0];
                if (file) {
                    var reader = new FileReader();
                    reader.readAsText(file, "UTF-8");
                    reader.onload = function (evt) {
                        $scope.$apply(function() {
                            $scope.currentScriptObj.content = evt.target.result;
                            $scope.eventScriptUpdateCounter++;
                        });
                    };
                    reader.onerror = function (evt) {
                    };
                }
            };

            $scope.githubModalShow = function () {

                $rootScope.$broadcast('githubShowModal', $scope.scriptGitHubTarget);
            };

            $scope.isHostedSystem = false;

            // load data
            // Allows for building of events dynamically on the client

            $scope.apiData = null;
            $scope.subscription_required = false;

            $scope.loadTabData = function() {

                $scope.dataLoading = true;

                var errorFunc = function (error) {
                    var messageOptions = {
                        module: 'Limits',
                        provider: 'dreamfactory',
                        type: 'error',
                        message: 'There was an error loading data for the Limits tab. Please try refreshing your browser and logging in again.'
                    };
                    dfNotify.error(messageOptions);
                };

                // first get system data to decide whether to load other data
                dfApplicationData.getApiData(['system']).then(
                    function (response) {
                        angular.forEach(response[0].resource, function (value) {
                            if (value.name === 'script_type' || value.name === 'event_script') {
                                $scope.scriptsEnabled = true;
                            }
                        });
                        if (!$scope.scriptsEnabled) {
                            // scripts not enabled, disable UI
                            $scope.subscription_required = true;
                        } else {
                            // scripts enabled, load other data

                            // always load event scripts from server
                            var primaryApis = ['event_script'];

                            // Only load these one time as they should not change as scripts are created/deleted.
                            // service_list is used to build top level view then when you select a service it will query events
                            // for that service. We don't want to query events for all services up front becuase it's too slow.
                            var secondaryApis = ['service_list', 'script_type', 'service_link', 'environment'];

                            // for primaryApis force refresh to always load from server
                            dfApplicationData.getApiData(primaryApis, true).then(
                                function (response) {
                                    var newApiData = {};
                                    primaryApis.forEach(function(value, index) {
                                        newApiData[value] = response[index].resource ? response[index].resource : response[index];
                                    });
                                    // loading from cache is ok for secondaryApis, unless the tab is just loaded ($scope.apiData === null)
                                    // in that case load from server to pick up any new services, tables, etc
                                    // when a script is created or deleted $scope.apiData will not be null and data comes from cache
                                    dfApplicationData.getApiData(secondaryApis, ($scope.apiData === null)).then(
                                        function (response) {
                                            secondaryApis.forEach(function(value, index) {
                                                newApiData[value] = response[index].resource ? response[index].resource : response[index];
                                            });
                                            // all done
                                            $scope.apiData = newApiData;
                                        },
                                        function (error) {
                                            var msg = 'There was an error loading data for the Scripts tab. Please try refreshing your browser and logging in again.';
                                            if (error && error.error && (error.error.code === 401 || error.error.code === 403)) {
                                                msg = 'To use the Scripts tab your role must allow GET access to system/event_script, system/event, and system/script_type. To create, update, or delete scripts you need POST and DELETE access to /system/event_script.';
                                                $location.url('/home');
                                            }
                                            var messageOptions = {
                                                module: 'Scripts',
                                                provider: 'dreamfactory',
                                                type: 'error',
                                                message: msg
                                            };
                                            dfNotify.error(messageOptions);
                                        }
                                    ).finally(function () {
                                        $scope.dataLoading = false;
                                    });
                                },
                                function (error) {
                                    var msg = 'There was an error loading data for the Scripts tab. Please try refreshing your browser and logging in again.';
                                    if (error && error.error && (error.error.code === 401 || error.error.code === 403)) {
                                        msg = 'To use the Scripts tab your role must allow GET access to system/event_script, system/event, and system/script_type. To create, update, or delete scripts you need POST and DELETE access to /system/event_script.';
                                        $location.url('/home');
                                    }
                                    var messageOptions = {
                                        module: 'Scripts',
                                        provider: 'dreamfactory',
                                        type: 'error',
                                        message: msg
                                    };
                                    dfNotify.error(messageOptions);
                                    $scope.dataLoading = false;
                                }
                            );
                        }
                    },
                    // error getting system data
                    errorFunc
                ).finally(function () {
                    $scope.dataLoading = false;
                });
            };

            $scope.getRefreshEnable = function() {

                var type, enable = false;

                if ($scope.currentScriptObj && $scope.selections.service) {
                    type = $scope.selections.service.type;
                    if (type === 'github' || type === 'gitlab' || type === 'bitbucket') {
                        if ($scope.currentScriptObj.scm_repository && $scope.currentScriptObj.scm_reference && $scope.currentScriptObj.storage_path) {
                            enable = true;
                        }
                    } else {
                        if ($scope.currentScriptObj.storage_path) {
                            enable = true;
                        }
                    }
                }

                return enable;
            };

            $scope.resetServiceLink = function () {

                $scope.currentScriptObj.scm_repository = null;
                $scope.currentScriptObj.scm_reference = null;
                $scope.currentScriptObj.storage_path = null;
            };

            $scope.pullLatestScript = function () {

                var serviceName = $scope.selections.service.name;
                var serviceRepo = $scope.currentScriptObj.scm_repository;
                var serviceRef = $scope.currentScriptObj.scm_reference;
                var servicePath = $scope.currentScriptObj.storage_path;
                var url = INSTANCE_URL.url + '/' + serviceName;

                if($scope.selections.service && ($scope.selections.service.type === 'github' || $scope.selections.service.type === 'gitlab' || $scope.selections.service.type === 'bitbucket')){
                    var params = {
                        path: servicePath,
                        branch: serviceRef,
                        content: 1
                    };
                    url = url + '/_repo/' + serviceRepo;
                } else {
                    url = url + '/' + servicePath;
                }

                $http({
                    method: 'GET',
                    url: url,
                    params: params
                }).then(
                    function (result) {

                        $scope.currentScriptObj.content = result.data;
                        $scope.eventScriptUpdateCounter++;

                        var messageOptions = {
                            module: 'Scripts',
                            provider: 'dreamfactory',
                            type: 'success',
                            message: 'Successfully pulled the latest script from source.'
                        };
                        dfNotify.error(messageOptions);
                    },

                    function (error) {

                        var messageOptions = {
                            module: 'Scripts',
                            provider: 'dreamfactory',
                            type: 'error',
                            message: 'There was an error pulling the latest script from source. Please make sure your service, path and permissions are correct and try again.'
                        };
                        dfNotify.error(messageOptions);
                    }
                ).finally(function () {
                });
            };

            $scope.deleteScriptFromCache = function () {

                $http({
                    method:'DELETE',
                    url: INSTANCE_URL.url + '/system/cache/_event/' + $scope.currentScriptObj.name
                }).then(
                    function(result){

                        var messageOptions = {
                            module: 'Scripts',
                            provider: 'dreamfactory',
                            type: 'success',
                            message: 'Successfully cleared script from cache.'
                        };
                        dfNotify.error(messageOptions);
                    },
                    function(error) {

                        var messageOptions = {
                            module: 'Scripts',
                            provider: 'dreamfactory',
                            type: 'error',
                            message: 'Failed to cleared script from cache.'
                        };
                        dfNotify.error(messageOptions);
                    }
                ).finally(function() {
                });
            };

            $scope.loadTabData();

            $scope.allowedScriptFormats = ['js','php','py', 'txt'];

            // Keep track of what's going on in the module
            $scope.currentServiceObj = null;
            $scope.currentResourceObj = null;
            $scope.currentEndpointObj = null;
            $scope.currentScriptObj = null;
            $scope.menuPathArr = [];
            $scope.eventLookup = {};
            $scope.eventsLoading = false;

            // Stuff for the editor
            $scope.eventScriptEditorObj = {"editor": null};

            // PUBLIC API

            // expand a single generic endpoint to full list using parameter arrays

            $scope.explodeEndpoint = function (endpointName, parameter) {

                var endpoints = [endpointName];

                if (parameter !== null) {
                    if (endpointName.indexOf("{") >= 0 && endpointName.indexOf("}") >= 0) {
                        angular.forEach(parameter, function (paramArray, paramName) {
                            angular.forEach(paramArray, function (itemName) {
                                endpoints.push(endpointName.replace("{" + paramName + "}", itemName));
                            });
                        });
                    }
                }

                return endpoints;
            };

            // given a script name, allows an easy way to determine which service, resource, endpoint to highlight
            // this function should only be called once after each time event data is loaded

            $scope.buildEventLookup = function (eventData) {

                var newData = angular.copy(eventData);
                var lookupData = {}, lookupObj;

                angular.forEach(newData, function (resources, serviceName) {
                    angular.forEach(resources, function (resourceData, resourceName) {
                        angular.forEach(resourceData.endpoints, function (endpointName) {
                            lookupObj = {
                                'service': serviceName,
                                'resource': resourceName,
                                'endpoint': endpointName
                            };
                            lookupData[endpointName] = lookupObj;
                            if (resourceData.parameter !== null) {
                                if (endpointName.indexOf("{") >= 0 && endpointName.indexOf("}") >= 0) {
                                    angular.forEach(resourceData.parameter, function (paramArray, paramName) {
                                        angular.forEach(paramArray, function (itemName) {
                                            lookupData[endpointName.replace("{" + paramName + "}", itemName)] = lookupObj;
                                        });
                                    });
                                }
                            }
                        });
                    });
                });
                return lookupData;
            };

            // return true if there are any event scripts for this service

            $scope.highlightService = function (serviceName) {

                return $scope.apiData.event_script.some(function(scriptName) {
                    return scriptName.indexOf(serviceName + '.') === 0;
                });
            };

            // return true if there are any event scripts for this resource

            $scope.highlightResource = function (resourceName) {

                return $scope.apiData.event_script.some(function(scriptName) {
                    var event = $scope.eventLookup[scriptName];
                    if (event) {
                        return event.resource === resourceName;
                    }
                    return false;
                });
            };

            // return true if there are any event scripts for this endpoint

            $scope.highlightEndpoint = function (endpointName) {

                return $scope.apiData.event_script.some(function(scriptName) {
                    var event = $scope.eventLookup[scriptName];
                    if (event) {
                        return event.endpoint === endpointName;
                    }
                    return false;
                });
            };

            // return true if there is an event script with this name

            $scope.highlightExplodedEndpoint = function (endpointName) {

                return $scope.apiData.event_script.some(function(scriptName) {
                    return scriptName === endpointName;
                });
            };

            // select a service and display all resources for that service

            $scope.selectService = function (service) {

                // prevent multiple clicks on service

                if ($scope.eventsLoading) {
                    return;
                }

                $scope.eventsLoading = true;

                var serviceName = service.name;

                // get the events for this service

                $http({
                    method: 'GET',
                    url: INSTANCE_URL.url + '/system/event',
                    params: {"service": serviceName, "scriptable": true}
                }).then(
                    function (result) {

                        $scope.menuPathArr.push(serviceName);
                        var resources = result.data[serviceName];
                        $scope.currentServiceObj = {"name": serviceName, "resources": resources};
                        // used for highlighting in ui
                        $scope.eventLookup = $scope.buildEventLookup(result.data);
                    },

                    function (reject) {

                        var messageOptions = {
                            module: 'Scripts',
                            provider: 'dreamfactory',
                            type: 'error',
                            message: reject
                        };
                        dfNotify.error(messageOptions);
                    }
                ).finally(function () {

                    $scope.eventsLoading = false;
                });
            };

            // select a resource and display all endpoints for that resource

            $scope.selectResource = function (resourceName, resource) {

                $scope.menuPathArr.push(resourceName);
                $scope.currentResourceObj = {"name": resourceName, "endpoints": resource.endpoints, "parameter": resource.parameter};
            };

            // select an endpoint and show exploded list of endpoints

            $scope.selectEndpoint = function (endpointName) {

                var endpoints;

                $scope.menuPathArr.push(endpointName);
                endpoints = $scope.explodeEndpoint(endpointName, $scope.currentResourceObj.parameter);
                $scope.currentEndpointObj = {"name": endpointName, "endpoints": endpoints};
            };

            $scope.getServiceById = function (id) {

                var matches = $scope.apiData['service_link'].filter(function(service){
                    return service.id === id;
                });
                if (matches.length === 0) {
                    return null;
                }
                return matches[0];
            };

            // load the editor

            $scope.getScript = function (scriptName) {

                $scope.menuPathArr.push(scriptName);

                var requestDataObj = {

                    name: scriptName,
                    params: {}
                };

                $http({
                    method: 'GET',
                    url: INSTANCE_URL.url + '/system/event_script/' + requestDataObj.name,
                    params: requestDataObj.params
                }).then(
                    function (result) {
                        var obj = result.data;
                        // if linked to a service set script content to empty
                        $scope.selections.service = $scope.getServiceById(obj.storage_service_id);
                        if ($scope.selections.service) {
                            obj.content = "";
                        }
                        $scope.currentScriptObj = obj;
                        $scope.newScript = false;
                    },
                    function (reject) {
                        if (reject.data && reject.data.error && reject.data.error.code === 404) {
                            $scope.currentScriptObj = new ScriptObj(scriptName);
                            $scope.newScript = true;
                            $scope.selections.service = null;
                        } else {
                            var messageOptions = {
                                module: 'Scripts',
                                provider: 'dreamfactory',
                                type: 'error',
                                message: reject
                            };
                            dfNotify.error(messageOptions);
                            $scope.menuBack();
                        }
                    }
                ).finally(
                    function () {
                    }
                );
            };

            // save script to server

            $scope.saveScript = function () {

                if (!$scope.currentScriptObj.name) {
                    return;
                }

                // sanitize service link config before saving
                // send nulls not empty strings
                // if no service selected send null for everything

                // service to link to
                $scope.currentScriptObj.storage_service_id = ($scope.selections.service ? $scope.selections.service.id : null);

                // repo is allowed for bitbucket, github or gitlab, replace empty string with null
                if ($scope.selections.service &&
                    ($scope.selections.service.type === 'github' || $scope.selections.service.type === 'gitlab' || $scope.selections.service.type === 'bitbucket')) {
                    $scope.currentScriptObj.scm_repository = ($scope.currentScriptObj.scm_repository ? $scope.currentScriptObj.scm_repository : null);
                } else {
                    $scope.currentScriptObj.scm_repository = null;
                }

                // ref is allowed for bitbucket, github or gitlab, replace empty string with null
                if ($scope.selections.service &&
                    ($scope.selections.service.type === 'github' || $scope.selections.service.type === 'gitlab' || $scope.selections.service.type === 'bitbucket')) {
                    $scope.currentScriptObj.scm_reference = ($scope.currentScriptObj.scm_reference ? $scope.currentScriptObj.scm_reference : null);
                }  else {
                    $scope.currentScriptObj.scm_reference = null;
                }

                // path is allowed for any link service, replace empty string with null
                if ($scope.selections.service) {
                    $scope.currentScriptObj.storage_path = ($scope.currentScriptObj.storage_path ? $scope.currentScriptObj.storage_path : null);
                }  else {
                    $scope.currentScriptObj.storage_path = null;
                }

                // if linked to a service set script content to empty
                if ($scope.selections.service) {
                    $scope.currentScriptObj.content = "";
                    $scope.eventScriptUpdateCounter++;
                } else {
                    $scope.currentScriptObj.content = $scope.eventScriptEditorObj.editor.getValue();
                }

                var requestDataObj = {

                    name: $scope.currentScriptObj.name,
                    params: {},
                    data: $scope.currentScriptObj
                };

                $http({
                    method: 'POST',
                    url: INSTANCE_URL.url + '/system/event_script/' + requestDataObj.name,
                    params: requestDataObj.params,
                    data: requestDataObj.data
                }).then(
                    function (result) {

                        $scope.newScript = false;

                        var messageOptions = {
                            module: 'Scripts',
                            type: 'success',
                            provider: 'dreamfactory',
                            message: 'Script "' + $scope.currentScriptObj.name + '" saved successfully.'
                        };

                        dfNotify.success(messageOptions);
                    },

                    function (reject) {

                        var messageOptions = {
                            module: 'Scripts',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: reject
                        };

                        dfNotify.error(messageOptions);
                    }
                ).finally(
                    function () {
                        $scope.loadTabData();
                    }
                );
            };

            // delete script from server

            $scope.deleteScript = function () {

                if (dfNotify.confirm('Delete ' + $scope.currentScriptObj.name + '?')) {

                    var requestDataObj = {

                        name: $scope.currentScriptObj.name,
                        params: {}
                    };

                    $http({
                        method: 'DELETE',
                        url: INSTANCE_URL.url + '/system/event_script/' + requestDataObj.name,
                        params: requestDataObj.params
                    }).then(
                        function (result) {

                            var messageOptions = {
                                module: 'Scripts',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Script deleted successfully.'
                            };

                            dfNotify.success(messageOptions);

                            $scope.menuPathArr.pop();
                            $scope.currentScriptObj = null;
                        },

                        function (reject) {

                            var messageOptions = {
                                module: 'Scripts',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function () {
                            $scope.loadTabData();
                        }
                    );
                }
            };

            // COMPLEX IMPLEMENTATION

            $scope.menuOpen = true;

            // PUBLIC API

            $scope.toggleMenu = function () {

                $scope.menuOpen = !$scope.menuOpen;
            };

            $scope.menuBack = function () {

                if ($scope.menuPathArr.length > 0) {
                    $scope.menuPathArr.pop();
                    $scope.currentScriptObj = null;
                    $scope.eventScriptEditorObj.editor.setValue("");
                }
            };

            $scope.jumpTo = function (index) {

                while ($scope.menuPathArr.length - 1 !== index) {
                    $scope.menuBack();
                }
            };


            // PRIVATE API

            // COMPLEX IMPLEMENTATION

            $scope.$broadcast('script:loaded:success');


            // MESSAGES

            var watchGithubCredUser = $scope.$watch('githubModal.username', function (newValue, oldValue) {

                if (!newValue) return false;

                $scope.modalError = {
                    visible: false,
                    message: ''
                };
            });

            var watchGithubCredPass = $scope.$watch('githubModal.password', function (newValue, oldValue) {

                if (!newValue) return false;

                $scope.modalError = {
                    visible: false,
                    message: ''
                };
            });

            var watchGithubURL = $scope.$watch('githubModal.url', function (newValue, oldValue) {

                if (!newValue) return false;

                $scope.modalError = {
                    visible: false,
                    message: ''
                };

                if (newValue.indexOf('.js') > 0 ||
                    newValue.indexOf('.py') > 0 ||
                    newValue.indexOf('.php') > 0 ||
                    newValue.indexOf('.txt') > 0) {

                    var url = angular.copy($scope.githubModal.url);
                    var url_params = url.substr(url.indexOf('.com/') + 5);
                    var url_array = url_params.split('/');

                    var owner = url_array[0];
                    var repo = url_array[1];

                    var github_api_url = 'https://api.github.com/repos/' + owner + '/' + repo;

                    $http.get(github_api_url, {
                        headers: {
                            'X-DreamFactory-API-Key': undefined,
                            'X-DreamFactory-Session-Token': undefined
                        }
                    })
                    .then(function successCallback(response) {

                        $scope.githubModal.private = response.data.private;

                        $scope.modalError = {
                            visible: false,
                            message: ''
                        };
                    }, function errorCallback(response) {

                        if (response.status === 404) {
                            $scope.modalError = {
                                visible: true,
                                message: 'Error: The repository could not be found.'
                            };
                        }
                    });
                }
            });

            var watchCurrentScriptObj = $scope.$watchCollection('currentScriptObj', function (newValue, oldValue) {

                if (newValue) {
                    $scope.disableServiceLinkRefresh = !$scope.getRefreshEnable();
                }
            });

            var watchSelections = $scope.$watchCollection('selections', function (newValue, oldValue) {

                $scope.disableServiceLinkRefresh = !$scope.getRefreshEnable();
                if (newValue) {
                    // when unselecting a service do nothing
                    $scope.isEventScriptEditable = (newValue.service === null);
                    // if changing from no service to service then clear content
                    // if changing from one service to another then clear content
                    // if changing from service to no service then keep content
                    if (newValue.service !== null) {
                        $scope.currentScriptObj.content = "";
                        $scope.eventScriptUpdateCounter++;
                    }
                }
            });

            var watchApiData = $scope.$watchCollection('apiData', function (newValue, oldValue) {

                if (newValue) {
                    if (newValue.environment && newValue.environment.platform && newValue.environment.platform.is_hosted) {
                        $scope.isHostedSystem = true;
                    }
                }
            });


            $scope.$on('$destroy', function (e) {

                watchGithubURL();
                watchGithubCredUser();
                watchGithubCredPass();
                watchCurrentScriptObj();
                watchSelections();
                watchApiData();
            });
        }])

    .directive('scriptSidebarMenu', ['MODSCRIPTING_ASSET_PATH', function (MODSCRIPTING_ASSET_PATH) {

        return {

            restrict: 'E',
            scope: false,
            templateUrl: MODSCRIPTING_ASSET_PATH + 'views/script-sidebar-menu.html',
            link: function (scope, elem, attrs) {}
        };
    }])

    .directive('dfAceSamplesSelect', ['MODSCRIPTING_ASSET_PATH', 'MODSCRIPTING_EXAMPLES_PATH', '$http', function (MODSCRIPTING_ASSET_PATH, MODSCRIPTING_EXAMPLES_PATH, $http) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MODSCRIPTING_ASSET_PATH + 'views/df-ace-samples.html',
            link: function (scope, elem, attrs) {

                scope.eventScriptSamplesEditorObj = {"editor": null};
                scope.eventScriptSamplesType = 'nodejs';
                scope.eventScriptSamplesContent = "";

                scope.scriptSamplesSelect = function (type) {

                    var fileExt;

                    switch (type) {
                        case 'nodejs':
                            fileExt = 'node.js';
                            break;
                        case 'php':
                            fileExt = 'php';
                            break;
                        case 'python':
                            fileExt = 'py';
                            break;
                        case 'python3':
                            fileExt = 'python3.py';
                            break;
                        default:
                            return;
                    }

                    scope.eventScriptSamplesType = type;

                    $http.get(MODSCRIPTING_EXAMPLES_PATH + 'example.scripts.' + fileExt).then(
                        function (result) {
                            scope.eventScriptSamplesContent = result.data;
                        },
                        function (reject) {
                        }
                    );
                };

                scope.scriptSamplesSelect('nodejs');
            }
        };
    }])

    .directive('dfScriptingLoading', [function() {
        return {
            restrict: 'E',
            template: "<div class='col-lg-12' ng-if='dataLoading'><span style='display: block; width: 100%; text-align: center; color: #A0A0A0; font-size: 50px; margin-top: 100px'><i class='fa fa-refresh fa-spin'></i></div>"
        };
    }]);
