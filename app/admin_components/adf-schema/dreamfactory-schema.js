'use strict';


angular.module('dfSchema', ['ngRoute', 'dfUtility'])
    .constant('MOD_SCHEMA_ROUTER_PATH', '/schema')
    .constant('MOD_SCHEMA_ASSET_PATH', 'admin_components/adf-schema/')
    .config(['$routeProvider', 'MOD_SCHEMA_ROUTER_PATH', 'MOD_SCHEMA_ASSET_PATH',
        function ($routeProvider, MOD_SCHEMA_ROUTER_PATH, MOD_SCHEMA_ASSET_PATH) {
            $routeProvider
                .when(MOD_SCHEMA_ROUTER_PATH, {
                    templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/main.html',
                    controller: 'SchemaCtrl',
                    resolve: {
                        checkUser:['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }])

    .run([function () {

    }])

    .factory('TableListService', ['INSTANCE_URL', '$q', '$timeout', 'dfApplicationData', 'StateService', 'dfNotify', function (INSTANCE_URL, $q, $timeout, dfApplicationData, StateService, dfNotify) {

        function getTableList (forceRefresh) {
            
            var deferred = $q.defer();
            var currentService = StateService.get('dfservice');

            if (!currentService) {
                return;
            }

            dfApplicationData.getServiceComponents(currentService.name, INSTANCE_URL.url + '/' + currentService.name + '/_schema', {
                params: {
                    refresh: true,
                    fields: 'name,label'
                }
            }, forceRefresh).then(
                function (result) {

                    // update service components
                    currentService.updateComponents(result);
                    StateService.set('dfservice', currentService);

                    // Build notification
                    var messageOptions = {
                        module: 'Schema',
                        type: 'success',
                        provider: 'dreamfactory',
                        message: currentService.label + ' is refreshed.'
                    };

                    // Send notification to user
                    if (forceRefresh) {
                        dfNotify.success(messageOptions);
                    }

                    deferred.resolve(currentService);
                },
                function (reject) {

                    var messageOptions = {
                        module: 'Schema',
                        type: 'error',
                        provider: 'dreamfactory',
                        message: reject
                    };

                    dfNotify.error(messageOptions);

                    deferred.reject();
                }
            );
            return deferred.promise;
          }

          return {
              getTableList: getTableList
          };
    }])

    .factory('Table', ['$q', '$http', 'INSTANCE_URL', 'dfNotify', function($q, $http, INSTANCE_URL, dfNotify) {
        function Table(tableData) {
            if (tableData) {
                this.setData(tableData);
            }
        }
        Table.prototype = {
            setData: function(tableData) {
                angular.extend(this, tableData);
            },
            delete: function(params) {

                  return $http.delete(INSTANCE_URL.url + '/' + params.service + '/_schema/' + params.table);
            },
            update: function(params) {

                return $http({
                  method: 'PATCH',
                  url: INSTANCE_URL.url + '/' + params.service + '/_schema/' + params.table,
                  data: this
                });
            },
            _saveField: function (params, fieldData) {

                var data = {
                    resource: [
                        fieldData.record
                    ]
                };

                var verb = fieldData.__dfUI.newField ? 'POST' : 'PATCH';

                return $http({
                  method: verb,
                  url: INSTANCE_URL.url + '/' + params.service + '/_schema/' + params.table + '/_field',
                  data: data
                });
            },
            _updateRelations: function (params) {


            }
        };
        return Table;
    }])


    .factory('tableManager', ['INSTANCE_URL', '$http', '$q', 'Table', 'StateService', 'dfNotify', 'TableObj', function(INSTANCE_URL, $http, $q, Table, StateService, dfNotify, TableObj) {
        var tableManager = {
            _pool: {},
            _retrieveInstance: function(tableName, tableData) {
                if (!tableName) {
                    return false;
                }
                var instance = this._pool[tableName];

                if (instance) {
                    instance.setData(tableData);
                } else {
                    instance = new Table(tableData);
                    this._pool[tableName] = instance;
                }

                return instance;
            },
            _search: function(tableName) {

                return this._pool[tableName];
            },
            _load: function(params, deferred) {
                var scope = this;
                var url = INSTANCE_URL.url + '/' + params.service + '/_schema/' + params.table + '?refresh=true';
                $http.get(url).then(function(response) {
                        var tableData = response.data;
                        var table = scope._retrieveInstance(tableData.name, tableData);
                        deferred.resolve(table);
                    }, function(reject) {
                        deferred.reject();
                    });
            },
            _delete: function(params) {

                return $http.delete(INSTANCE_URL.url + '/' + params.service.name + '/_schema/' + params.table);
            },
            _deleteField: function (params) {

                return $http.delete(INSTANCE_URL.url + '/' + params.service.name + '/_schema/' + params.table + '/_field/' + params.field);
            },
            _clearPool: function () {
                this._pool = {};
            },
            getTable: function(params) {
                var deferred = $q.defer();
                var table = this._search(params.table);

                if (table) {
                    deferred.resolve(table);
                } else {
                    this._load(params, deferred);
                }
                return deferred.promise;
            },
            loadAllTables: function(params) {
                var deferred = $q.defer();
                var scope = this;
                var url = INSTANCE_URL.url + '/' + params.service + '/_schema/' + params.table;
                $http.get(url).then(function(response) {
                        var tables;
                        var tablesArray = response.data;
                        if (Array.isArray(tablesArray)) {
                            tablesArray.forEach(function(tableData) {
                                var table = scope._retrieveInstance(tableData.name, tableData);
                                tables.push(table);
                            });
                        }
                        else {
                            tables = tablesArray;
                        }

                        deferred.resolve(tables);
                    }, function(reject) {
                        deferred.reject();
                    });
                return deferred.promise;
            },
            setTable: function(tableData, saveToServer) {

                var tableName = '';

                if (!tableData.hasOwnProperty('record')) {

                  tableName = tableData.name;
                }
                else {
                    if (tableData.__dfUI.newTable) {
                        tableName = '__new';
                    }
                    else {
                        tableName = tableData.record.name;
                    }

                }
                var scope = this;
                var table = this._search(tableName);

                if (!table && saveToServer) {

                    var param = {
                        resource: [
                            tableData
                        ]
                    };

                    return $http.post(INSTANCE_URL.url + '/' + StateService.get('dfservice').name + '/_schema?fields=*', param);
                } else {

                    if (table) {

                        table.setData(tableData);

                        if(saveToServer) {
                          return table.update({
                              service: StateService.get('dfservice').name,
                              table: tableName
                          });
                        }
                    } else {

                        table = scope._retrieveInstance(tableName, tableData.record);
                    }
                }

                return table;
            },

            setDat: function (tableData) {

                scope._retrieveInstance(tableData);
            },
            setField: function (tableName, fieldData, saveToServer) {

                var table = this._search(tableName);

                if (table !== undefined) {

                    var index = table.field.findIndex(function (obj) {
                        return obj.name == fieldData.record.name;
                    });

                    if (index < 0) {

                        table.field.push(fieldData.record)
                    }
                    else {

                        table.field[index] = fieldData.record;
                    }

                    table.field[index] = fieldData.record;

                    table.setData(table);

                    if (saveToServer) {

                        var params = {
                            service: StateService.get('dfservice').name,
                            table: tableName
                        };

                        return table._saveField(params, fieldData);
                    }
                }
                else {
                    return;
                }
            },

            getField: function (fieldName, tableName) {

              var table = this._search(tableName);

              if (table.hasOwnProperty('field')) {

                  var index = table.field.findIndex(function (obj) {
                      return obj.name == fieldName;
                  });

                  if (index > -1) {
                      return table.field[index];
                  }
                  else {
                      return undefined;
                  }
              }

              return null;
            },
            deleteField: function (params) {

                return this._deleteField(params);
            },
            deleteTable: function(params) {

                return this._delete(params);
            },



            _saveRelation: function (params, relationData) {

                var data = {
                    resource: [
                        relationData.record
                    ]
                };

                if (relationData.__dfUI.newRelation) {
                    return $http.post(INSTANCE_URL.url + '/' + params.service + '/_schema/' + params.table + '/_related', data);
                }
                else {

                    return $http({
                      method: 'PATCH',
                      url: INSTANCE_URL.url + '/' + params.service + '/_schema/' + params.table + '/_related',
                      data: data
                    });
                }
            },
            saveRelation: function (params, relationData) {

              return this._saveRelation(params, relationData);
            },



            _deleteRelation: function (params) {

                return $http.delete(INSTANCE_URL.url + '/' + params.service + '/_schema/' + params.table + '/_related/' + params.relation);
            },
            deleteRelation: function (params) {

              return this._deleteRelation(params);
            },



            updateRelations: function (params) {

                var table = this._search(params.table);
                var url = INSTANCE_URL.url + '/' + params.service.name + '/_schema/' + params.table + '/_related';
                return $http.get(url).then(function(response) {

                        var relationData = response.data;
                        table.related = relationData.resource;
                        table.setData(table);
                    }, function(reject) {

                    });

            },
            clearPool: function() {
                this._clearPool();
            }
        };

        return tableManager;
    }])

    .service('StateService', function () {

        var selectedService = {};

        function get (state) {

            if (selectedService.hasOwnProperty(state)) {
                return selectedService[state];
            }
        }

        function set (state, value) {

            selectedService[state] = value;
        }

        return {
            get: get,
            set: set
        };

    })

    .service('ServiceModel', function () {

        function getSchemaComponents(array) {

            var service = [];

            angular.forEach(array, function (component) {

                // setup object to be pushed onto services
                var componentObj = {
                    __dfUI: {
                        newTable: false
                    },
                    name: component.name,
                    label: component.label
                };

                service.push(componentObj);
            });

            return service;
        }

        return function (schemaData) {

            return {
                __dfUI: {
                    unfolded: false
                },
                name: schemaData.name,
                label: schemaData.label,
                components: getSchemaComponents(schemaData.components),
                updateComponents: function (array) {

                    this.components = getSchemaComponents(array);
                }
            };
        };
    })

    .service('TableObj', function () {

        return function (tableObj, currentService) {

            var _new = {
                alias: null,
                description: null,
                name: null,
                label: null,
                plural: null,
                primary_key: null,
                name_field: null,
                is_view: false,
                related: [],
                field: []
            };

            var newTable = !tableObj ? true : false;

            tableObj = tableObj || _new;

            return {
                __dfUI: {
                    newTable: newTable
                },
                record: tableObj,
                recordCopy: angular.copy(tableObj)
          };
        };
    })

    .service('FieldObj', function () {

        return function (fieldData1) {

          var _new = {
              allow_null: false,
              auto_increment: false,
              db_function: null,
              db_type: null,
              default: null,
              fixed_length: false,
              is_aggregate: false,
              is_foreign_key: false,
              is_primary_key: false,
              is_unique: false,
              is_virtual: false,
              label: null,
              length: null,
              name: null,
              picklist: null,
              precision: null,
              ref_field: '',
              ref_table: '',
              required: false,
              scale: 0,
              supports_multibyte: false,
              type: null,
              validation: null,
              value: []
          };

          var _newField = !fieldData1 ? true : false;

          fieldData1 = fieldData1 || _new;


            return {
                __dfUI: {
                    newField: _newField
                },
                record: fieldData1,
                recordCopy: angular.copy(fieldData1),
          };
        };
    })


    .service('RelationObj', function () {

        return function (RelationObj) {

          var _new = {
              alias: null,
              always_fetch: false,
              description: null,
              field: null,
              is_virtual: true,
              junction_field: null,
              junction_ref_field: null,
              junction_service_id: null,
              junction_table: null,
              label: null,
              name: null,
              ref_field: null,
              ref_service_id: null,
              ref_table: null,
              type: null
          };

          var _newRelation = !RelationObj ? true : false;

          RelationObj = RelationObj || _new;


            return {
                __dfUI: {
                    newRelation: _newRelation
                },
                record: RelationObj,
                recordCopy: angular.copy(RelationObj)
            };
        };
    })


    .service('TableDataModel', function () {

        this.model = null;

        this.setTableModel = function(data) {
            this.model = data;
        };

        this.setTableModel = function(data) {
            this.model = data;
        };

        this.updateTableModel = function(data) {
            this.model = data;
        };

        this.deleteTableModel = function() {

            this.model = null;
        };
    })

    .service('NavigationService', function () {

        var steps = [
            'root',
            'upload',
            'create',
            'edit'
        ];

        // Setting initial step to create, assuming no table is selected
        this.currentStep = null;


        function getStep () {

            return this.currentStep;
        }

        function setStep (step) {

            this.currentStep = step;
        }

        function nextStep () {

        }

        function previousStep () {

        }

        return {
            getStep: getStep,
            setStep: setStep,
            nextStep: nextStep,
            previousStep: previousStep
        };

    })


    .service('FieldOptions', function () {

        this.typeOptions = [
            {name: "I will manually enter a type", value: ""},
            {name: "id", value: "id"},
            {name: "string", value: "string"},
            {name: "integer", value: "integer"},
            {name: "text", value: "text"},
            {name: "boolean", value: "boolean"},
            {name: "binary", value: "binary"},
            {name: "float", value: "float"},
            {name: "double", value: "double"},
            {name: "decimal", value: "decimal"},
            {name: "datetime", value: "datetime"},
            {name: "date", value: "date"},
            {name: "time", value: "time"},
            {name: "reference", value: "reference"},
            {name: "user_id", value: "user_id"},
            {name: "user_id_on_create", value: "user_id_on_create"},
            {name: "user_id_on_update", value: "user_id_on_update"},
            {name: "timestamp", value: "timestamp"},
            {name: "timestamp_on_create", value: "timestamp_on_create"},
            {name: "timestamp_on_update", value: "timestamp_on_update"}
        ];

        this.returnTypeOptions = [
            {name: "string", value: "string"},
            {name: "integer", value: "integer"},
            {name: "boolean", value: "boolean"},
            {name: "binary", value: "binary"},
            {name: "float", value: "float"},
            {name: "double", value: "double"},
            {name: "decimal", value: "decimal"}
        ];

        this.helpText = {
            name: {
                title: 'Name',
                text: 'The field name used by the API.'
            },
            alias: {
                title: 'Alias',
                text: 'If set, the alias is used in table access instead of the name.'
            },
            label: {
                title: 'Label',
                text: 'A displayable name used by clients.'
            },
            type: {
                title: 'Type',
                text: 'This is a simplified DreamFactory type.'
            },
            database_type: {
                title: 'Database Type',
                text: 'If necessary, enter a type acceptable to the underlying database.'
            },
            db_function: {
                title: 'DB Function',
                text: 'Enter valid syntax for a database function supported by this database vendor, like upper(fieldname), max(fieldname) or concat(field1, \'.\', field2), to apply to this field for various operations. See <a href="http://wiki.dreamfactory.com/DreamFactory/Features/Database/Schema#Database_Functions" target="_blank">here</a> for more info.'
            },
            validation: {
                title: 'Validation',
                text: 'A JSON object detailing required validations, if any. See <a href="http://wiki.dreamfactory.com/DreamFactory/Features/Database/Schema#Validations" target="_blank">here</a> for more info.'
            },
            'aggregate_db_unction': {
                title: 'Aggregate DB Function',
                text: 'Supported DB functions to apply to this field. See <a href="http://wiki.dreamfactory.com/DreamFactory/Features/Database/Schema#Database_Functions" target="_blank">here</a> for more info.'
            }
        };

    })

    .service('SchemaJSONData', function () {

        this.schemaJSON = {
            "resource": [
                {
                    "name": "todo",
                    "label": "Todo",
                    "plural": "Todos",
                    "alias": null,
                    "field": [
                        {
                            "name": "id",
                            "label": "Id",
                            "type": "id"
                        },
                        {
                            "name": "name",
                            "label": "Name",
                            "type": "string",
                            "size": 80,
                            "allow_null": false
                        },
                        {
                            "name": "complete",
                            "label": "Complete",
                            "type": "boolean",
                            "default": false
                        }
                    ]
                }
            ]
        };
    })

    .controller('SchemaCtrl', ['$scope', 'dfApplicationData', 'ServiceModel', 'dfNotify', '$location',  function ($scope, dfApplicationData, ServiceModel, dfNotify, $location) {

        // Set Title in parent
        $scope.$parent.title = 'Schema';
        
        // Set module links
        $scope.links = [
            {
                name: 'manage-schema',
                label: 'Manage',
                path: 'manage-schema'
            }
        ];

        $scope.currentService = null;
        $scope.currentTable = null;
        $scope.lastTable = '';

        // WATCHERS
        var watchServices = $scope.$watchCollection('apiData.service_list', function (newValue, oldValue) {
            
            if (newValue) {
                var tempObj = {};

                angular.forEach(newValue, function (service) {

                    tempObj[service.name] = new ServiceModel(service);
                });

                $scope.schemaManagerData = tempObj;
            }
        });
        
        // MESSAGES
        $scope.$on('$destroy', function (e) {

            watchServices();
        });

        $scope.$on('refresh:table', function (e, resource) {

            //$scope.refreshService(true);
        });

        $scope.$on('update:components', function (e, resource) {

            $scope.currentService.components.push({
                __dfUI: {
                    newTable: false
                },
                name: resource.name,
                label: resource.label
            });

            // This doesn't update the field properly
            // @TODO: Make this work.
            $scope.currentTable = $scope.currentService.components[$scope.currentService.components.length - 1].name;
        });


        // HELP
        $scope.dfLargeHelp = {
            manageSchema: {
                title: 'Schema Manager Overview',
                text: 'Choose a database service from the list to view or edit the schema. ' +
                'You can create a new database service in the Services section of this Admin Console.'
            }
        };

        // load data

        $scope.apiData = null;

        $scope.loadTabData = function() {

            $scope.dataLoading = true;

            var apis = ['service_list'];

            dfApplicationData.getApiData(apis).then(
                function (response) {
                    var newApiData = {};
                    apis.forEach(function(value, index) {
                        newApiData[value] = response[index].resource ? response[index].resource : response[index];
                        if (value === 'service_list') {
                            newApiData[value] = newApiData[value].filter(function(obj) {
                                return ['mysql','pgsql','sqlite','sqlsrv','sqlanywhere','oracle','ibmdb2','informix','firebird','aws_redshift_db','mongodb'].indexOf(obj.type) >= 0;
                            });
                        }
                    });
                    $scope.apiData = newApiData;
                },
                function (error) {
                    var messageOptions = {
                        module: 'Schema',
                        provider: 'dreamfactory',
                        type: 'error',
                        message: 'There was an error loading the Schema tab. Please try refreshing your browser and logging in again.'
                    };
                    dfNotify.error(messageOptions);
                }
            ).finally(function () {
                $scope.dataLoading = false;
            });
        };

        $scope.loadTabData();
    }])

    .directive('dfSchemaLoading', [function() {
        return {
            restrict: 'E',
            template: "<div class='col-lg-12' ng-if='dataLoading'><span style='display: block; width: 100%; text-align: center; color: #A0A0A0; font-size: 50px; margin-top: 100px'><i class='fa fa-refresh fa-spin'></i></div>"
        };
    }])

    .directive('dfTableTemplate', ['MOD_SCHEMA_ASSET_PATH', '$q', '$timeout', 'NavigationService', 'Table', 'TableDataModel', 'FieldObj', 'RelationObj', 'StateService', 'tableManager', function (MOD_SCHEMA_ASSET_PATH, $q, $timeout, NavigationService, Table, TableDataModel, FieldObj, RelationObj, StateService, tableManager) {

        return {
            restrict: 'E',
            scope: {
                tableData: '=',
                apiData: '='
            },
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-table-template.html',
            transclude: true,
            controllerAs: 'ctrl',
            controller: ['$scope', function TemplateCtrl ($scope) {

                $scope.selView = 'empty';
                this.selectedView = 'empty';

                var ctrl = this;
                ctrl.childCtrl = [];
                ctrl.register = register;
                ctrl.$onDestroy = onDestroy;

                function register(child, childCtrl) {
                  ctrl.childCtrl[child] = childCtrl;
                }

                function unregister(childCtrl) {
                  ctrl.childCtrl = ctrl.childCtrl.filter(function(registeredChildCtrl) {
                    return registeredChildCtrl !== childCtrl;
                  });
                }

                function onDestroy() {
                  ctrl.childCtrl.length = 0;
                }
            }],

            link: function (scope, elem, attrs, ctrl) {


                scope.$on('reload', function(event, args) {
                    scope.selView = 'empty';
                });




                scope.$on('table', function(event, args) {

                    switch (args.notify) {
                        case 'delete':
                            ctrl.childCtrl['table_edit'].deleteTable(args).then(
                                function () {
                                    scope.selView = 'empty';
                                },
                                function () {}
                            );
                            break;
                        case 'create:form':
                            scope.selView = 'create';
                            ctrl.childCtrl['table_create'].getEmpty(args);
                            break;
                        case 'create:upload':
                            scope.selView = 'upload';
                            ctrl.childCtrl['table_upload'].setDefault();
                            break;
                        case 'edit':
                            if (args.table !== null) {
                                scope.selView = 'edit';
                                ctrl.childCtrl['table_edit'].getTable(args);
                            }
                            else {
                                scope.selView = 'empty';
                            }
                            break;
                        case 'close':
                            scope.selView = 'empty';
                            break;
                    }
                });

                scope.$on('field', function(event, args) {

                    switch (args.notify) {
                        case 'new:create':
                            args.value.newTable = true;
                            scope.newTable = true;
                            scope.selView = 'field';
                            scope.fieldEditData = new FieldObj();
                            scope.tableStatus = args.newTable;
                            break;
                        case 'edit:create':
                            args.value.newTable = false;
                            scope.newTable = false;
                            scope.selView = 'field';
                            scope.fieldEditData = new FieldObj();
                            scope.tableStatus = args.newTable;
                            break;
                        case 'new:close':

                            scope.selView = 'create';
                            break;
                        case 'edit:close':
                            scope.selView = 'edit';
                            ctrl.childCtrl['table_create'].getEmpty();
                            ctrl.childCtrl['table_edit'].syncRecord();
                            break;
                        case 'edit':
                            scope.selView = 'field';
                            scope.fieldEditData = args.value.field;
                            scope.tableStatus = args.value.newTable;
                            break;
                    }

                });

                scope.$on('relation', function(event, args) {

                    switch (args.notify) {
                        case 'create':
                            scope.selView = 'relation';
                            scope.relationEditData = new RelationObj();
                            break;
                        case 'edit':
                            NavigationService.setStep('relation');
                            scope.selView = 'relation';
                            scope.relationEditData = args.value.relation;
                            break;
                        case 'close':
                            scope.selView = 'edit';
                            ctrl.childCtrl['table_edit'].updateRelations(args.selected);
                            break;
                    }
                });


                scope.$on('table:navigation:close', function(event, args) {
                    scope.selView = 'empty';
                });
            }
        };
      }])

      .directive('dfTableCreateView', ['MOD_SCHEMA_ASSET_PATH', 'NavigationService', 'Table', 'TableDataModel', '$http', 'dfNotify', 'dfObjectService', 'StateService', 'dfApplicationData', 'TableObj', 'tableManager', function (MOD_SCHEMA_ASSET_PATH, NavigationService, Table, TableDataModel, $http, dfNotify, dfObjectService, StateService, dfApplicationData, TableObj, tableManager) {

        return {
            restrict: 'E',
            scope: {
                tableData: '=',
                selectedView: '='
            },
            require: ['dfTableCreateView', '^^dfTableTemplate'],
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-table-create-view.html',
            controller: function($scope) {

                $scope.viewMode = 'table';
                $scope.table = {};


                var ctrl = this;

                ctrl.getEmpty = function () {

                    $scope.table = new TableObj();
                    tableManager.setTable($scope.table, false)
                };

                ctrl.getCached = function (service) {

                    var requestDataObj = {
                        service: service.service,
                        table: service.table
                    };

                    tableManager.getTable(requestDataObj).then(function(tables) {

                        $scope.table = {
                            __dfUI: {
                                newTable: true
                            },
                            record: tables,
                            recordCopy: angular.copy(tables),
                            currentService: service.service
                        };
                    });
                };
            },

            link: function (scope, elem, attrs, ctrls) {

                var childCtrl = ctrls[0];
                var  parentCtrl = ctrls[1];

                parentCtrl.register('table_create', childCtrl);



                // PUBLIC API
                scope.saveTable = function () {

                    var tableList = StateService.get('dfservice').components;

                    var index = tableList.findIndex(function (element, index, array) {
                        return element.name === scope.table.record.name;
                    });

                    if (index !== -1) {

                        var messageOptions = {

                            module: 'Validation Error',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: 'The name already exists'
                        };

                        dfNotify.error(messageOptions);

                        return;
                    }

                    scope._saveTable();
                };

                scope.cancelTable = function () {

                    scope._cancelTable();
                };


                // COMPLEX IMPLEMENTATION
                scope._saveTable = function () {

                    tableManager.clearPool();

                    scope.currentService = StateService.get('dfservice');

                    scope.table.currentService = {
                        name: scope.currentService.name
                    };

                    tableManager.setTable(scope.table.record, true).then(function (result) {

                        var messageOptions = {
                            module: 'Schema',
                            type: 'success',
                            provider: 'dreamfactory',
                            message: 'Table saved successfully.'
                        };

                        var newTable = result.data.resource[0];

                        var component = {
                            __dfUI: {
                                newTable: false
                            },
                            name: scope.table.record.name,
                            label: scope.table.record.label || result.data.resource[0].label
                        };

                        scope.currentService.components.push(component);

                        dfApplicationData.updateServiceComponentsLocal(scope.currentService);

                        scope.table.__dfUI.newTable = false;

                        scope.table.recordCopy = angular.copy(scope.table.record);

                        StateService.set('dftable', scope.table.record.name);

                        dfNotify.success(messageOptions);

                        var naviObj = {
                            service: scope.currentService.name,
                            table: scope.table.record.name,
                            type: 'form',
                            data: newTable
                        };

                        scope.$emit('table:navigation:select', naviObj);
                    }, function (errMsg) {

                        var messageOptions = {

                            module: 'Api Error',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: errMsg.error.message
                        };

                        dfNotify.error(messageOptions);
                    });
                };

                scope._cancelTable = function () {

                    if (!dfObjectService.compareObjectsAsJson(scope.table.record, scope.table.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return false;
                        }
                    }

                    scope.table = null;
                    scope.$emit('table', {notify: 'close'});
                };
            }
        };
      }])


      .directive('dfTableEditView', ['MOD_SCHEMA_ASSET_PATH', '$q', 'NavigationService', 'Table', 'TableDataModel', '$http', 'dfNotify', 'tableManager', 'TableObj', 'dfObjectService', 'dfApplicationData', 'StateService', function (MOD_SCHEMA_ASSET_PATH, $q, NavigationService, Table, TableDataModel, $http, dfNotify, tableManager, TableObj, dfObjectService, dfApplicationData, StateService) {
        var childNumber = 1;
        return {
            restrict: 'E',
            scope: {
                tableData: '=',
                selectedView: '='
            },
            require: ["dfTableEditView", "^dfTableTemplate"],
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-table-edit-view.html',
            controller: function ($scope) {

                var ctrl = this;

                $scope.table = null;
                $scope.viewMode = 'table';

                $scope.schemaJsonEditorObj = {"editor": null};

                $scope.reset = function () {

                  $scope.table = null;
                  $scope.viewMode = 'table';
                  $scope.table = null;
                  $scope.currentTable = null;
                };

                $scope.thisService = null;

                ctrl.syncRecord = function () {
                    $scope.table.recordCopy = angular.copy($scope.table.record);
                };

                ctrl.getTable = function (service) {

                    var requestDataObj = {
                        service: service.service,
                        table: service.table
                    };

                    tableManager.getTable(requestDataObj).then(function(tables) {

                        $scope.table = {
                            __dfUI: {
                                newTable: false
                            },
                            record: tables,
                            recordCopy: angular.copy(tables),
                            currentService: service.service
                        };
                    });
                };


                ctrl.updateRelations = function (obj) {

                    tableManager.updateRelations(obj).then(function(tables) {

                    });
                };


                ctrl.deleteTable = function (obj) {

                    if (dfNotify.confirm('Are you sure you want to drop table ' + obj.table + '?')) {
                        return $scope._deleteTable(obj);
                    }
                };


                $scope._deleteTable = function (obj) {

                    var deferred = $q.defer();

                    var requestDataObj = {
                        table: obj.table,
                        service: obj.service
                    };


                    tableManager.deleteTable(requestDataObj).then(
                        function (result) {

                            var messageOptions = {

                                module: 'Schema',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Table deleted successfully.'
                            };

                            var currentService = requestDataObj.service;

                            var i = 0;

                            while (i < currentService.components.length) {

                                if (currentService.components[i].name === requestDataObj.table) {
                                    currentService.components.splice(i, 1);

                                    break;
                                }
                                i++;
                            }

                            $scope.table.currentService = currentService;

                            dfApplicationData.updateServiceComponentsLocal($scope.table.currentService);

                            $scope.table = null;
                            $scope.currentTable = null;
                            $scope.reset();

                            dfNotify.success(messageOptions);

                            deferred.resolve();
                        },
                        function (reject) {

                            var messageOptions = {

                                module: 'Schema',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);

                            deferred.reject();
                        }
                    );

                    return deferred.promise;
                };
            },

            link: function (scope, elem, attrs, ctrls) {

                var childCtrl = ctrls[0];
                var  parentCtrl = ctrls[1];

                parentCtrl.register('table_edit', childCtrl);

                scope.updTable = function () {

                    scope._updTable();
                };

                scope._updTable = function () {
                    scope.currentService = StateService.get('dfservice');

                    scope.table.currentService = {
                        name: scope.currentService.name
                    };

                    tableManager.setTable(scope.table.record, true).then(function (result) {

                        var updatedTable = {
                            __dfUI: {
                                newTable: false
                            },
                            name: scope.table.record.name,
                            label: scope.table.record.label
                        };


                        var i = 0;

                        while (i < scope.currentService.components.length) {

                            if (scope.currentService.components[i].name === scope.table.record.name) {
                                scope.currentService.components[i] = updatedTable;
                                break;
                            }

                            i++;
                        }

                        dfApplicationData.updateServiceComponentsLocal(scope.currentService);
                        StateService.set('dfservice', scope.currentService);

                        var messageOptions = {

                            module: 'Schema',
                            type: 'success',
                            provider: 'dreamfactory',
                            message: 'Table saved successfully.'
                        };

                        dfNotify.success(messageOptions);

                        scope.table.recordCopy = angular.copy(scope.table.record);
                    }, function (errMsg) {

                        var messageOptions = {

                            module: 'Api Error',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: errMsg.error.message
                        };

                        dfNotify.error(messageOptions);
                    });
                };

                scope.closeTable = function () {

                    scope._closeTable();
                };

                scope._closeTable = function () {

                    if (!dfObjectService.compareObjectsAsJson(scope.table.record, scope.table.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return false;
                        }
                    }

                    tableManager.clearPool();

                    var closeObj = {
                        service: StateService.get('dfservice')
                    };

                    scope.$emit('table:navigation:close', closeObj);
                };


                scope.toggleViewMode = function () {

                    if (scope._validateJSON()) {

                        scope._toggleViewMode();
                    }
                    else {

                        var messageOptions = {
                            module: 'JSON Error',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: 'Invalid JSON.  Please correct any errors and validate to switch back to table view.'
                        };

                        dfNotify.error(messageOptions);
                    }
                };

                scope._toggleViewMode = function () {

                    scope.viewMode = scope.viewMode === 'json' ? 'table' : 'json';

                    if (scope.viewMode === 'table') {

                        scope.table.record = angular.fromJson(scope.schemaJsonEditorObj.editor.getValue());
                    }
                };

                scope._checkJSON = function () {

                    if (scope._validateJSON()) {

                        var messageOptions = {

                            module: 'Schema',
                            type: 'success',
                            provider: 'dreamfactory',
                            message: 'Valid JSON.'
                        };

                        dfNotify.success(messageOptions);


                    } else {
                        var messageOptions = {

                            module: 'Api Error',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: 'JSON Invalid.'
                        };

                        dfNotify.error(messageOptions);
                    }
                };

                scope.checkJSON = function () {

                    scope._checkJSON();
                };

                scope._validateJSON = function () {

                    try {
                        var result = JSON.parse(scope.schemaJsonEditorObj.editor.getValue());

                        if (result) {

                            scope.schemaJsonEditorObj.editor.setValue(angular.toJson(result, true), -1);
                            return true;
                        }
                    }
                    catch (e) {

                        return false;
                    }
                };

                scope.$on('table:update', function(event, args) {

                    scope.table = args;
                });

                scope.$on('table:edit:clear', function (event, args) {

                    scope.table = null;
                    scope.currentService = null;

                    scope.showEditView = false;
                    scope.currentTable = null;
                    scope.lastTable = null;
                    NavigationService.setStep('empty');
                    scope.selView = NavigationService.getStep();
                });

                scope.$on('table:navigation:edit', function(event, args) {

                    scope.currentService = args.value.service;
                    scope.showEditView = true;
                    scope.selView = 'edit';
                    scope.currentTable = args.value;
                    scope.lastTable = angular.copy(scope.currentTable);
                    scope._getTable(args.value);
                });


                scope.$on('table:navigation:field', function(event, args) {

                });
            }
        };
      }])

    .directive('dfTableFields', ['MOD_SCHEMA_ASSET_PATH', 'NavigationService', 'tableManager', 'TableObj', 'StateService', 'dfNotify', function (MOD_SCHEMA_ASSET_PATH, NavigationService, tableManager, TableObj, StateService, dfNotify) {

        return {
            restrict: 'E',
            scope: {
                tableData: '=',
                currentService: '='
            },
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-table-fields.html',
            controller: function($scope) {

                // Add sorting to Fields table
                $scope.propertyName = 'type';
                $scope.reverse = true;

                $scope.sortBy = function(propertyName) {
                    $scope.reverse = ($scope.propertyName === propertyName) ? !$scope.reverse : false;
                    $scope.propertyName = propertyName;
                };
            },

            link: function (scope, elem, attrs) {

                scope.tableStatus = null;

                scope.addField = function (newTable) {

                    scope.tableStatus = newTable.__dfUI.newTable;

                    if (newTable.__dfUI.newTable) {
                        tableManager.setTable(newTable, false);
                    }

                    var naviObj = {
                        type: 'field',
                        newTable: newTable.__dfUI.newTable,
                        notify: null,
                        value: {
                            table: scope.$parent.table.record.name,
                            service: StateService.get('dfservice').name
                        }
                    };

                    StateService.set('dftable', scope.$parent.table.record.name)

                    if (scope.$parent.table.__dfUI.newTable) {
                        naviObj.notify = 'new:create';
                        scope.$emit('field', naviObj);
                    }
                    else {
                        naviObj.notify = 'edit:create';
                        scope.$emit('field', naviObj);
                    }

                };

                scope.editField = function (field, newTable) {

                    var naviObj = {
                        type: 'field',
                        notify: 'edit',
                        value: {
                            field: field,
                            table: scope.currentTable,
                            newTable: scope.$parent.table.__dfUI.newTable
                        }
                    };

                    scope.$emit('field', naviObj);
                };

                scope.deleteField = function (field) {

                    if (dfNotify.confirm('Are you sure you want to delete field ' + field.name + '?')) {
                        scope._deleteField(field);
                    }
                };

                scope._deleteField = function (field) {


                    if (scope.$parent.table.__dfUI.newTable) {
                        var i = 0;
                        while (i < scope.$parent.table.record.field.length) {

                            if (scope.$parent.table.record.field[i].name === field.name) {
                                scope.$parent.table.record.field.splice(i, 1);
                                break;
                            }

                            i++;
                        }
                    }
                    else {
                        var params = {
                          service: StateService.get('dfservice'),
                          table: StateService.get('dftable'),
                          field: field.name
                        };


                        tableManager.deleteField(params).then(function () {

                            var i = 0;
                            while (i < scope.$parent.table.record.field.length) {

                                if (scope.$parent.table.record.field[i].name === field.name) {
                                    scope.$parent.table.record.field.splice(i, 1);
                                    break;
                                }

                                i++;
                            }

                            var messageOptions = {

                                module: 'Schema',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Field deleted successfully.'
                            };

                            dfNotify.success(messageOptions);
                        }, function (reject) {

                            var messageOptions = {
                                module: 'Schema',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                        });
                    }
                };

                scope.setPrimaryField = function (field) {

                    var tableFields = scope.$parent.table.record.field;

                    var fieldIndex = tableFields.findIndex(function (element, index, array) {

                        return element.name === field.name;
                    });

                    var primaryKeyName = null;

                    for (var i = 0; i < tableFields.length; i++) {
                        if (tableFields[i].name === field.name) {

                            tableFields[i].is_primary_key = true;
                            primaryKeyName = field.name;
                        }
                        else {
                            tableFields[i].is_primary_key = false;
                            scope.$parent.table.record.primary_key = null;
                        }
                    }

                    scope.$parent.table.record.field = tableFields;
                    scope.$parent.table.record.primary_key = primaryKeyName;
                };
            }
        };
    }])

    .directive('dfTableRelationships', ['MOD_SCHEMA_ASSET_PATH', 'NavigationService', 'dfNotify', 'tableManager', 'StateService', function (MOD_SCHEMA_ASSET_PATH, NavigationService, dfNotify, tableManager, StateService) {

        return {
            restrict: 'E',
            scope: {
                tableData: '='
            },
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-table-relationships.html',
            controller: function($scope) {

                // Add sorting to Fields table
                $scope.propertyName = 'type';
                $scope.reverse = true;

                $scope.sortBy = function(propertyName) {
                    $scope.reverse = ($scope.propertyName === propertyName) ? !$scope.reverse : false;
                    $scope.propertyName = propertyName;
                };
            },

            link: function (scope, elem, attrs) {


                scope.addRelation = function () {

                    NavigationService.setStep('relation');

                    scope.viewMode = 'relation';

                    scope.selView = NavigationService.getStep();

                    scope.$emit('relation', {notify: 'create'});

                };


                scope.deleteRelation = function (relationData) {

                    if (dfNotify.confirm('Are you sure you want to delete relationship ' + relationData.name + '?')) {

                        scope._deleteRelation(relationData);
                    }
                };

                scope._deleteRelation = function (relation) {

                      var params = {
                          service: StateService.get('dfservice').name,
                          table: StateService.get('dftable'),
                          relation: relation.name
                      };

                      var relations = scope.$parent.table.record.related;

                      tableManager.deleteRelation(params).then(function (result) {

                          var i = 0;
                          while (i < scope.$parent.table.record.related.length) {

                              if (scope.$parent.table.record.related[i].name === relation.name) {
                                  scope.$parent.table.record.related.splice(i, 1);
                                  break;
                              }

                              i++;
                          }

                          var messageOptions = {

                              module: 'Schema',
                              type: 'success',
                              provider: 'dreamfactory',
                              message: 'Virtual Relationship deleted successfully.'
                          };

                          dfNotify.success(messageOptions);
                      }, function (reject) {

                          var messageOptions = {
                              module: 'Schema',
                              type: 'error',
                              provider: 'dreamfactory',
                              message: reject
                          };

                          dfNotify.error(messageOptions);
                      });

                  };

                scope.editRelation = function (relation) {

                    var naviObj = {
                        type: 'relation',
                        notify: 'edit',
                        value: {
                            relation: relation,
                            table: scope.currentTable
                        }
                    };

                    scope.$emit('relation', naviObj);
                };


                // Populate Fields table
                scope.relationTableData = [];

                var relationshipDataSubscribe = scope.$watch('tableData', function(newValue, oldValue) {

                    scope.relationTableData = newValue;
                });


                scope.$on('$destroy', function () {
                    relationshipDataSubscribe();
                });
            }
        };
    }])


    .directive('dfFieldDetails', ['MOD_SCHEMA_ASSET_PATH', 'INSTANCE_URL', '$q', '$http', 'dfNotify', 'dfObjectService', 'dfApplicationData', 'FieldOptions', 'tableManager', 'StateService', 'FieldObj', function (MOD_SCHEMA_ASSET_PATH, INSTANCE_URL, $q, $http, dfNotify, dfObjectService, dfApplicationData, FieldOptions, tableManager, StateService, FieldObj) {

        return {
            restrict: 'E',
            scope: {
                selectedView: '=',
                fieldData: '=',
                currentTable: '=',
                tableStatus: '='
            },
            require: ['dfFieldDetails' ,'^^dfTableTemplate'],
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-field-details.html',
            controller: function ($scope) {

                $scope.isNewTable = null;

                var ctrl = this;

            },
            link: function (scope, elem, attrs, ctrls) {

                var childCtrl = ctrls[0];
                var parentCtrl = ctrls[1];

                parentCtrl.register('field_create', childCtrl);

                scope.addDbFunctionUse = function () {

                    scope._addDbFunctionUse();
                };

                scope.removeDbFunctionUse = function (objIndex) {

                    scope._removeDbFunctionUse(objIndex);
                };

                scope.typeOptions = FieldOptions.typeOptions;
                scope.returnTypeOptions = FieldOptions.returnTypeOptions;
                scope.helpText = FieldOptions.helpText;


                var _setField = function () {

                    scope.parentTable = null;

                    if (!scope.tableStatus) {
                        scope.parentTable = StateService.get('dftable');
                    }
                    else {
                        scope.parentTable = '__new';
                    }

                    if (scope.field.record.name !== null && scope.field.record.type !== null) {

                        var result = tableManager.setField(scope.parentTable, scope.field, !scope.tableStatus)

                        if (!scope.tableStatus) {

                            result.then(function (res) {

                              var messageOptions = {

                                  module: 'Schema',
                                  type: 'success',
                                  provider: 'dreamfactory',
                                  message: 'Field saved successfully.'
                              };

                              dfNotify.success(messageOptions);
                            }, function (reject) {

                                var messageOptions = {
                                    module: 'Schema',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    message: 'Failed to save field'
                                };

                                dfNotify.error(messageOptions);
                            });
                        }

                        scope.field.recordCopy = angular.copy(scope.field.record);

                        scope._closeField();
                    }
                    else {

                        var messageOptions = {
                            module: 'Schema',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: 'Name and type are required fields'
                        };

                        dfNotify.error(messageOptions);
                    }
                };


                scope.updField = function (value) {

                    if (scope.tableStatus) {

                        if (tableManager.getField(scope.field.record.name, '__new') === undefined) {

                            _setField();
                        }
                        else {

                            var messageOptions = {
                                module: 'Schema',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: 'The field name already exists'
                            };

                            dfNotify.error(messageOptions);
                        }
                    }
                    else {

                        tableManager.getTable({table: StateService.get('dftable')}).then(function (result) {

                            var fields = result.field;

                            var fieldNames = fields.map(function(obj){
                                return obj.name;
                            });

                            if ((fieldNames.indexOf(scope.field.record.name) == -1) || (!value)) {

                                _setField();
                            }
                            else {
                                var messageOptions = {
                                    module: 'Schema',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    message: 'The field name already exists'
                                };

                                dfNotify.error(messageOptions);
                            }
                        });
                    }
                };


                scope.closeField = function (noConfirm) {

                    if (!dfObjectService.compareObjectsAsJson(scope.field.record, scope.field.recordCopy)) {

                        if (!noConfirm && !dfNotify.confirmNoSave()) {
                            return false;
                        }

                        // Undo changes to related record object
                        dfObjectService.mergeObjects(scope.field.recordCopy, scope.field.record)
                    }

                    scope._closeField();
                };


                scope._closeField = function () {

                    if (scope.tableStatus) {

                      var obj = {
                          notify: 'new:close',
                          field: scope.field
                      };

                      scope.$emit('field', obj);
                    }
                    else {

                      var obj = {
                          notify: 'edit:close',
                          field: scope.field
                      };

                      scope.$emit('field', obj);
                    }
                };

                scope._updateOnServer = function (table) {

                    var deferred = $q.defer();
                    var result = tableManager.setTable(table);
                    if (result) {
                        deferred.resolve(result);
                    } else {
                        deferred.reject(result);
                    }
                    return deferred.promise;
                };

                scope._addDbFunctionUse = function () {
                    if (!scope.field.record.db_function) {
                        scope.field.record.db_function = [];
                    }

                    scope.field.record.db_function.push({'use': [], 'function': ''});
                };

                scope._removeDbFunctionUse = function (objIndex) {
                    if (scope.field.record.db_function) {
                        if (scope.field.record.db_function[objIndex]) {
                            scope.field.record.db_function.splice(objIndex, 1);
                        }
                    }
                };

                scope._loadReferenceTables = function () {

                    var ref_service_name = StateService.get('dfservice').name;

                    $http.get(INSTANCE_URL.url + '/' + ref_service_name + '/_schema/').then(

                        function (result) {
                            scope.refTables = result.data.resource;
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
                    );
                };

                scope._loadReferenceFields = function () {

                    if (!scope.field.record.ref_table) {
                        scope.refFields = null;
                        return;
                    }

                    var ref_service_name =  StateService.get('dfservice').name;

                    $http.get(INSTANCE_URL.url + '/' + ref_service_name + '/_schema/' + scope.field.record.ref_table).then(
                        function (result) {

                            scope.refFields = result.data.field;
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
                    );
                };

                var watchFieldData = scope.$watch('fieldData', function (newValue, oldValue) {

                    if (!newValue) return;

                    if (newValue.hasOwnProperty('__dfUI')) {
                        scope.field = newValue;
                    }
                    else {
                        scope.field = new FieldObj(newValue);
                    }
                });

                // MESSAGES
                scope.$on('$destroy', function (e) {

                    watchFieldData();
                });
            }
        };
    }])


    .directive('dfFunctionUse', ['MOD_SCHEMA_ASSET_PATH', function (MOD_SCHEMA_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: {
                functionUse: '=?',
                index: '=?'
            },
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-function-use.html',
            link: function (scope, elem, attrs) {
            }
        };
    }])


    .directive('dfRelationDetails', ['MOD_SCHEMA_ASSET_PATH', 'INSTANCE_URL', '$http', 'dfNotify', 'dfObjectService', 'dfApplicationData', 'StateService', 'RelationObj', 'tableManager', function (MOD_SCHEMA_ASSET_PATH, INSTANCE_URL, $http, dfNotify, dfObjectService, dfApplicationData, StateService, RelationObj, tableManager) {

          return {
            restrict: 'E',
            scope: {
                relationData: '=',
                currentTable: '=',
                schemaData: '&',
                apiData: '='
            },
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-relation-details.html',
            link: function (scope, elem, attrs) {

                scope.relation = null;

                scope.typeOptions = [
                    {name: "Belongs To", value: "belongs_to"},
                    {name: "Has One", value: "has_one"},
                    {name: "Has Many", value: "has_many"},
                    {name: "Many To Many", value: "many_many"}
                ];

                scope.fields = null;
                scope.refServices = null;
                scope.refTables = null;
                scope.refFields = null;
                scope.junctionTables = null;
                scope.junctionFields = null;

                // PUBLIC API
                scope.closeRelation = function (noConfirm) {

                    if (!dfObjectService.compareObjectsAsJson(scope.relation.record, scope.relation.recordCopy)) {

                        if (!noConfirm && !dfNotify.confirmNoSave()) {
                            return false;
                        }

                        // Undo changes to related record object
                        dfObjectService.mergeObjects(scope.relation.recordCopy, scope.relation.record)
                    }

                    scope._closeRelation();
                };

                scope.saveRelation = function (newTable) {

                    if (!dfObjectService.compareObjectsAsJson(scope.relation, new RelationObj())) {

                        scope._saveRelation(newTable);
                      }
                      else {

                        var messageOptions = {
                            module: 'Schema',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: 'Required fields are blank'
                        };

                        dfNotify.error(messageOptions);
                      }
                };

                scope.changeReferenceService = function () {
                    scope.relation.record.ref_table = null;
                    scope.relation.record.ref_field = null;
                    scope._loadReferenceTables();
                    scope._loadReferenceFields();
                };

                // PRIVATE API
                scope._loadFields = function () {

                  scope._loadReferenceServices();

                    $http.get(INSTANCE_URL.url + '/' + StateService.get('dfservice').name + '/_schema/' + StateService.get('dftable') + '/_field/').then(

                        function (result) {

                            scope.fields = result.data.resource;
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
                    );

                };

                scope._getServiceNameFromId = function (id) {

                    if (id) {
                      if (scope.refServices !== undefined) {
                        for (var i = 0; i < scope.refServices.length; i++) {
                            if (scope.refServices[i].id === id) {
                                return scope.refServices[i].name;
                            }
                        }
                      }

                      return null;
                    }

                    return StateService.get('dfservice');
                };

                scope._loadReferenceServices = function () {

                    scope.refServices = scope.apiData.service_list;
                };


                scope._loadReferenceTables = function () {

                    var ref_service_name = scope._getServiceNameFromId(scope.relation.record.ref_service_id);

                    $http.get(INSTANCE_URL.url + '/' + ref_service_name + '/_schema/').then(
                        function (result) {
                            scope.refTables = result.data.resource;
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
                    );
                };


                scope._loadReferenceFields = function () {

                    if (!scope.relation.record.ref_table) {
                        scope.refFields = null;
                        return;
                    }

                    var ref_service_name = scope._getServiceNameFromId(scope.relation.record.ref_service_id);

                    $http.get(INSTANCE_URL.url + '/' + ref_service_name + '/_schema/' + scope.relation.record.ref_table).then(
                        function (result) {

                            scope.refFields = result.data.field;
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
                    );

                };

                scope.changeJunctionService = function () {
                    scope.relation.record.junction_table = null;
                    scope.relation.record.junction_field = null;
                    scope.relation.record.junction_ref_field = null;
                    scope._loadJunctionTables();
                    scope._loadJunctionFields();
                };

                // PRIVATE API
                scope._loadJunctionTables = function () {

                    var ref_service_name = scope._getServiceNameFromId(scope.relation.record.junction_service_id);

                    $http.get(INSTANCE_URL.url + '/' + ref_service_name + '/_schema/').then(
                        function (result) {
                            scope.junctionTables = result.data.resource;
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
                    );
                };


                scope._loadJunctionFields = function () {

                    if (!scope.relation.record.ref_table) {
                        scope.junctionFields = null;
                        return;
                    }

                    if (scope.relation.record.junction_table === null) return;

                    var ref_service_name = scope._getServiceNameFromId(scope.relation.record.junction_service_id);

                    $http.get(INSTANCE_URL.url + '/' + ref_service_name + '/_schema/' + scope.relation.record.junction_table).then(
                        function (result) {

                            scope.junctionFields = result.data.field;
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
                    );

                };


                // COMPLEX IMPLEMENTATION
                scope._closeRelation = function () {

                    var params = {
                        notify: 'close',
                        selected: {
                            service: StateService.get('dfservice'),
                            table: StateService.get('dftable')
                        }
                    };

                    scope.$emit('relation', params);
                };

                scope._saveRelation = function (newTable) {

                    newTable = newTable || false;

                    if (newTable === true) {
                        return;
                    }

                    var params = {
                        service: StateService.get('dfservice').name,
                        table: StateService.get('dftable')
                    };

                    tableManager.saveRelation(params, scope.relation).then(function () {

                        var messageOptions = {

                            module: 'Schema',
                            type: 'success',
                            provider: 'dreamfactory',
                            message: 'Virtual Relationship saved successfully.'
                        };

                        dfNotify.success(messageOptions);

                        scope._closeRelation();
                    }, function (reject) {

                      var messageOptions = {

                          module: 'Api Error',
                          type: 'error',
                          provider: 'dreamfactory',
                          message: reject
                      };

                      dfNotify.error(messageOptions);
                    });
                };

                // WATCHERS
                var watchRelationData = scope.$watch('relationData', function (newValue, oldValue) {

                    if (!newValue) return;

                    var dataObj = null;

                    if (newValue.hasOwnProperty('__dfUI')) {

                        scope.relation = newValue.__dfUI.newRelation ? new RelationObj() : new RelationObj(newValue.record);
                    }
                    else {
                        scope.relation = new RelationObj(newValue);
                    }

                    if (!scope.fields) {
                        scope._loadFields();
                    }

                    if (scope.relation.record.ref_table) {
                        scope._loadReferenceTables();
                        scope._loadReferenceFields();
                    } else {
                        scope.refFields = null;
                    }
                    if (scope.relation.record.junction_table) {
                        scope._loadJunctionTables();
                        scope._loadJunctionFields();
                    } else {
                        scope.junctionFields = null;
                    }

                });

                // MESSAGES
                scope.$on('$destroy', function (e) {

                    watchRelationData();
                });


                scope.helpText = {
                    'is_virtual': {
                        title: 'Is Virtual Relationship',
                        text: 'Is this a virtual relationship. See <a href="http://wiki.dreamfactory.com/DreamFactory/Features/Database/Schema#Database_Functions" target="_blank">here</a> for more info.'
                    }
                };
            }
        };
    }])

      .directive('dfSchemaNavigator', ['MOD_SCHEMA_ASSET_PATH', 'dfApplicationData', 'StateService', 'TableListService', 'NavigationService', 'tableManager', 'dfNotify', function (MOD_SCHEMA_ASSET_PATH, dfApplicationData, StateService, TableListService, NavigationService, tableManager, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-schema-navigator.html',
            link: function (scope, elem, attrs) {


                scope.serviceSelect = function() {

                    tableManager.clearPool();

                    scope.$broadcast('table', {notify: 'close'});

                    scope.currentTable = null;
                    StateService.set('dfservice', scope.currentService);
                    TableListService.getTableList();
                };

                scope.navigationSelect = function (selected) {

                    var naviObj = {
                        type: selected,
                        notify: 'create:' + selected,
                        value: {
                            service: scope.currentService.name
                        }
                    };

                    scope.currentTable = null;

                    scope.$broadcast('table', naviObj);
                };

                scope.deleteTable = function () {

                    var params = {
                        table: scope.currentTable,
                        service: scope.currentService,
                        notify: 'delete'
                    };

                    scope.$broadcast('table', params);
                };

                scope.tableSelect = function(obj) {

                  var params = {
                      table: scope.currentTable,
                      service: scope.currentService.name,
                      notify: 'edit'
                  };

                    StateService.set('dftable', scope.currentTable);

                    scope.$broadcast('table', params);
                };

                scope.reload = function() {

                    tableManager.clearPool();

                    TableListService.getTableList(true).then(function (result) {


                        var index = result.components.findIndex(function (element, index, array) {
                            return element.name === scope.currentTable;
                        });

                        if (index === -1) {

                            scope.currentTable = null;
                            StateService.set('dftable', scope.currentTable);
                            scope.$broadcast('table', {notify: 'close'});
                        }
                        else {

                            scope.tableSelect();
                        }
                    });
                };

                scope.$on('table:navigation:select', function (event, args) {

                    if (args.hasOwnProperty('service') && args.hasOwnProperty('table') && args.hasOwnProperty('type')) {
                        scope.currentTable = args.table;

                        var params = {
                            table: args.table,
                            service: args.service,
                            notify: 'edit'
                        };

                        scope.$broadcast('table', params);
                    }
                });

                scope.$on('table:navigation:close', function(event, args) {

                    scope.currentService = args.service;
                    scope.currentTable = null;
                });
            }
        };
    }])

    .directive('dfSchemaEditor', ['MOD_SCHEMA_ASSET_PATH', function (MOD_SCHEMA_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-schema-editor.html',
            link: function (scope, elem, attrs) {
            }
        };
    }])

    .directive('dfSchemaResizable', [function () {

        return {

            restrict: 'A',
            scope: {},
            link: function (scope, elem, attrs) {


                $(function () {
                    $("#schema-navigator-resizable").resizable({
                        alsoResize: "#schema-navigator-resizable-also"
                    });
                    $("#schema-navigator-resizable-also").resizable();
                });
            }
        };
    }])

    .directive('dfUploadSchema', ['INSTANCE_URL', 'MOD_SCHEMA_ASSET_PATH', '$http', 'dfNotify', '$timeout', 'SchemaJSONData', 'StateService', 'dfApplicationData', function (INSTANCE_URL, MOD_SCHEMA_ASSET_PATH, $http, dfNotify, $timeout, SchemaJSONData, StateService, dfApplicationData) {


        return {
            restrict: 'E',
            scope: false,
            require: ["dfUploadSchema", "^dfTableTemplate"],
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-upload-schema.html',
            controller: function ($scope) {

                var ctrl = this;

                ctrl.setDefault = function () {

                    $scope.uploadSchemaData = SchemaJSONData.schemaJSON;
                };
            },
            link: function (scope, elem, attrs, ctrls) {

              var childCtrl = ctrls[0];
              var  parentCtrl = ctrls[1];

              parentCtrl.register('table_upload', childCtrl);

                scope.uploadObj = {
                    record: null,
                    recordCopy: null
                };

                scope.schemaUploadEditorObj = {"editor": null};

                scope.uploadSchema = function () {

                    var messageOptions;

                    try {
                        var editorData = angular.fromJson(scope.schemaUploadEditorObj.editor.getValue());
                    } catch(e) {
                        messageOptions = {
                            module: 'Validation Error',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: 'The schema JSON is not valid.'
                        };

                        dfNotify.error(messageOptions);
                        return;
                    }

                    var tableList = StateService.get('dfservice').components;

                    var index = tableList.findIndex(function (element, index, array) {
                        return element.name === editorData.resource[0].name;
                    });

                    if (index !== -1) {

                        messageOptions = {
                            module: 'Validation Error',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: 'The table name already exists.'
                        };

                        dfNotify.error(messageOptions);

                        return;
                    }

                    scope._uploadSchema();
                };

                scope.closeUploadSchema = function () {

                    scope._closeUploadSchema();
                };


                scope._uploadSchema = function () {

                    var requestDataObj = {
                        params: {
                            include_schema: true
                        },
                        data: angular.fromJson(scope.schemaUploadEditorObj.editor.getValue())
                    };

                    scope._saveSchemaToServer(requestDataObj).then(
                        function (result) {


                            var messageOptions = {
                                module: 'Schema',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Tables created successfully.'
                            };

                            angular.forEach(result.data.table, function (dataObj) {

                                scope.currentService.components.push({
                                    __dfUI: {
                                        newTable: false
                                    },
                                    name: dataObj.name,
                                    path: '_schema/' + dataObj.name
                                });
                            });

                            var curService = StateService.get('dfservice');

                            var component = {
                                __dfUI: {
                                    newTable: false
                                },
                                name: requestDataObj.data.resource[0].name,
                                label: requestDataObj.data.resource[0].label
                            };

                            curService.components.push(component);

                            dfApplicationData.updateServiceComponentsLocal(curService);

                            scope.uploadSchemaData = null;


                            var naviObj = {
                                service: curService.name,
                                table: requestDataObj.data.resource[0].name,
                                type: 'upload'
                            };

                            scope.$emit('table:navigation:select', naviObj);

                            dfNotify.success(messageOptions);
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
                    );
                };

                scope._saveSchemaToServer = function (requestDataObj) {

                    return $http({
                        method: 'POST',
                        url: INSTANCE_URL.url + '/' + StateService.get('dfservice').name + '/_schema',
                        data: requestDataObj.data
                    });
                };

                scope._closeUploadSchema = function () {

                    scope.$emit('table', {notify: 'close'});
                };
            }
        };
    }])

    .directive('jsonEdit', function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            template: '<textarea ng-model="jsonEditing"></textarea>',
            replace: true,
            scope: {
                model: '=jsonEdit'
            },
            link: function (scope, element, attrs, ngModelCtrl) {

                function setEditing(value) {
                    scope.jsonEditing = angular.copy(JSON2String(value));
                }

                function updateModel(value) {
                    scope.model = string2JSON(value);
                }

                function setValid() {
                    ngModelCtrl.$setValidity('json', true);
                }

                function setInvalid() {
                    ngModelCtrl.$setValidity('json', false);
                }

                function string2JSON(text) {
                    try {
                        return angular.fromJson(text);
                    } catch (err) {
                        setInvalid();
                        return text;
                    }
                }

                function JSON2String(object) {
                    // better than JSON.stringify(), because it formats + filters $$hashKey etc.
                    // NOTE that this will remove all $-prefixed values
                    return angular.toJson(object, true);
                }

                function isValidJson(model) {
                    var flag = true;
                    try {
                        angular.fromJson(model);
                    } catch (err) {
                        flag = false;
                    }
                    return flag;
                }

                //init
                setEditing(scope.model);

                //check for changes going out
                scope.$watch('jsonEditing', function (newval, oldval) {
                    if (newval != oldval) {
                        if (isValidJson(newval)) {
                            setValid();
                            updateModel(newval);
                        } else {
                            setInvalid();
                        }
                    }
                }, true);

                //check for changes coming in
                scope.$watch('model', function (newval, oldval) {
                    if (newval != oldval) {
                        setEditing(newval);
                    }
                }, true);

            }
        };
    });
