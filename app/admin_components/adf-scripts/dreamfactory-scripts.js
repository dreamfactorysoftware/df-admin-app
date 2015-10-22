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
                        checkAppObj: ['dfApplicationData', function (dfApplicationData) {

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
    .run(['INSTANCE_URL', '$http', function (INSTANCE_URL, $http) {

    }])
    .controller('ScriptsCtrl', ['INSTANCE_URL', 'SystemConfigDataService', '$scope', '$http', 'dfApplicationData', 'dfNotify', 'MODSCRIPTING_EXAMPLES_PATH',
        function (INSTANCE_URL, SystemConfigDataService, $scope, $http, dfApplicationData, dfNotify, MODSCRIPTING_EXAMPLES_PATH) {

            $scope.$parent.title = 'Scripts';

            // Loosely defined script object for when a script is non-existent.
            var ScriptObj = function (scriptId, scriptLanguage, scriptData) {

                return {
                    name: scriptId,
                    type: scriptLanguage || 'v8js',
                    content: scriptData || '',
                    is_active: false,
                    __newScript: true
                }
            };


            $scope.highlightScript = function () {
                $http({
                    method: 'GET',
                    url: INSTANCE_URL + '/api/v2/system/event',
                    params: {
                        only_scripted: true
                    }
                }).then(function (result) {
                    $scope.highlightedEvents = result.data.resource
                    $scope.events.process.$$isHighlighted = $scope.highlightEvent($scope.events.process);
                    $scope.events.broadcast.$$isHighlighted = $scope.highlightEvent($scope.events.broadcast);
                })
            };

            $scope.__getDataFromHttpResponse = function (httpResponseObj) {

                if (!httpResponseObj) return [];

                if (httpResponseObj.hasOwnProperty('data')) {

                    if (httpResponseObj.data.hasOwnProperty('record')) {

                        return httpResponseObj.data.record;

                    } else if (httpResponseObj.data.hasOwnProperty('resource')) {

                        return httpResponseObj.data.resource;

                    } else {

                        return httpResponseObj.data;
                    }
                } else {

                }
            };

            $scope.isHostedSystem = false; // SystemConfigDataService.getSystemConfig().is_hosted;


            // Array containing data that describes the scripting types.
            $scope.eventTypes = [

                {
                    name: 'process-scripts',
                    label: 'Process Event Scripts',
                    item_name: 'process'
                //},
                //{
                //    name: 'broadcast-scripts',
                //    label: "Broadcast Event Scripts",
                //    item_name: 'broadcast'
                }
            ];

            // Sample Scripts
            $scope.samplesScripts = null;
            // $scope.sampleScripts = new ScriptObj('sample-scripts', 'v8js', getSampleScripts.data);

            // All these vars pertain to building of events dynamically on the client
            $scope.events = angular.copy(dfApplicationData.getApiData('event'));
            $scope.scriptTypes = dfApplicationData.getApiData('script_type');
            $scope.uppercaseVerbLabels = true;
            $scope.allowedVerbs = ['get', 'post', 'put', 'patch', 'delete']
            $scope.highlightScript();
            
            // Keep track of what's going on in the module
            $scope.currentEventTypeObj = null;
            $scope.currentServiceObj = null;
            $scope.currentPathObj = null;
            $scope.currentScriptObj = null;

            // Stuff for the editor
            $scope.editor = null;
            $scope.isEditorClean = true;


            // PUBLIC API
            $scope.setEventType = function (typeObj) {

                $scope._setEventType(typeObj);
            };

            $scope.setService = function (name, eventObj) {

                $scope._setService(name, eventObj);
            };

            $scope.setPath = function (name, pathObj) {

                $scope._setPath(name, pathObj);
            };

            $scope.setScript = function (scriptIdStr) {

                $scope._setScript(scriptIdStr);
            };

            $scope.setEventList = function (name, verb, events) {
                $scope.cachePath = { // Ugly, but needed for "back" functionality
                    verbs: $scope.currentPathObj.verbs,
                    name: $scope.currentPathObj.name
                }
                $scope._setEventList(name, verb, events);
            };

            $scope.clearEventList = function() {
                if($scope.currentPathObj.events) {
                    $scope.cachePath.name = $scope.currentPathObj.name;
                    $scope.cachePath.verb = $scope.currentPathObj.verb;
                    $scope.cachePath.events = $scope.currentPathObj.events;

                    $scope.currentPathObj.events = null;
                    $scope.currentPathObj.verb = null;
                    $scope.currentPathObj.verbs = null;
                }
            }

            $scope.saveScript = function () {

                $scope._saveScript();
            };

            $scope.deleteScript = function () {

                if (dfNotify.confirm('Delete ' + $scope.currentScriptObj.name + '?')) {

                    $scope._deleteScript();
                }
            };

            $scope.loadSamples = function () {

                $scope._loadSamples();
            };


            // PRIVATE API

            // Retrieves associated path(s) data for an event
            $scope._getEventFromServer = function (requestDataObj) {


                return $http({
                    method: 'GET',
                    url: INSTANCE_URL + '/api/v2/' + requestDataObj.eventName,
                    params: requestDataObj.params
                })

            };

            // Retrieves script object from server
            $scope._getScriptFromServer = function (requestDataObj) {

                return $http({
                    method: 'GET',
                    url: INSTANCE_URL + '/api/v2/system/event/' + requestDataObj.name,
                    params: requestDataObj.params
                })
            };

            // Save script object to server
            $scope._saveScriptToServer = function (requestDataObj) {

                return $http({
                    method: 'POST',
                    url: INSTANCE_URL + '/api/v2/system/event/' + requestDataObj.name,
                    params: requestDataObj.params,
                    data: requestDataObj.data
                }).then($scope.highlightScript);
            };

            // Delete a script from the server
            $scope._deleteScriptFromServer = function (requestDataObj) {

                return $http({
                    method: 'DELETE',
                    url: INSTANCE_URL + '/api/v2/system/event/' + requestDataObj.name,
                    params: requestDataObj.params
                }).then($scope.highlightScript);
            };

            // Check for event paths with {variable} in their path property
            $scope._isVariablePath = function (path) {

                return path.path.indexOf("}") != "-1";
            };

            // Resets everything.  Stepping backwards through menuBack() to get all
            // the checks.
            $scope._resetAll = function () {

                if ($scope.menuPathArr.length === 0) return false;

                while ($scope.menuPathArr.length !== 0) {
                    $scope.menuBack();
                }
            };

            // COMPLEX IMPLEMENTATION

            $scope._setEventType = function (typeObj) {

                $scope._resetAll();

                $scope.menuPathArr.push(typeObj.label);
                $scope.currentEventTypeObj = typeObj;
                $scope.pathFilter = '';

                var evt = null;
                if (typeObj.item_name === 'process') {
                    $scope.events.process.$$isHighlighted = $scope.highlightEvent($scope.events.process);
                } else {
                    $scope.events.broadcast.$$isHighlighted = $scope.highlightEvent($scope.events.broadcast);
                }
            };

            $scope.highlightEvent = function (evt) {
                var flag = false;
                for (var item in evt) {
                    if (typeof(evt[item]) == 'boolean') continue;

                    evt[item].$$isHighlighted = $scope.highlightCurrentServiceObj({
                        paths: evt[item]
                    });

                    if (evt[item].$$isHighlighted) {
                        flag = true;
                    }
                }
                return flag;
            };

            $scope._setService = function (name, eventObj) {

                $scope.menuPathArr.push(name);
                $scope.currentServiceObj = { "name": name, "paths": eventObj };
                $scope.pathFilter = '';

                $scope.highlightCurrentServiceObj($scope.currentServiceObj);
                return false;
            };

            $scope.highlightCurrentServiceObj = function (currentServiceObj) {
                var flag = false;

                for (var item in currentServiceObj.paths) {
                    if (typeof(currentServiceObj.paths[item]) == 'boolean') continue;

                    currentServiceObj.paths[item].$$isHighlighted = $scope.highlightCurrentPathObj({
                        verbs: constructPaths(item, currentServiceObj.paths[item].verb, currentServiceObj.paths[item].parameter)
                    });

                    if (currentServiceObj.paths[item].$$isHighlighted) {
                        flag = true;
                    }
                }

                return flag;
            };

            var constructPaths = function (name, verbList, parameter) {
                var newEventName;
                var newVerbList = angular.copy(verbList);
                if (name.indexOf("{") >= 0 && name.indexOf("}") >= 0) {
                    if (parameter) {
                        angular.forEach(verbList, function(eventArray, verbName) {
                            angular.forEach(parameter, function(paramArray, paramName) {
                                angular.forEach(paramArray, function(itemName, itemIndex) {
                                    angular.forEach(eventArray, function(eventName, eventIndex) {
                                        newEventName = eventName.replace("{" + paramName + "}", itemName);
                                        newVerbList[verbName].push(newEventName);
                                    });
                                });
                            });
                        });
                    }
                }

                return newVerbList;
            };


            $scope._setPath = function (name, pathObj) {
                var verbList, newEventName;

                $scope.menuPathArr.push(name);
                var newVerbList = constructPaths(name, pathObj.verb, pathObj.parameter);

                $scope.currentPathObj = { "name": name, "verbs": newVerbList };
                $scope.pathFilter = '';
                $scope.highlightCurrentPathObj($scope.currentPathObj);
            };


            $scope.highlightCurrentPathObj = function (currentPathObj) {
                var flag = false;
                for (var verb in currentPathObj.verbs) {
                    if (typeof(currentPathObj.verbs[verb]) == 'boolean') continue; 

                    var exists = currentPathObj.verbs[verb].filter(function (item) {
                        return $scope.highlightedEvents.some(function (evt) {
                            return evt === item
                        });
                    }).length;

                    if (exists) {
                        flag = true;
                        currentPathObj.verbs[verb].$$isHighlighted = true;
                    }
                }

                return flag;
            };

            $scope._setEventList = function(name, verb, events) {
                $scope.currentPathObj.name = name;
                $scope.currentPathObj.events = events;
                $scope.currentPathObj.verb = verb;
                if(name) {
                    $scope.menuPathArr.push("[" + verb.toUpperCase() + "] " + name);
                }
                
            };


            $scope.isHighlightedItem = function (evt) {
                return $scope.highlightedEvents && $scope.highlightedEvents.filter(function (item) {
                    return item === evt;
                }).length;
            };

            $scope._setScript = function (scriptIdStr) {
                var requestDataObj = {

                    name: scriptIdStr,
                    params: {}
                };

                $scope._getScriptFromServer(requestDataObj).then(
                    function (result) {

                        $scope.currentScriptObj = $scope.__getDataFromHttpResponse(result);
                        console.log($scope.currentScriptObj);
                        $scope.menuPathArr.push(scriptIdStr);
                    },

                    function (reject) {

                        $scope.currentScriptObj = new ScriptObj(scriptIdStr, null, null);
                        $scope.menuPathArr.push(scriptIdStr);
                    }
                ).finally(
                    function () {
                        // console.log('get Script finally')
                    }
                )
            };

            $scope._saveScript = function () {

                if (!$scope.currentScriptObj.name) {
                    alert('Please enter a script name.');
                    return false;
                }

                $scope.currentScriptObj.content = $scope.editor.getValue() || ' ';
                var requestDataObj = {

                    name: $scope.currentScriptObj.name,
                    params: {},
                    data: $scope.currentScriptObj
                };

                $scope._saveScriptToServer(requestDataObj).then(
                    function (result) {

                        $scope.editor.session.getUndoManager().reset();
                        $scope.editor.session.getUndoManager().markClean();
                        $scope.isEditorClean = true;

                        // Needs to be replaced with angular messaging
                        $(function () {
                            new PNotify({
                                title: 'Scripts',
                                type: 'success',
                                text: 'Script "' + $scope.currentScriptObj.name + '" saved successfully.'
                            });
                        });
                    },

                    function (reject) {

                        throw {
                            module: 'Scripts',
                            type: 'error',
                            provider: 'dreamfactory',
                            exception: reject
                        }
                    }
                ).finally(
                    function () {

                        // console.log('Script Save finally function.')
                    }
                )
            };

            $scope._deleteScript = function () {

                var requestDataObj = {

                    name: $scope.currentScriptObj.name,
                    params: {}
                };

                $scope._deleteScriptFromServer(requestDataObj).then(
                    function (result) {

                        // Needs to be replaced with angular messaging
                        $(function () {
                            new PNotify({
                                title: 'Scripts',
                                type: 'success',
                                text: 'Script "' + $scope.currentScriptObj.name + '" deleted successfully.'
                            });
                        });


                        $scope.menuPathArr.pop();
                        $scope.currentScriptObj = null;
                        $scope.editor.session.getUndoManager().reset();
                        $scope.editor.session.getUndoManager().markClean();

                    },

                    function (reject) {

                        throw {
                            module: 'Scripts',
                            type: 'error',
                            provider: 'dreamfactory',
                            exception: reject
                        }

                    }
                ).finally(
                    function () {

                    }
                )

            };

            $scope._loadSamples = function () {

                $scope._resetAll();

                $http.get(MODSCRIPTING_EXAMPLES_PATH + 'example.scripts.js').then(
                    function (result) {

                        $scope.sampleScripts = new ScriptObj('sample-scripts', 'v8js', result.data);
                        $scope.currentEventTypeObj = {name: 'sample-scripts', label: 'Sample Scripts'};
                        $scope.currentScriptObj = $scope.sampleScripts;
                        $scope.menuPathArr.push('Sample Scripts');
                    },
                    function (reject) {
                        dfNotify.error(reject)
                        $scope.sampleScrips = ''
                    }
                )

                return false;
            };


            // MESSAGES


        }])
    .directive('scriptSidebarMenu', ['MODSCRIPTING_ASSET_PATH', function (MODSCRIPTING_ASSET_PATH) {

        return {

            restrict: 'E',
            scope: false,
            templateUrl: MODSCRIPTING_ASSET_PATH + 'views/script-sidebar-menu.html',
            link: function (scope, elem, attrs) {


                scope.menuOpen = true;
                scope.menuPathArr = [];

                scope.pathFilter = '';


                // PUBLIC API
                scope.toggleMenu = function () {

                    scope._toggleMenu();
                };

                scope.menuBack = function () {

                    // Check if we have chnaged the script
                    if (!scope.isEditorClean) {

                        // Script has been changed.  Confirm close.
                        if (!scope._confirmCloseScript()) {

                            return false;
                        } else {
                            scope.editor.session.getUndoManager().reset();
                            scope.editor.session.getUndoManager().markClean();
                            scope.isEditorClean = true;
                        }
                    }

                    scope._menuBack();
                };

                scope.jumpTo = function (index) {

                    scope._jumpTo(index);
                };


                // PRIVATE API

                // Confirm close with unsaved changes.
                scope._confirmCloseScript = function () {

                    return confirm('You have unsaved changes.  Close anyway?');
                };


                // COMPLEX IMPLEMENTATION
                scope._menuBack = function () {

                    // Do we have a script type.  If not stop.
                    if (!scope.currentEventTypeObj) return false;


                    switch (scope.currentEventTypeObj.name) {

                        case 'process-scripts':

                            switch (scope.menuPathArr.length) {

                                case 0:
                                    break;

                                case 1:

                                    scope.menuPathArr.pop();
                                    scope.currentEventTypeObj = null;
                                    scope.pathFilter = '';
                                    break;

                                case 2:

                                    scope.menuPathArr.pop();
                                    scope.currentServiceObj = null;
                                    scope.pathFilter = '';
                                    scope.highlightEvent(scope.events.process);
                                    break

                                case 3:
                                    scope.menuPathArr.pop();
                                    scope.currentPathObj = null;
                                    scope.pathFilter = '';
                                    scope.highlightCurrentServiceObj(scope.currentServiceObj);

                                    break;

                                case 4:

                                    // Two cases for 4-length. Check whether we are
                                    // at the end of the path, or there's one more 
                                    // level 
                                    if(scope.currentPathObj.events) {
                                        scope.menuPathArr.splice(2,2);
                                        scope.setPath(scope.cachePath.name, {verb: scope.cachePath.verbs});
                                    } else {
                                        scope.menuPathArr.pop();
                                        scope.currentScriptObj = null;
                                    }
                                    
                                    break;

                                case 5:
                                    scope.currentScriptObj = null;
                                    scope._setEventList(null, scope.cachePath.verb, scope.cachePath.events);
                                    scope.menuPathArr.pop();

                                    break;

                            }
                            break;


                        case 'broadcast-scripts':


                            switch (scope.menuPathArr.length) {

                                case 0:
                                    break;

                                case 1:

                                    scope.menuPathArr.pop();
                                    scope.currentEventTypeObj = null;
                                    scope.pathFilter = '';
                                    break;

                                case 2:

                                    scope.menuPathArr.pop();
                                    scope.currentScriptObj = null;
                                    scope.highlightEvent(scope.events.broadcast);
                                    break;

                                case 3:
                                    scope.menuPathArr.pop();
                                    scope.currentPathObj = null;
                                    scope.pathFilter = '';
                                    scope.highlightCurrentServiceObj(scope.currentServiceObj);

                                    break;

                                case 4:

                                    // Two cases for 4-length. Check whether we are
                                    // at the end of the path, or there's one more 
                                    // level 
                                    if(scope.currentPathObj.events) {
                                        scope.menuPathArr.splice(2,2);
                                        scope.setPath(scope.cachePath.name, {verb: scope.cachePath.verbs});
                                    } else {
                                        scope.menuPathArr.pop();
                                        scope.currentScriptObj = null;
                                    }
                                    
                                    break;

                                case 5:
                                    scope.currentScriptObj = null;
                                    scope._setEventList(null, scope.cachePath.verb, scope.cachePath.events);
                                    scope.menuPathArr.pop();

                                    break;
                            }
                            break;

                        case 'sample-scripts':

                            scope.menuPathArr.pop();
                            scope.currentScriptObj = null;
                            scope.currentPathObj = null;
                            scope.currentServiceObj = null;
                            scope.currentEventTypeObj = null;

                            break;

                        default:

                    }
                };

                scope._jumpTo = function (index) {

                    while (scope.menuPathArr.length - 1 !== index) {
                        scope.menuBack();
                    }
                };

                scope._toggleMenu = function () {

                    scope.menuOpen = !scope.menuOpen;
                };

                scope.$broadcast('script:loaded:success');
            }
        }
    }])
    .directive('dfAceEditorScripting', ['INSTANCE_URL', 'MODSCRIPTING_ASSET_PATH', '$http', function (INSTANCE_URL, MODSCRIPTING_ASSET_PATH, $http) {

        return {
            restrict: 'E',
            scope: {
                currentEditObj: '=?',
                isClean: '=?',
                editor: '=?'
            },
            templateUrl: MODSCRIPTING_ASSET_PATH + 'views/df-ace-editor.html',
            link: function (scope, elem, attrs) {

                scope.backupDoc = '';

                // PRIVATE API
                scope._setEditorInactive = function (stateBool) {

                    if (stateBool) {

                        scope.editor.setOptions({
                            readOnly: true,
                            highlightActiveLine: false,
                            highlightGutterLine: false
                        })
                        scope.editor.renderer.$cursorLayer.element.style.opacity = 0;
                    } else {
                        scope.editor.setOptions({
                            readOnly: false,
                            highlightActiveLine: true,
                            highlightGutterLine: true
                        })
                        scope.editor.renderer.$cursorLayer.element.style.opacity = 100;
                    }
                };

                scope._loadEditor = function (contents, mode, inactive) {

                    inactive = inactive || false;

                    scope.editor = ace.edit('ide');

                    //scope.editor.setTheme("ace/theme/twilight");

                    if (mode) {
                        scope.editor.session.setMode("ace/mode/json");
                    } else {
                        scope.editor.session.setMode("ace/mode/javascript");
                    }

                    scope.backupDoc = angular.copy(contents);

                    scope._setEditorInactive(inactive);

                    scope.editor.session.setValue(contents);

                    scope.editor.focus();

                    scope.editor.on('input', function () {
                        scope.$apply(function () {
                            scope.isClean = scope.editor.session.getUndoManager().isClean();
                        });
                    });
                };

                // WATCHERS AND INIT
                var watchCurrentEditObj = scope.$watch('currentEditObj', function (newValue, oldValue) {

                    if (newValue === 'samples') return false;

                    if (!newValue === null || newValue === undefined) {
                        scope._loadEditor('', false, true);
                        return false;
                    }

                    scope._loadEditor(newValue, false, false);
                });

                scope.$on('$destroy', function (e) {

                    watchCurrentEditObj();
                });

            }
        }
    }]);
