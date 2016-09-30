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
    .controller('ScriptsCtrl', ['INSTANCE_URL', 'SystemConfigDataService', '$scope', '$rootScope', '$http', 'dfApplicationData', 'dfNotify', 'MODSCRIPTING_EXAMPLES_PATH',
        function (INSTANCE_URL, SystemConfigDataService, $scope, $rootScope, $http, dfApplicationData, dfNotify, MODSCRIPTING_EXAMPLES_PATH) {

            $scope.$parent.title = 'Scripts';
            $scope.sampleSelect = null;

            dfApplicationData.loadApi(['event', 'script_type']);

            $scope.serviceTypeConfig = 'scripts';

            // Loosely defined script object for when a script is non-existent.
            var ScriptObj = function (scriptId, scriptLanguage, scriptData) {

                return {
                    name: scriptId,
                    type: scriptLanguage || 'v8js',
                    content: scriptData || '',
                    is_active: false,
                    allow_event_modification: false,
                    __newScript: true
                }
            };

            $scope.scriptSamplesSelect = function (type) {
                $scope.sampleSelect = type;
                $scope._loadSampleScript(type);
            };

            $scope.highlightScript = function () {
                $http({
                    method: 'GET',
                    url: INSTANCE_URL + '/api/v2/system/event_script',
                    params: {
                        as_list: true
                    }
                }).then(function (result) {
                    $scope.highlightedEvents = result.data.resource;
                    $scope.events.$$isHighlighted = $scope.highlightEvent($scope.events);
                })
            };

            $scope.handleFiles = function (files) {
                if (!files)return;
                var file = files && files[0];
                if (file) {
                    var reader = new FileReader();
                    reader.readAsText(file, "UTF-8");
                    reader.onload = function (evt) {
                        $scope.currentScriptObj.content = evt.target.result;
                        $scope.$apply();
                    };
                    reader.onerror = function (evt) {
                        console.log('error')
                    }
                }
            };

            $scope.handleGitFiles = function (data) {

                if (!data)return;

                        $scope.currentScriptObj.content = data;
                        $scope.$apply();

            };


            $scope.githubModalShow = function () {

                $rootScope.$broadcast('githubShowModal', $scope.serviceTypeConfig);
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

            $scope.isHostedSystem = SystemConfigDataService.getSystemConfig().is_hosted;

            // Sample Scripts
            $scope.samplesScripts = null;
            // $scope.sampleScripts = new ScriptObj('sample-scripts', 'v8js', getSampleScripts.data);

            // All these vars pertain to building of events dynamically on the client
            if(dfApplicationData.getApiData('event') === undefined) {
                // All these vars pertain to building of events dynamically on the client
                dfApplicationData.getApiData('event', null, true).then(function (result) {
                    $scope.events = dfApplicationData.getApiData('event');
                    $scope.highlightScript();
                });
            }
            else {
                $scope.events = dfApplicationData.getApiData('event');
                $scope.highlightScript();
            }


            if(dfApplicationData.getApiData('script_type') === undefined) {
                // These values are used to build the script type dropdown
                dfApplicationData.getApiData('script_type', null, true).then(function (result) {
                  $scope.scriptTypes = dfApplicationData.getApiData('script_type');
                });
            }
            else {
                $scope.scriptTypes = dfApplicationData.getApiData('script_type');
            }

            $scope.uppercaseVerbLabels = true;
            $scope.allowedVerbs = ['get', 'post', 'put', 'patch', 'delete']

            $scope.allowedScriptFormats = ['js','php','py', 'txt'];

            // Keep track of what's going on in the module
            $scope.currentServiceObj = null;
            $scope.currentPathObj = null;
            $scope.currentScriptObj = null;

            // Stuff for the editor
            $scope.editor = null;
            $scope.isEditorClean = true;
            $scope.menuPathArr = [];

            // PUBLIC API
            $scope.setService = function (name, eventObj) {

                $scope._setService(name, eventObj);
            };

            $scope.setPath = function (name, pathObj) {

                $scope._setPath(name, pathObj);
            };

            $scope.setScript = function (scriptIdStr) {

                $scope._setScript(scriptIdStr);
            };

            $scope.setEventList = function (name, verb, verbs, events) {
                $scope.cachePath = { // Ugly, but needed for "back" functionality
                    verbs: $scope.currentPathObj.verbs,
                    name: $scope.currentPathObj.name
                }
                $scope._setEventList(name, verb, verbs, events);
            };

            $scope.clearEventList = function () {
                if ($scope.currentPathObj.events) {
                    $scope.cachePath.name = $scope.currentPathObj.name;
                    $scope.cachePath.verb = $scope.currentPathObj.verb;
                    $scope.cachePath.verbs = $scope.currentPathObj.verbs;
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
                    url: INSTANCE_URL + '/api/v2/system/event_script/' + requestDataObj.name,
                    params: requestDataObj.params
                })
            };

            // Save script object to server
            $scope._saveScriptToServer = function (requestDataObj) {

                return $http({
                    method: 'POST',
                    url: INSTANCE_URL + '/api/v2/system/event_script/' + requestDataObj.name,
                    params: requestDataObj.params,
                    data: requestDataObj.data
                }).then($scope.highlightScript);
            };

            // Delete a script from the server
            $scope._deleteScriptFromServer = function (requestDataObj) {

                return $http({
                    method: 'DELETE',
                    url: INSTANCE_URL + '/api/v2/system/event_script/' + requestDataObj.name,
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

                if ($scope.menuPathArr.length === 0 || !$scope.menuBack()) return false;

                while ($scope.menuPathArr.length !== 0) {
                    $scope._menuBack();
                }

                return true;
            };

            // COMPLEX IMPLEMENTATION

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

                $scope.menuPathArr = angular.copy([name]);
                $scope.currentServiceObj = {"name": name, "paths": eventObj};

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

            $scope._loadSampleScript = function (type) {

                var fileExt = '';
                var mode = '';

                switch (type) {
                    case 'node':
                        fileExt = 'node.js';
                        mode = 'javascript';
                        break;
                    case 'php':
                        fileExt = 'php';
                        mode = 'php';
                        break;
                    case 'python':
                        fileExt = 'py';
                        mode = 'python';
                        break;
                    case 'v8js':
                        fileExt = 'v8.js';
                        mode = 'javascript';
                        break;
                }

                var editor = ace.edit('ide_samples');

                editor.session.setMode({path: 'ace/mode/' + mode, inline: true});
                editor.setOptions({readOnly: true});

                $http.get(MODSCRIPTING_EXAMPLES_PATH + 'example.scripts.' + fileExt).then(
                    function (result) {
                        editor.session.setValue(result.data);
                    },
                    function (reject) {
                        dfNotify.error(reject)
                    }
                )
            }

            var constructPaths = function (name, verbList, parameter) {
                var newEventName;
                var newVerbList = angular.copy(verbList);
                if (name.indexOf("{") >= 0 && name.indexOf("}") >= 0) {
                    if (parameter) {
                        angular.forEach(verbList, function (eventArray, verbName) {
                            angular.forEach(parameter, function (paramArray, paramName) {
                                angular.forEach(paramArray, function (itemName, itemIndex) {
                                    angular.forEach(eventArray, function (eventName, eventIndex) {
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
                $scope.menuPathArr.push(name);

                var newVerbList = constructPaths(name, pathObj.verb, pathObj.parameter);

                $scope.currentPathObj = {"name": name, "verbs": newVerbList};
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

            $scope._setEventList = function (name, verb, verbs, events) {
                $scope.currentPathObj.name = name;
                $scope.currentPathObj.events = events;
                $scope.currentPathObj.verb = verb;
                $scope.currentPathObj.verbs = verbs;

                if (name) {
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
                        $scope.editor.session.setValue($scope.currentScriptObj.content);
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
                                text: 'Script deleted successfully.'
                            });
                        });

                        $scope._setEventList(null, $scope.cachePath.verb, $scope.cachePath.verbs, $scope.cachePath.events);
                        $scope.menuPathArr = $scope.menuPathArr.slice(0, $scope.menuPathArr.length - 1);
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

            $scope.menuOpen = true;

            // PUBLIC API
            $scope.toggleMenu = function () {

                $scope._toggleMenu();
            };

            $scope.menuBack = function () {

                // Check if we have chnaged the script
                if (!$scope.isEditorClean) {

                    // Script has been changed.  Confirm close.
                    if (!$scope._confirmCloseScript()) {

                        return false;
                    } else {
                        $scope.editor.session.getUndoManager().reset();
                        $scope.editor.session.getUndoManager().markClean();
                        $scope.isEditorClean = true;
                    }
                }

                $scope._menuBack();
                return true;
            };

            $scope.updateEditor = function (scriptType) {
                var mode = 'text';
                if (['nodejs', 'v8js'].indexOf(scriptType) !== -1) {
                    mode = 'javascript';
                } else if (scriptType) {
                    mode = scriptType;
                }
                ace.edit('ide').session.setMode('ace/mode/' + mode);
            }

            $scope.jumpTo = function (index) {

                $scope._jumpTo(index);
            };


            // PRIVATE API

            $scope._clearScriptEditor = function () {
                $scope.currentScriptObj = null;
                ace.edit('ide').session.setValue('');
            };

            // Confirm close with unsaved changes.
            $scope._confirmCloseScript = function () {

                return confirm('You have unsaved changes.  Close anyway?');
            };


            // COMPLEX IMPLEMENTATION
            $scope._menuBack = function () {

                switch ($scope.menuPathArr.length) {

                    case 0:
                        $scope.menuPathArr = $scope.menuPathArr.slice(0, $scope.menuPathArr.length - 1);
                        break;

                    case 1:
                        $scope.menuPathArr = $scope.menuPathArr.slice(0, $scope.menuPathArr.length - 1);
                        $scope.menuPathArr = [];
                        $scope.highlightEvent($scope.events);
                        break;

                    case 2:
                        $scope.menuPathArr = $scope.menuPathArr.slice(0, $scope.menuPathArr.length - 1);
                        $scope.highlightCurrentServiceObj($scope.currentServiceObj);
                        break;

                    case 3:
                        // Two cases for 4-length. Check whether we are
                        // at the end of the path, or there's one more
                        // level
                        if ($scope.currentPathObj.events) {
                            $scope.menuPathArr = $scope.menuPathArr.slice(0, $scope.menuPathArr.length - 2);
                            $scope.setPath($scope.cachePath.name, {verb: $scope.cachePath.verbs});
                            $scope._clearScriptEditor();
                        } else {
                          $scope.menuPathArr = $scope.menuPathArr.slice(0, $scope.menuPathArr.length - 1);
                        }

                        break;

                    case 4:
                        $scope._clearScriptEditor();
                        $scope.menuPathArr = $scope.menuPathArr.slice(0, $scope.menuPathArr.length - 2);
                        $scope._setEventList($scope.cachePath.name, $scope.cachePath.verb, $scope.cachePath.verbs, $scope.cachePath.events);
                        break;
                }
            };

            $scope._jumpTo = function (index) {

                while ($scope.menuPathArr.length - 1 !== index) {
                    $scope.menuBack();
                }
            };

            $scope._toggleMenu = function () {

                $scope.menuOpen = !scope.menuOpen;
            };

            $scope.$broadcast('script:loaded:success');


            // MESSAGES

            var watchGithubCredUser = $scope.$watch('githubModal.username', function (newValue, oldValue) {

                if (!newValue) return false;

                $scope.modalError = {
                    visible: false,
                    message: ''
                }
            });

            var watchGithubCredPass = $scope.$watch('githubModal.password', function (newValue, oldValue) {

                if (!newValue) return false;

                $scope.modalError = {
                    visible: false,
                    message: ''
                }
            });

            var watchGithubURL = $scope.$watch('githubModal.url', function (newValue, oldValue) {

                if (!newValue) return false;

                $scope.modalError = {
                    visible: false,
                    message: ''
                }

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
                        },
                    })
                    .then(function successCallback(response) {

                        $scope.githubModal.private = response.data.private;

                        $scope.modalError = {
                            visible: false,
                            message: ''
                        }
                    }, function errorCallback(response) {

                        if (response.status === 404) {
                            $scope.modalError = {
                                visible: true,
                                message: 'Error: The repository could not be found.'
                            }
                        }
                    });
                }
            });


            $scope.$on('$destroy', function (e) {

                watchGithubURL();
                watchGithubCredUser();
                watchGithubCredPass();
            });
        }])

    .directive('scriptSidebarMenu', ['MODSCRIPTING_ASSET_PATH', function (MODSCRIPTING_ASSET_PATH) {

        return {

            restrict: 'E',
            scope: false,
            templateUrl: MODSCRIPTING_ASSET_PATH + 'views/script-sidebar-menu.html',
            link: function (scope, elem, attrs) {


            }
        }
    }])

    .directive('dfAceSamplesSelect', ['INSTANCE_URL', 'MODSCRIPTING_ASSET_PATH', '$http', '$timeout', function (INSTANCE_URL, MODSCRIPTING_ASSET_PATH, $http, $timeout) {

        return {
            restrict: 'E',
            scope: {
                currentScript: '=?',
                isClean: '=?',
                viewer: '=?',
                scriptType: '=?'
            },
            templateUrl: MODSCRIPTING_ASSET_PATH + 'views/df-ace-samples.html',
            link: function (scope, elem, attrs) {
                scope.viewer = ace.edit('ide_samples');


            }
        }

    }])
    .directive('dfAceEditorScripting', ['INSTANCE_URL', 'MODSCRIPTING_ASSET_PATH', '$http', '$timeout', function (INSTANCE_URL, MODSCRIPTING_ASSET_PATH, $http, $timeout) {

        return {
            restrict: 'E',
            scope: {
                currentEditObj: '=?',
                isClean: '=?',
                editor: '=?',
                scriptType: '=?'
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
                    //scope.editor && scope.editor.destroy();

                    scope.editor = ace.edit('ide');

                    if (mode === true) {
                        mode = 'json';
                    } else if (scope.scriptType && ['nodejs', 'v8js'].indexOf(scope.scriptType) !== -1) {
                        mode = 'javascript';
                    } else if (scope.scriptType) {
                        mode = scope.scriptType;
                    } else {
                        mode = 'text';
                    }

                    scope.editor.session.setMode("ace/mode/" + mode);

                    scope.backupDoc = angular.copy(contents);

                    scope._setEditorInactive(inactive);

                    scope.editor.session.setValue(contents);

                    scope.editor.focus();

                    scope.editor.on('input', function () {

                        scope.$apply(function () {
                            scope.isClean = scope.editor.session.getUndoManager().isClean();
                        });
                    });

                    scope.editor.on('blur', function () {
                        scope.$apply(function () {
                            try {
                                scope.currentEditObj = scope.editor.getValue();
                            } catch (e) {
                            }
                        });
                    });
                };

                // WATCHERS AND INIT
                var watchCurrentEditObj = scope.$watch('currentEditObj', function (newValue, oldValue) {

                    if (newValue === 'samples') return false;

                    if (!newValue === null || newValue === undefined) {
                        //Empty editor
                        scope._loadEditor('', false, false);
                        return false;
                    }

                    //There is content to load
                    scope._loadEditor(newValue, false, false);
                });

                scope.$on('$destroy', function (e) {

                    watchCurrentEditObj();
                    scope.editor.destroy();
                });

            }
        }
    }]);
