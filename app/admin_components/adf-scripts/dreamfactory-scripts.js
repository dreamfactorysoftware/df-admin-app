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
    .run(['DSP_URL', '$http', function (DSP_URL, $http) {

    }])
    .controller('ScriptsCtrl', ['DSP_URL', 'SystemConfigDataService', '$scope', '$http', 'dfApplicationData', 'dfNotify', 'MODSCRIPTING_EXAMPLES_PATH',
        function(DSP_URL, SystemConfigDataService, $scope, $http, dfApplicationData, dfNotify, MODSCRIPTING_EXAMPLES_PATH) {

            $scope.$parent.title = 'Scripts';

            // Loosely defined script object for when a script is non-existent.
            var ScriptObj = function (scriptId, isCustomScript, scriptLanguage, scriptData) {

                return {
                    script_id: scriptId,
                    is_user_script: isCustomScript || false,
                    language: scriptLanguage || 'js',
                    script_body: scriptData || '',
                    __newScript: true
                }
            };

            $scope.__getDataFromHttpResponse = function (httpResponseObj) {

                if (!httpResponseObj) return [];

                if (httpResponseObj.hasOwnProperty('data')) {

                    if (httpResponseObj.data.hasOwnProperty('record')) {

                        return httpResponseObj.data.record;

                    }else if (httpResponseObj.data.hasOwnProperty('resource')) {

                        return httpResponseObj.data.resource;

                    }else {

                        return httpResponseObj.data;
                    }
                }else {

                }
            };

            $scope.isHostedSystem = false; // SystemConfigDataService.getSystemConfig().is_hosted;


            // Array containing data that describes the scripting types.
            $scope.scriptTypes = [

                {
                    name: 'event-scripts',
                    label: 'Event Scripts'
                },
                {
                    name: 'custom-scripts',
                    label: "Custom Scripts"
                }
            ];

            // Sample Scripts
            $scope.samplesScripts = null;
            // $scope.sampleScripts = new ScriptObj('sample-scripts', false, null, getSampleScripts.data);

            // All these vars pertain to building of events dynamically on the client
            $scope.events = dfApplicationData.getApiData('event');
            $scope.builtEventsList = {};
            $scope.staticEventName = 'static';
            $scope.preprocessEventName = "pre_process";
            $scope.postprocessEventName = "post_process";
            $scope.staticEventsOn = false;
            $scope.preprocessEventsOn = true;
            $scope.postprocessEventsOn = true;
            $scope.uppercaseVerbs = false;
            $scope.uppercaseVerbLabels = true;
            $scope.allowedVerbs = ['get', 'post', 'put', 'patch', 'delete', 'merge']

            // Keep track of what's going on in the module
            $scope.currentScriptTypeObj = null;
            $scope.currentEventObj = null;
            $scope.currentPathObj = null;
            $scope.currentScriptObj = null;

            // Keep track of custom scripts
            $scope.isCustomScript = false;
            $scope.customScripts = [];

            // Stuff for the editor
            $scope.editor = null;
            $scope.isEditorClean = true;


            // PUBLIC API
            $scope.setScriptType = function (typeObj) {

                $scope._setScriptType(typeObj);
            };

            $scope.setEvent = function (eventObj) {

                $scope._setEvent(eventObj);
            };

            $scope.setPathObj = function (pathObj) {

                $scope._setPathObj(pathObj);
            };

            $scope.setScript = function (scriptIdStr) {

                $scope._setScript(scriptIdStr);
            };

            $scope.saveScript = function () {

                $scope._saveScript();
            };

            $scope.deleteScript = function () {

                if (dfNotify.confirm('Delete ' +  $scope.currentScriptObj.script_id + '?')) {

                    $scope._deleteScript();
                }
            };

            $scope.loadSamples = function () {

                $scope._loadSamples();
            };



            // PRIVATE API

            // Dynamically create event names on the client because no one thought it
            // would be a good idea to build that list on the server and send it on a GET /api/v2/script
            $scope._createEvents = function(event, associatedData) {

                // returns an empty Path Object
                function PathObj() {

                    return {
                        path: null,
                        verbs: []
                    }
                }

                // returns an empty Verb Object
                function VerbObj() {

                    return {
                        event: [],
                        type: null
                    };
                }

                // builds a Verb Object
                function buildVerbObj(eventName, pathRefName, verb, operation, includeVerbInFileName) {

                    includeVerbInFileName = includeVerbInFileName || false;


                    var nvo = new VerbObj(),
                        eventString;

                    eventString = eventName ? eventName + '.' : '';
                    eventString += pathRefName ? pathRefName + '.' : '';
                    eventString += includeVerbInFileName ? verb + '.' : '';
                    eventString += operation ? operation : '';

                    nvo.event.push(eventString);

                    nvo.type = verb;

                    return nvo;
                }

                // Are we dealing with a table
                function isTable() {

                    return event.paths[1].path.indexOf("table_name") != '-1';
                }

                // Are we dealing with a container
                function isContainer() {

                    return event.paths[1].path.indexOf("container") != '-1';
                }

                // change verbs to uppercase

                if ($scope.uppercaseVerbs) {
                    angular.forEach(event.paths[0].verbs, function(verb) {
                        verb.type = verb.type.toUpperCase();
                    });
                }


                // Is this a database service
                if (isTable() || isContainer()) {

                    // place to store static events
                    var staticEvents;

                    // Loop through the associated data (tables returned from 'GET' on the service name)
                    angular.forEach(associatedData, function(pathRef) {

                        // Set our staticEvents empty
                        staticEvents = [];

                        // Create a new empty Path Object
                        var npo = new PathObj();

                        // Set the path in the Path Obj
                        npo.path = '/' + event.name + '/' + pathRef.name;

                        // Store the verbs from the associated data. if !associatedData assign array.
                        var verbs;
                        if ($scope.uppercaseVerbs) {

                            verbs = pathRef.access || ['GET', 'POST', 'PATCH', 'DELETE'];

                        }else {

                            angular.forEach(pathRef.access, function (verb, index) {
                                pathRef.access[index] = verb.toLowerCase();
                            });

                            verbs = pathRef.access || ['get', 'post', 'patch', 'delete'];
                        }

                        var allowedVerbs = [];

                        angular.forEach(verbs, function (verb) {

                            var i = 0;

                            while (i < $scope.allowedVerbs.length) {

                                if (verb.toLowerCase() === $scope.allowedVerbs[i]) {

                                    allowedVerbs.push(verb);
                                }

                                i++
                            }
                        });

                        verbs = allowedVerbs;



                        // Loop through the verbs and create Verb Objects
                        angular.forEach(verbs, function (verb, index) {

                            // Do we want static events
                            if ($scope.staticEventsOn) {

                                // What verb are we dealing with
                                switch (verb) {

                                    case "GET":
                                    case "get":

                                        // build Verb Object and store in static events
                                        staticEvents.push(buildVerbObj(event.name, pathRef.name, verb, 'select'));
                                        break;

                                    case "POST":
                                    case "post":

                                        // SAO
                                        staticEvents.push(buildVerbObj(event.name, pathRef.name, verb, 'insert'));
                                        break;

                                    case "PUT":
                                    case "put":

                                        // SAO
                                        staticEvents.push(buildVerbObj(event.name, pathRef.name, verb, 'update'));
                                        break;

                                    case "PATCH":
                                    case "patch":
                                        // SAO
                                        staticEvents.push(buildVerbObj(event.name, pathRef.name, verb, 'update'));
                                        break;

                                    case "MERGE":
                                    case "merge":

                                        // No support for a static merge event at this time
                                        break;

                                    case "DELETE":
                                    case "delete":
                                        // SAO
                                        staticEvents.push(buildVerbObj(event.name, pathRef.name, verb, 'delete'));
                                        break;
                                }
                            }

                            // Do we want pre-process events
                            if ($scope.preprocessEventsOn) {

                                // Yep.  Build Verb Object and store in our Path Object verbs array
                                npo.verbs.push(buildVerbObj(event.name, pathRef.name, verb, $scope.preprocessEventName, true))
                            }

                            // Do we want post-process events
                            if ($scope.postprocessEventsOn) {

                                // Yep.  Build Verb Object and store in our Path Object verbs array
                                npo.verbs.push(buildVerbObj(event.name, pathRef.name, verb, $scope.postprocessEventName, true))
                            }

                        });

                        // Do we want static events
                        if ($scope.staticEventsOn) {

                            // Yes.  Loop through the array
                            // array reverse to get events in proper order
                            angular.forEach(staticEvents.reverse(), function(event) {

                                // put events at the front of the verbs array in the Path Object
                                npo.verbs.unshift(event);
                            })
                        }

                        // push our Path Object back to our event
                        event.paths.push(npo);
                    });

                }

                else {
                    angular.forEach(event.paths, function (pathRef) {

                        var pathName = pathRef.path.split('/')[2];

                        angular.forEach(pathRef.verbs, function (verb) {

                            if ($scope.uppercaseVerbs) {
                                verb.type = verb.type.toUpperCase();
                            }

                            // Do we want pre-process events
                            if ($scope.preprocessEventsOn) {

                                // Yep.  Build Verb Object and store in our Path Object verbs array
                                pathRef.verbs.push(buildVerbObj(event.name, pathName, verb.type, $scope.preprocessEventName, true))
                            }

                            // Do we want post-process events
                            if ($scope.postprocessEventsOn) {
                                // Yep.  Build Verb Object and store in our Path Object verbs array
                                pathRef.verbs.push(buildVerbObj(event.name, pathName, verb.type, $scope.postprocessEventName, true))
                            }
                        });
                    });
                }
            };

            // Retrieves associated path(s) data for an event
            $scope._getEventFromServer = function(requestDataObj) {


                return $http({
                    method: 'GET',
                    url: DSP_URL + '/api/v2/' + requestDataObj.eventName,
                    params: requestDataObj.params
                })

            };

            // Retrieves script object from server
            $scope._getScriptFromServer = function(requestDataObj) {

                return $http({
                    method: 'GET',
                    url: DSP_URL + '/api/v2/system/script/' + requestDataObj.script_id,
                    params: requestDataObj.params
                })
            };

            // Save script object to server
            $scope._saveScriptToServer = function(requestDataObj) {

                return $http({
                    method: 'PUT',
                    url: DSP_URL + '/api/v2/system/script/' + requestDataObj.script_id,
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    params: requestDataObj.params,
                    data: requestDataObj.data
                })
            };

            // Delete a script from the server
            $scope._deleteScriptFromServer = function(requestDataObj) {

                return $http({
                    method: 'DELETE',
                    url: DSP_URL + '/api/v2/system/script/' + requestDataObj.script_id,
                    params: requestDataObj.params
                })
            };

            // Check for event paths with {variable} in their path property
            $scope._isVariablePath = function (path) {

                return path.path.indexOf("}") != "-1";
            };

            // Resets everything.  Stepping backwards through menuBack() to get all
            // the checks.
            $scope._resetAll = function () {

                if ($scope.menuPathArr.length === 0) return false;

                while($scope.menuPathArr.length !== 0) {
                    $scope.menuBack();
                }
            };

            // check for extension.  Just JS right now
            $scope._checkExtension = function (idStr) {

                if (idStr.substr(idStr.length -3, 3) === '.js') {
                    return idStr.substr(0, idStr.length -3);
                }

                return idStr;
            };




            // COMPLEX IMPLEMENTATION

            $scope._setScriptType = function (typeObj) {

                $scope._resetAll();

                if (typeObj.name === 'custom-scripts') {

                    var requestDataObj = {
                        script_id: '',
                        params: {
                            include_user_scripts: true,
                            include_only_user_scripts: true
                        }
                    };

                    $scope._getScriptFromServer(requestDataObj).then(

                        function(result) {

                            $scope.customScripts = $scope.__getDataFromHttpResponse(result);
                            $scope.menuPathArr.push(typeObj.label);
                            $scope.currentScriptTypeObj = typeObj;
                            $scope.isCustomScript = true;
                            $scope.pathFilter = '';

                        },

                        function(reject) {

                            console.log(reject);
                        }

                    ).finally(
                            function() {

                                // console.log('Get Scripts Custom finally')
                            }
                        )
                }
                else {

                    $scope.menuPathArr.push(typeObj.label);
                    $scope.currentScriptTypeObj = typeObj;
                    $scope.pathFilter = '';

                }
            };

            $scope._setEvent = function (eventObj) {


                var requestDataObj = {
                    eventName: eventObj.name
                };

                // Check if we have already retrieved and built this events list
                if ($scope.builtEventsList.hasOwnProperty(eventObj.name) &&
                    $scope.builtEventsList[eventObj.name] == true) {

                    $scope.menuPathArr.push(eventObj.name);
                    $scope.currentEventObj = eventObj;
                    $scope.pathFilter = '';

                    return false;
                }


                // Get the event from the server
                $scope._getEventFromServer(requestDataObj).then(
                    function(result) {

                        $scope._createEvents(eventObj, $scope.__getDataFromHttpResponse(result));
                        $scope.menuPathArr.push(eventObj.name);
                        $scope.currentEventObj = eventObj;
                        $scope.pathFilter = '';

                        $scope.builtEventsList[eventObj.name] = true;

                    },
                    function(reject) {

                        throw {
                            module: 'Scripts',
                            type: 'error',
                            provider: 'dreamfactory',
                            exception: reject
                        }
                    }
                ).finally(
                        function() {

                            // console.log('Get Event finally.')
                        }
                    )
            };

            $scope._setPathObj = function (pathObj) {

                $scope.menuPathArr.push(pathObj.path);
                $scope.currentPathObj = pathObj;
                $scope.pathFilter = '';

            };

            $scope._setScript = function (scriptIdStr) {


                var requestDataObj = {

                    script_id: scriptIdStr,
                    params: {
                        is_user_script: $scope.isCustomScript,
                        include_script_body: true
                    }
                };

                $scope._getScriptFromServer(requestDataObj).then(
                    function(result) {

                        $scope.currentScriptObj = $scope.__getDataFromHttpResponse(result);
                        $scope.menuPathArr.push(scriptIdStr);
                    },

                    function(reject) {

                        $scope.currentScriptObj = new ScriptObj(scriptIdStr, $scope.isCustomScript, null, null);
                        $scope.menuPathArr.push(scriptIdStr);
                    }
                ).finally(
                        function() {
                            // console.log('get Script finally')
                        }
                    )
            };

            $scope._saveScript = function () {

                if (!$scope.currentScriptObj.script_id) {
                    alert('Please enter a script name.');
                    return false;
                }

                var requestDataObj = {

                    script_id: $scope._checkExtension($scope.currentScriptObj.script_id),
                    params: {
                        is_user_script: $scope.isCustomScript
                    },
                    data: {
                        post_body: $scope.editor.getValue() || ' '
                    }
                };

                $scope._saveScriptToServer(requestDataObj).then(
                    function(result) {

                        $scope.editor.session.getUndoManager().reset();
                        $scope.editor.session.getUndoManager().markClean();
                        $scope.isEditorClean = true;

                        // Is this a new custom script
                        if ($scope.currentScriptObj.__newScript) {
                            $scope.customScripts.push($scope.__getDataFromHttpResponse(result));
                        }

                        // Needs to be replaced with angular messaging
                        $(function(){
                            new PNotify({
                                title: 'Scripts',
                                type:  'success',
                                text:  'Script "' + $scope.currentScriptObj.script_id + '" saved successfully.'
                            });
                        });
                    },

                    function(reject) {

                        throw {
                            module: 'Scripts',
                            type: 'error',
                            provider: 'dreamfactory',
                            exception: reject
                        }
                    }
                ).finally(
                        function() {

                            // console.log('Script Save finally function.')
                        }
                    )
            };

            $scope._deleteScript = function () {

                var requestDataObj = {

                    script_id: $scope.currentScriptObj.script_id,
                    params: {
                        is_user_script: $scope.isCustomScript
                    }
                };

                $scope._deleteScriptFromServer(requestDataObj).then(
                    function(result) {

                        // Needs to be replaced with angular messaging
                        $(function(){
                            new PNotify({
                                title: 'Scripts',
                                type:  'success',
                                text:  'Script "' + $scope.currentScriptObj.script_id + '" deleted successfully.'
                            });
                        });


                        $scope.menuPathArr.pop();
                        $scope.currentScriptObj = null;
                        $scope.editor.session.getUndoManager().reset();
                        $scope.editor.session.getUndoManager().markClean();

                        if ($scope.isCustomScript) {

                            var _result = $scope.__getDataFromHttpResponse(result);

                            var found = false,
                                i = 0;

                            while(!found && i <= $scope.customScripts.length -1) {

                                if ($scope.customScripts[i].script_id === _result.script_id) {
                                    $scope.customScripts.splice(i, 1);
                                    found = true;
                                }

                                i++;
                            }
                        }
                    },

                    function(reject) {

                        throw {
                            module: 'Scripts',
                            type: 'error',
                            provider: 'dreamfactory',
                            exception: reject
                        }

                    }
                ).finally(
                        function() {

                        }
                    )

            };

            $scope._loadSamples = function () {

                $scope._resetAll();

                $http.get(MODSCRIPTING_EXAMPLES_PATH + 'example.scripts.js').then(
                    function(result) {

                        $scope.sampleScripts = new ScriptObj('sample-scripts', false, null, result.data);
                        $scope.currentScriptTypeObj = {name: 'sample-scripts', label: 'Sample Scripts'};
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
    .directive('scriptSidebarMenu', ['MODSCRIPTING_ASSET_PATH', function(MODSCRIPTING_ASSET_PATH) {

        return {

            restrict: 'E',
            scope: false,
            templateUrl: MODSCRIPTING_ASSET_PATH + 'views/script-sidebar-menu.html',
            link: function(scope, elem, attrs) {


                scope.menuOpen = true;
                scope.menuPathArr = [];

                scope.pathFilter = '';


                // PUBLIC API
                scope.toggleMenu = function () {

                    scope._toggleMenu();
                };

                scope.menuBack = function() {

                    // Check if we have chnaged the script
                    if (!scope.isEditorClean) {

                        // Script has been changed.  Confirm close.
                        if (!scope._confirmCloseScript()) {

                            return false;
                        }else {
                            scope.editor.session.getUndoManager().reset();
                            scope.editor.session.getUndoManager().markClean();
                            scope.isEditorClean = true;
                        }
                    }

                    scope._menuBack();
                };

                scope.jumpTo = function(index) {

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
                    if (!scope.currentScriptTypeObj) return false;


                    switch(scope.currentScriptTypeObj.name) {

                        case 'event-scripts':

                            switch(scope.menuPathArr.length) {

                                case 0:
                                    break;

                                case 1:

                                    scope.menuPathArr.pop();
                                    scope.currentScriptTypeObj = null;
                                    scope.pathFilter = '';

                                    break;

                                case 2:

                                    scope.menuPathArr.pop();
                                    scope.currentEventObj = null;
                                    scope.pathFilter = '';

                                    break

                                case 3:

                                    scope.menuPathArr.pop();
                                    scope.currentPathObj = null;
                                    scope.pathFilter = '';

                                    break;

                                case 4:

                                    scope.menuPathArr.pop();
                                    scope.currentScriptObj = null;
                            }
                            break;


                        case 'custom-scripts':


                            switch(scope.menuPathArr.length) {

                                case 0:
                                    break;

                                case 1:

                                    scope.menuPathArr.pop();
                                    scope.currentScriptTypeObj = null;
                                    scope.isCustomScript = false;
                                    scope.pathFilter = '';

                                    break;

                                case 2:

                                    scope.menuPathArr.pop();
                                    scope.currentScriptObj = null;
                                    break;
                            }
                            break;

                        case 'sample-scripts':

                            scope.menuPathArr.pop();
                            scope.currentScriptObj = null;
                            scope.currentPathObj = null;
                            scope.currentEventObj = null;
                            scope.currentScriptTypeObj = null;
                            scope.isCustomScript = false;

                            break;

                        default:

                    }
                };

                scope._jumpTo = function (index) {

                    while(scope.menuPathArr.length - 1 !== index) {
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
    .directive('dfAceEditorScripting', ['DSP_URL', 'MODSCRIPTING_ASSET_PATH', '$http', function (DSP_URL, MODSCRIPTING_ASSET_PATH, $http) {

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
                        scope.editor.renderer.$cursorLayer.element.style.opacity=0;
                    }else {
                        scope.editor.setOptions({
                            readOnly: false,
                            highlightActiveLine: true,
                            highlightGutterLine: true
                        })
                        scope.editor.renderer.$cursorLayer.element.style.opacity=100;
                    }
                };

                scope._loadEditor = function (contents, mode, inactive) {

                    inactive = inactive || false;

                    scope.editor = ace.edit('ide');

                    //scope.editor.setTheme("ace/theme/twilight");

                    if(mode){
                        scope.editor.session.setMode("ace/mode/json");
                    }else{
                        scope.editor.session.setMode("ace/mode/javascript");
                    }

                    scope.backupDoc = angular.copy(contents);

                    scope._setEditorInactive(inactive);

                    scope.editor.session.setValue(contents);

                    scope.editor.focus();

                    scope.editor.on('input', function() {
                        scope.$apply(function() {
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

                    scope._loadEditor (newValue, false, false);
                });

                scope.$on('$destroy', function(e) {

                    watchCurrentEditObj();
                });

            }
        }
    }]);
