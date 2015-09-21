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



angular.module('dfSwaggerEditor', ['ngRoute', 'dfUtility', 'dfApplication', 'dfHelp'])
    .constant('MOD_SWAGGER_EDITOR_ASSET_PATH', 'admin_components/adf-swagger-editor/')

    .run(['INSTANCE_URL', '$templateCache', function (INSTANCE_URL, $templateCache) {}])

    .directive('dfSwaggerEditorMain', ['MOD_SWAGGER_EDITOR_ASSET_PATH', '$timeout', function (MOD_SWAGGER_EDITOR_ASSET_PATH, $timeout) {


        return {
            restrict: "E",
            scope: false,
            templateUrl: MOD_SWAGGER_EDITOR_ASSET_PATH + 'views/main.html',
            link: function (scope, elem, attrs) {

                
                scope.swaggerFile = null;


                // PUBLIC API







                scope.$watch('service', function(newValue, oldValue) {

                    if (!newValue) return;

                    if (newValue.record.hasOwnProperty('service_doc_by_service_id')) {

                        scope.swaggerFile = angular.copy(angular.fromJson(newValue.record.service_doc_by_service_id[0].content));
                    }
                });

            }
        }
    }])

    .directive('dfSwaggerInfo', ['MOD_SWAGGER_EDITOR_ASSET_PATH', function (MOD_SWAGGER_EDITOR_ASSET_PATH) {


        return {
            restrict: "E",
            scope: false,
            templateUrl: MOD_SWAGGER_EDITOR_ASSET_PATH + 'views/df-swagger-info.html',
            link: function (scope, elem, attrs) {









            }
        }
    }])

    .directive('dfSwaggerProduceConsume', ['MOD_SWAGGER_EDITOR_ASSET_PATH', function (MOD_SWAGGER_EDITOR_ASSET_PATH) {


        return {
            restrict: "E",
            scope: false,
            templateUrl: MOD_SWAGGER_EDITOR_ASSET_PATH + 'views/df-swagger-produce-consume.html',
            link: function (scope, elem, attrs) {

                // represent our produce checkboxes
                scope.produceTypes = {

                    json: {
                        name: 'application/json',
                        label: 'JSON',
                        checked: false
                    },
                    xml:  {
                        name: 'application/xml',
                        label: 'XML',
                        checked: false
                    },
                    csv: {
                        name: 'application/csv',
                        label: 'CSV',
                        checked: false
                    }
                };

                // represent our consume checkboxes
                scope.consumeTypes = {

                    json: {
                        name: 'application/json',
                        label: 'JSON',
                        checked: false
                    },
                    xml:  {
                        name: 'application/xml',
                        label: 'XML',
                        checked: false
                    },
                    csv: {
                        name: 'application/csv',
                        label: 'CSV',
                        checked: false
                    }
                };

                // add and removes produce/consume types from our swagger object
                scope._typeAddRemove = function (type, model) {

                    var i = 0;

                    if (!type.checked) {

                        while (i < scope.swaggerFile[model].length) {

                            if (scope.swaggerFile[model][i] === type.name) {
                                scope.swaggerFile[model].splice(i, 1);
                                break;
                            }

                            i++
                        }
                    }
                    else {

                        scope.swaggerFile[model].push(type.name);
                    }
                }

                // watch for the swagger file to change
                scope.$watch('swaggerFile', function (newValue, oldValue) {

                    if (!newValue) return;

                    if (newValue.produces.length) {

                        // scope.produces = angular.copy(newValue.produces);

                        angular.forEach(newValue.produces, function (value) {

                            switch(value) {

                                case 'application/json':
                                    scope.produceTypes.json.checked = true;
                                    break;
                                case 'application/xml':
                                    scope.produceTypes.xml.checked = true;
                                    break;

                            }
                        })
                    }

                    if (newValue.consumes.length) {

                        // scope.consumes = angular.copy(newValue.consumes);

                        angular.forEach(newValue.consumes, function (value) {

                            switch(value) {

                                case 'application/json':
                                    scope.consumeTypes.json.checked = true;
                                    break;
                                case 'application/xml':
                                    scope.consumeTypes.xml.checked = true;
                                    break;

                            }
                        })
                    }
                })
            }
        }
    }])

    .directive('dfSwaggerApis', ['MOD_SWAGGER_EDITOR_ASSET_PATH', 'SwaggerFactory', 'SwaggerModels', function (MOD_SWAGGER_EDITOR_ASSET_PATH, SwaggerFactory, SwaggerModels) {


        return {
            restrict: "E",
            scope: {
                swaggerFile: '=?'
            },
            templateUrl: MOD_SWAGGER_EDITOR_ASSET_PATH + 'views/df-swagger-apis.html',
            link: function (scope, elem, attrs) {


                scope.apis = [];
                var counter = 0;



                scope.addApi = function() {

                    scope._addApi();
                };



                scope._addApi = function (apiData) {

                    apiData = apiData || null;


                    var _api = new SwaggerFactory('api', apiData);

                    _api.__dfUI.id = counter;

                    // scope.apis.push(_api);
                    scope.swaggerFile.apis.push(_api.record);

                    counter++;
                };



                scope.$watch('swaggerFile', function (newValue, oldValue) {

                    if (!newValue) return;


                    if (newValue.hasOwnProperty('apis')) {

                        scope.apis = [];
                        angular.forEach(newValue.apis, function (api) {

                            scope._addApi(api)
                        })
                    }

                    if (newValue.hasOwnProperty('models')) {

                        SwaggerModels.setModels(newValue.models);
                    }

                })
            }
        }
    }])

    .directive('dfSwaggerApi', ['MOD_SWAGGER_EDITOR_ASSET_PATH', 'SwaggerFactory', function (MOD_SWAGGER_EDITOR_ASSET_PATH, SwaggerFactory) {


        return {
            restrict: "E",
            scope: {
                api: '='
            },
            templateUrl: MOD_SWAGGER_EDITOR_ASSET_PATH + 'views/df-swagger-api.html',
            link: function (scope, elem, attrs) {


                scope.apiVisible = false;


                scope.toggleApi = function () {

                    scope._toggleApi();
                };



                scope._toggleApi = function () {

                    scope.apiVisible = !scope.apiVisible;
                }


            }
        }
    }])

    .directive('dfSwaggerOperations', ['MOD_SWAGGER_EDITOR_ASSET_PATH', 'SwaggerFactory', function (MOD_SWAGGER_EDITOR_ASSET_PATH, SwaggerFactory) {


        return {
            restrict: "E",
            scope: {
                operationsData: '=?'
            },
            templateUrl: MOD_SWAGGER_EDITOR_ASSET_PATH + 'views/df-swagger-operations.html',
            link: function (scope, elem, attrs) {


                scope.operations = [];

                scope.operationsVisible = false;


                scope.addOperation = function () {

                    scope._addOperation();
                };


                scope.toggleOperations = function () {


                    scope._toggleOperations();
                };


                scope._addOperation = function (operationData) {

                    operationData = operationData || null;

                    scope.operations.push(new SwaggerFactory('operation', operationData));
                };


                scope._toggleOperations = function () {

                    scope.operationsVisible = !scope.operationsVisible;
                };


                var watchOperationsData = scope.$watch('operationsData', function (newValue, oldValue) {

                    if (!newValue) return;

                    scope.operations = [];
                    angular.forEach(newValue, function (operation) {

                        scope._addOperation(operation);
                    });
                });


                scope.$on('$destroy', function (e) {

                    watchOperationsData();
                });

            }
        }
    }])

    .directive('dfSwaggerOperation', ['MOD_SWAGGER_EDITOR_ASSET_PATH','SwaggerModels', function (MOD_SWAGGER_EDITOR_ASSET_PATH, SwaggerModels) {


        return {
            restrict: "E",
            scope: {
                operation: '='
            },
            templateUrl: MOD_SWAGGER_EDITOR_ASSET_PATH + 'views/df-swagger-operation.html',
            link: function (scope, elem, attrs) {



                scope.methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "MERGE", "OPTIONS", "HEAD"];


                scope.models = SwaggerModels.getModels();

                scope.operationVisible = false;


                scope.toggleOperation = function () {


                    scope._toggleOperation();
                };


                scope._toggleOperation = function () {

                    scope.operationVisible = !scope.operationVisible;
                };


            }
        }
    }])

    .directive('dfSwaggerOperationProduceConsume', ['MOD_SWAGGER_EDITOR_ASSET_PATH', function (MOD_SWAGGER_EDITOR_ASSET_PATH) {

        return {
            restrict: "E",
            scope: {
                operation: '=?'
            },
            templateUrl: MOD_SWAGGER_EDITOR_ASSET_PATH + 'views/df-swagger-operation-produce-consume.html',
            link: function (scope, elem, attrs) {

                scope.produces = [];
                scope.consumes = [];

                scope.produceTypes = {

                    json: {
                        name: 'application/json',
                        label: 'JSON',
                        checked: false
                    },
                    xml:  {
                        name: 'application/xml',
                        label: 'XML',
                        checked: false
                    },
                    csv: {
                        name: 'application/csv',
                        label: 'CSV',
                        checked: false
                    }
                };

                scope.consumeTypes = {

                    json: {
                        name: 'application/json',
                        label: 'JSON',
                        checked: false
                    },
                    xml:  {
                        name: 'application/xml',
                        label: 'XML',
                        checked: false
                    },
                    csv: {
                        name: 'application/csv',
                        label: 'CSV',
                        checked: false
                    }
                };

                scope.$watch('operation', function (newValue, oldValue) {

                    if (!newValue) return;

                    if (newValue.hasOwnProperty('produces') && newValue.produces.length) {

                        // scope.produces = angular.copy(newValue.produces);

                        angular.forEach(newValue.produces, function (value) {


                            switch(value) {

                                case 'application/json':
                                    scope.produceTypes.json.checked = true;
                                    break;
                                case 'application/xml':
                                    scope.produceTypes.xml.checked = true;
                                    break;

                            }
                        })
                    }

                    if (newValue.hasOwnProperty('consumes') && newValue.consumes.length) {

                        // scope.consumes = angular.copy(newValue.consumes);

                        angular.forEach(newValue.consumes, function (value) {

                            switch(value) {

                                case 'application/json':
                                    scope.consumeTypes.json.checked = true;
                                    break;
                                case 'application/xml':
                                    scope.consumeTypes.xml.checked = true;
                                    break;

                            }
                        })
                    }
                })
            }
        }
    }])

    .directive('dfSwaggerResponseMessages', ['MOD_SWAGGER_EDITOR_ASSET_PATH', 'SwaggerFactory', function (MOD_SWAGGER_EDITOR_ASSET_PATH, SwaggerFactory) {


        return {
            restrict: "E",
            replace: true,
            scope: {
                respData: '=?'
            },
            templateUrl: MOD_SWAGGER_EDITOR_ASSET_PATH + 'views/df-swagger-response-messages.html',
            link: function (scope, elem, attrs) {


                scope.responseMessages = [];

                scope.responseMessagesVisible = false;

                scope.toggleResponseMessages = function () {

                    scope._toggleResponseMessages();
                };

                scope.addResponseMessage = function () {

                    scope._addResponseMessage();
                };


                scope._addResponseMessage = function (responseMessageData) {

                    responseMessageData = responseMessageData || null;

                    scope.responseMessages.push(new SwaggerFactory('response-message', responseMessageData));
                };

                scope._toggleResponseMessages = function () {

                    scope.responseMessagesVisible = !scope.responseMessagesVisible;
                };


                var watchResponseMessagesData = scope.$watch('respData', function (newValue, oldValue) {

                    if (!newValue) return;

                    angular.forEach(newValue, function (responseMessage) {

                        scope.responseMessages = [];
                        scope._addResponseMessage(responseMessage);
                    });

                });


                scope.$on('$destroy', function (e) {

                    watchResponseMessagesData();
                });

            }
        }
    }])

    .directive('dfSwaggerResponseMessage', ['MOD_SWAGGER_EDITOR_ASSET_PATH','SwaggerModels', function (MOD_SWAGGER_EDITOR_ASSET_PATH, SwaggerModels) {


        return {
            restrict: "E",
            scope: {
                respMessage: '='
            },
            templateUrl: MOD_SWAGGER_EDITOR_ASSET_PATH + 'views/df-swagger-response-message.html',
            link: function (scope, elem, attrs) {






            }
        }
    }])

    .directive('dfSwaggerParameters', ['MOD_SWAGGER_EDITOR_ASSET_PATH', 'SwaggerFactory', function (MOD_SWAGGER_EDITOR_ASSET_PATH, SwaggerFactory) {


        return {
            restrict: "E",
            scope: {
                parametersData: '=?'
            },
            templateUrl: MOD_SWAGGER_EDITOR_ASSET_PATH + 'views/df-swagger-parameters.html',
            link: function (scope, elem, attrs) {


                scope.parameters = [];

                scope.parametersVisible = false;

                scope.currentEditParameter = null;


                scope.editParameter = function (paramData) {

                    scope._editParameter(paramData);
                };

                scope.toggleParameters = function () {

                    scope._toggleParameters();
                };

                scope.addParameter = function () {

                    scope._addParameter();
                };



                scope._editParameter = function (paramData) {

                    scope.currentEditParameter = paramData;
                };

                scope._addParameter = function (parameterData) {

                    parameterData = parameterData || null;

                    scope.parameters.push(new SwaggerFactory('parameter', parameterData));
                };

                scope._toggleParameters = function () {

                    scope.parametersVisible = !scope.parametersVisible;
                };



                var watchParametersData = scope.$watch('parametersData', function (newValue, oldValue) {

                    if (!newValue) return;

                    scope.parameters = [];
                    angular.forEach(newValue, function (parameter) {

                        scope._addParameter(parameter);
                    });
                });


                scope.$on('$destroy', function (e) {

                    watchParametersData();
                });

            }
        }
    }])

    .directive('dfSwaggerParameter', ['MOD_SWAGGER_EDITOR_ASSET_PATH', 'SwaggerModels', '$compile', '$templateCache', function (MOD_SWAGGER_EDITOR_ASSET_PATH, SwaggerModels, $compile, $templateCache) {


        return {
            restrict: "E",
            scope: {
                parameter: '='
            },
            templateUrl: MOD_SWAGGER_EDITOR_ASSET_PATH + 'views/df-swagger-parameter.html',
            link: function (scope, elem, attrs) {

                // 2.0 Compliance
                // var additionalParamTypeFieldsElem = $(elem).find('.additional-param-type-fields');
                // var defaultParamValueFieldElem = $(elem).find('.additional-param-type-fields');


                var _types = [
                    {
                        record:
                        {
                            id: 'string'
                        }
                    },
                    {
                        record:
                        {
                            id: 'number'
                        }
                    },
                    {
                        record:
                        {
                            id: 'integer'
                        }
                    },
                    {
                        record:
                        {
                            id: 'boolean'
                        }
                    },
                    {
                        record:
                        {
                            id: 'array'
                        }
                    },
                    {
                        record:
                        {
                            id: 'file'
                        }
                    }
                ];

                scope.types  = null;

                scope.paramTypes = [

                    'query',
                    'path',
                    'header',
                    'form',
                    'body'
                ];

                // 2.0 Compliance
                scope.collectionFormats = [
                    'csv',
                    'ssv',
                    'tsv',
                    'pipes',
                    'multi'
                ];

                scope.parameterVisible = false;



                scope.toggleParameter = function () {

                    scope._toggleParameter();
                };


                scope._toggleParameter = function () {

                    scope.parameterVisible = !scope.parameterVisible;
                };



                var watchParameterParamType = scope.$watch('parameter.record.paramType', function (newValue, oldValue) {

                    if (newValue === 'body') {

                        scope.types = SwaggerModels.getModels();
                        return;
                    }


                    scope.types = _types;

                });


                scope.$on('$destroy', function (e) {})

            }
        }
    }])

    .directive('dfSwaggerModelEditor', ['MOD_SWAGGER_EDITOR_ASSET_PATH', 'SwaggerModels', 'dfNotify', function (MOD_SWAGGER_EDITOR_ASSET_PATH, SwaggerModels, dfNotify) {

        return {
            restrict: 'E',
            scope: {},
            templateUrl: MOD_SWAGGER_EDITOR_ASSET_PATH + 'views/df-swagger-model-editor.html',
            link: function (scope, elem, attrs) {


                scope.isEditorClean = true;
                scope.isEditable = true;
                scope.currentEditor = null;



                scope.models = SwaggerModels.getModels();

                scope.currentModel = null;


                scope.newModel = function () {

                    scope._newModel();
                }

                scope.loadModel = function (model) {

                    scope._loadModel(model);
                };

                scope.saveModel = function () {

                    scope._saveModel();
                };

                scope.deleteModel = function (model) {

                    if (dfNotify.confirm('Delete model: ' + model.record.id + ' ?')) {

                        scope._deleteModel(model);
                    }
                };



                scope._newModel = function () {

                    if (scope.isEditorClean) {
                        SwaggerModels.createModel();
                        scope._loadModel(scope.models[scope.models.length -1])
                    }
                    else {
                        if(dfNotify.confirm('You have unsaved changes that will be lost.  Continue?')){
                            SwaggerModels.createModel();
                            scope._loadModel(scope.models[scope.models.length -1])
                        }
                    }
                };

                scope._saveModel = function () {

                    scope.currentModel.record = angular.fromJson(scope.currentEditor.session.getValue());

                    var messageOptions = {
                        module: 'Dreamfactory Services Module',
                        type: 'success',
                        provider: 'dreamfactory',
                        message: scope.currentModel.id + ' saved.'
                    };

                    dfNotify.success(messageOptions);
                };

                scope._loadModel = function (model) {

                    if (scope.isEditorClean) {
                        scope.currentModel = model;
                    }else {
                        if(dfNotify.confirm('You have unsaved changes that will be lost.  Continue?')){
                            scope.currentModel = model;
                        }
                    }
                };

                scope._deleteModel = function (model) {


                    var i = 0;

                    while (i < scope.models.length) {

                        if (scope.models[i].__dfUI.uniqueId === model.__dfUI.uniqueId) {

                            scope.models.splice(i, 1);
                        }

                        i++
                    }
                }
            }
        }

    }])

    .directive('dfSwaggerFileEditor', ['MOD_SWAGGER_EDITOR_ASSET_PATH', 'dfNotify', function (MOD_SWAGGER_EDITOR_ASSET_PATH,  dfNotify) {

        return {
            restrict: 'E',
            scope: {
                swaggerFile: '=?'
            },
            templateUrl: MOD_SWAGGER_EDITOR_ASSET_PATH + 'views/df-swagger-file-editor.html',
            link: function (scope, elem, attrs) {



                scope.isEditorClean = true;
                scope.isEditable = true;
                scope.currentEditor = null;


                scope.currentFile = null;


                scope.saveSwaggerFile = function () {

                    scope._saveSwaggerFile();
                };

                scope._saveSwaggerFile = function () {


                    if (scope.isEditorClean) {

                        dfNotify.error('Nothing to save');
                    }
                    else {

                        scope.swaggerFile = angular.fromJson(scope.currentEditor.session.getValue());
                    }
                };

                scope.$watch('swaggerFile', function (newValue, oldValue) {

                    if (!newValue) return;

                    scope.currentFile = newValue;

                }, true)
            }
        }
    }])

    .factory('SwaggerModels', [function () {


        var counter = 0;


        var Model = function (modelData) {

            var _new = {
                id: 'NEW MODEL',
                properties: {}
            };

            modelData = modelData || _new;

            return {
                __dfUI: {
                    uniqueId: counter++
                },
                record: angular.copy(modelData),
                recordCopy: angular.copy(modelData)
            }
        };

        var _models = [];

        return {

            getModels: function () {

                return _models;
            },

            setModels: function (modelDataObj) {

                angular.forEach(modelDataObj, function(modelData) {

                    _models.push(new Model(modelData));
                })
            },

            getModel: function (modelIdStr) {

                var i =0;

                while (i < _models.length) {

                    if (_models[i] === modelIdStr) {

                        return _models[i];
                    }

                    i++
                }

                return false;
            },

            createModel: function (modelData) {

                _models.push(new Model(modelData));
            },

            removeModel: function (modelIdStr) {

                var i = 0;

                while (i < _models.length) {

                    if (_models[i] === modelIdStr) {

                        _models.splice(i, 1);
                        return;
                    }

                    i++
                }

                return false;
            }
        }
    }])

    .factory('SwaggerFactory', [function() {


        return function(type, data) {


            var Api = function (apiData) {

                var _new = {
                    path: 'NEW API',
                    descriptions: null,
                    operations: []
                };

                apiData = apiData || _new;

                return {
                    __dfUI: {
                        id: null
                    },
                    record: angular.copy(apiData),
                    recordCopy: angular.copy(apiData)
                }
            };

            var Operation = function (operationData) {

                var _new = {
                    method: "GET",
                    summary: null,
                    nickname: 'NEW OPERATION',
                    produces: [],
                    consumes: [],
                    notes: null,
                    type: null,
                    event_name: [],
                    responseMessages: []
                };

                operationData = operationData || _new;

                return {
                    __dfUI: {
                        id: null
                    },
                    record: angular.copy(operationData),
                    recordCopy: angular.copy(operationData)
                }
            };
            
            var ResponseMessage = function (responseMessageData) {
                
                var _new = {
                    code: null,
                    message: null
                }
                
                responseMessageData = responseMessageData || _new;
                
                return {
                    __dfUI: {
                        
                    },
                    record: angular.copy(responseMessageData),
                    recordCopy: angular.copy(responseMessageData)
                }  
            }

            var Parameter = function (paramsData) {

                var _new = {
                    name: "NEW PARAM",
                    description: null,
                    allowMultiple: false,
                    type: 'string',
                    format: null,
                    paramType: 'query',
                    required: false,
                    default: null
                };

                paramsData = paramsData || _new;

                return {
                    record: angular.copy(paramsData),
                    recordCopy: angular.copy(paramsData)
                }
            };


            switch(type) {
                case 'api':
                    return new Api(data);

                case 'operation':
                    return new Operation(data);

                case 'response-message':
                    return new ResponseMessage(data);

                case 'parameter':
                    return new Parameter(data);

            }
        }
    }])



