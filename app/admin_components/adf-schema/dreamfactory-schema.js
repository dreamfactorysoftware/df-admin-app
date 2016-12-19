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

    .run(['INSTANCE_URL', '$templateCache', function (INSTANCE_URL, $templateCache) {

    }])

    .factory('ServiceListService', ['$q', '$timeout', 'dfApplicationData', function ($q, $timeout, dfApplicationData) {

        var services = [];

        function loadServices() {

            var deferred = $q.defer();

            dfApplicationData.loadApi(['service']);

            deferred.resolve(true);

            return deferred.promise;
        }


        function getServices() {

            if (services.length > 0) return services;

            var serviceArray = [];
            serviceArray = dfApplicationData.getApiData('service', {type: 'mysql,pgsql,sqlite,sqlsrv,sqlanywhere,oracle,ibmdb2,aws_redshift_db,mongodb'});

            if (serviceArray !== undefined) services = serviceArray;

            return serviceArray;
        }

        return {
            getServices: getServices,
            loadServices: loadServices
        }
    }])


    .factory('TableListService', ['INSTANCE_URL', '$q', '$timeout', 'dfApplicationData', 'StateService', 'dfNotify', function (INSTANCE_URL, $q, $timeout, dfApplicationData, StateService, dfNotify) {

        function getTableList () {

            var deferred = $q.defer();
            var currentService = StateService.get('dfservice');
            var forceRefresh = true;
            var tableObj = null;

            for (var i = 0; i < currentService.components.length; i++) {

                if (currentService.components[i].name === $scope.currentTable) {
                    tableObj = currentService.components[i]
                }
            }

            dfApplicationData.getServiceComponents(currentService.name, INSTANCE_URL + '/api/v2/' + currentService.name + '/_schema', {
                params: {
                    refresh: true,
                    fields: 'name,label'
                }
            }, forceRefresh).then(
                function (result) {

                    // update service components
                    currentService.updateComponents(result);

                    // Build notification
                    var messageOptions = {
                        module: 'Schema',
                        type: 'success',
                        provider: 'dreamfactory',
                        message: currentService.name + ' refreshed.'
                    };

                    // Send notification to user
                    //if (forceRefresh)
                    //    dfNotify.success(messageOptions);

                    // Set the current table back and reload it
                    if (tableObj) {
                        $scope.currentTable = tableObj.name;
                        $scope.getTable();
                    }
                },
                function (reject) {

                    var messageOptions = {
                        module: 'Schema',
                        type: 'error',
                        provider: 'dreamfactory',
                        message: reject
                    };

                    dfNotify.error(messageOptions);
                }
          )}

          return {
              getTableList: getTableList
          }
    }])


    .factory('TableUtilities', ['INSTANCE_URL', '$http', 'dfNotify', 'dfApplicationData', 'TableDataModel', function(INSTANCE_URL, $http, dfNotify, dfApplicationData, TableDataModel) {


        function insertNewTableToAppObj (resource, serviceName) {

            var appObj = dfApplicationData.getApplicationObj();

            if (appObj.apis.hasOwnProperty('service') && appObj.apis.service.hasOwnProperty('resource')) {

                for (var i = 0; i < appObj.apis.service.resource.length; i++) {

                    if (appObj.apis.service.resource[i].name === serviceName) { //scope.tableData.currentService.name) {

                        appObj.apis.service.resource[i].components.push({
                            'name': resource.name,
                            'label': resource.label
                        });
                        break;
                    }
                }
            }

            dfApplicationData.setApplicationObj(appObj);
        }


        function updateServiceComponents (newTable, service) {
/*
            var service = $scope.table.currentService;
            scope.table = new Table(newTable);
            TableDataModel.setTableModel(new Table(newTable));
            $scope.table.currentService = service;
*/
            dfApplicationData.updateServiceComponentsLocal(service);
        }

        return {
            insertNewTableToAppObj: insertNewTableToAppObj,
            updateServiceComponents: updateServiceComponents
        }


    }])


    .factory('TableDat', ['INSTANCE_URL', '$http', 'dfNotify', 'TableUtilities', function(INSTANCE_URL, $http, dfNotify, TableUtilities) {

        function Tables(tableObj) {

          var _new = {
              name: null,
              label: null,
              plural: null,
              primary_key: null,
              name_field: null,
              related: [],
              access: [],
              field: [
                  {
                      name: 'example_field',
                      label: 'Example Field',
                      type: 'string'
                  }
              ]
          };

          tableObj = tableObj || _new;

          this.setData({
              __dfUI: {
                  newTable: !tableObj.tableData
              },
              record: angular.copy(tableObj.tableData || tableObj),
              recordCopy: angular.copy(tableObj.tableData || tableObj),
              currentService: tableObj.currentService || {}
          });
        };

        Tables.prototype = {
            setData: function(tableObj) {
                angular.extend(this, tableObj);
            },
            save: function () {

                var self = this;

                $http({
                    method: 'POST',
                    url: INSTANCE_URL + '/api/v2/' + this.currentService.name + '/_schema' + '?fields=*',
                    data: {"resource": [this.record]}
                }).then(
                    function (result) {

                        var messageOptions = {
                            module: 'Schema',
                            type: 'success',
                            provider: 'dreamfactory',
                            message: 'Table saved successfully.'
                        };

                        var newTable = result.data.resource[0];

                        TableUtilities.insertNewTableToAppObj(newTable, self.currentService.name);

                        TableUtilities.updateServiceComponents(newTable, self.currentService)

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
                )
            },
            load: function(id) {

              return this.record.field;
            },
            delete: function() {

            },
            update: function() {



                  var requestDataObj = {
                      params: {
                          include_schema: true
                      },
                      data: this.record,
                      path: this.currentService.name + '/_schema'
                  };


                  return $http({
                      method: 'PUT',
                      url: INSTANCE_URL + '/api/v2/' + requestDataObj.path + '?fields=*',
                      data: {"resource": [requestDataObj.data]}
                  }).then(
                      function (result) {

                          var messageOptions = {
                              module: 'Schema',
                              type: 'success',
                              provider: 'dreamfactory',
                              message: 'Table updated successfully.'
                          };

                          var newTable = result.data.resource[0];

/*
                          var service = scope.table.currentService;
                          scope.table = new Table(newTable);
                          TableDataModel.setTableModel(new Table(newTable));
                          scope.table.currentService = service;
*/
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
                  )


            },
            getRelations: function(width, height) {

            },
            getFields: function(width, height) {

            },

        };
        return Tables;
    }])


    .factory('FieldDat', ['INSTANCE_URL', '$http', 'dfNotify', 'TableUtilities', function(INSTANCE_URL, $http, dfNotify, TableUtilities) {

        function Fields (fieldObj) {

            var Field = function (fieldObj) {

                var _new = {
                    allow_null: false,
                    auto_increment: false,
                    db_function: null,
                    db_type: null,
                    default: null,
                    fixed_length: false,
                    is_foreign_key: false,
                    is_primary_key: false,
                    is_unique: false,
                    label: null,
                    length: null,
                    name: null,
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

                fieldObj = fieldObj || _new;

/*
                record: angular.copy(tableObj.tableData || tableObj),
                recordCopy: angular.copy(tableObj.tableData || tableObj),
                currentService: tableObj.currentService || {}
*/
/*
return {
    __dfUI: {
        newField: !fieldObj.type == null
    },
    record: fieldObj,
    recordCopy: angular.copy(fieldObj)
}
*/

                return {
                    __dfUI: {
                        newField: !(fieldObj.type !== undefined)
                    },
                    record: angular.copy(fieldObj || {}),
                    recordCopy: angular.copy(fieldObj || {}),
                }
            };

            this.setData({
                __dfUI: {
                    newField: !(fieldObj == undefined)
                },
                record: angular.copy(fieldObj || {}),
                recordCopy: angular.copy(fieldObj || {}),
            });
        };

        Fields.prototype = {
            setData: function(fieldObj) {
                angular.extend(this, fieldObj);
            },
            save: function () {


            },
            load: function(id) {

              return this.record.field;
            },
            delete: function() {

            },
            update: function() {


            },
            getRelations: function(width, height) {

            },
            getFields: function(width, height) {

            },

        };
        return Fields;
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
        }

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
            }
        }
    })


    .service('FieldModel', function () {

        return function (fieldData, currentService) {

          return {
              __dfUI: {
                  newField: !fieldData
              },
              record: fieldData || null,
              currentService: currentService
          }
        }
    })



    .service('Table', function () {

        return function (tableData, currentService) {
            return {
                __dfUI: {
                    newTable: !tableData
                },
                record: tableData,
                currentService: currentService
          }
        }
    })

    .service('TableDataModel', function () {

        this.model = null;

        this.setTableModel = function(data) {
            this.model = data;
        }

        this.setTableModel = function(data) {
            this.model = data;
        }

        this.updateTableModel = function(data) {
            this.model = data;
        }

        this.deleteTableModel = function() {

            this.model = null;
        }
    })

    .service('NavigationService', function () {

        var steps = [
            'root',
            'upload',
            'create',
            'edit',
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
        }

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
            {name: "timestamp_on_update", value: "timestamp_on_update"},
            {name: "virtual", value: "virtual"}
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
                text: 'Enter a db function like max(fieldname) or concat(field1, \'.\', field2)'
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
/*
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
        }
*/
    })



    .controller('SchemaCtrl', ['INSTANCE_URL', '$scope', '$http', '$q', 'dfApplicationData', 'dfNotify', 'dfObjectService', 'ServiceListService', 'ServiceModel', 'Table', 'TableDataModel', 'TableDat', function (INSTANCE_URL, $scope, $http, $q, dfApplicationData, dfNotify, dfObjectService, ServiceListService, ServiceModel, Table, TableDataModel, TableDat) {



        // Set Title in parent
        $scope.$parent.title = 'Schema';

        ServiceListService.loadServices();

        // Set module links
        $scope.links = [
            {
                name: 'manage-schema',
                label: 'Manage',
                path: 'manage-schema'
            }
        ];

        // Bind this to the dfTableDetails directive so we have
        // access to the edit obj in the table values.  Not for access
        // but just so we can check if it has been modified
        $scope.bindTable = null;


        $scope.currentService = null;
        $scope.currentTable = null;
        $scope.lastTable = '';

        $scope.activeComponent = null;

        $scope.currentEditTable = null;
        $scope.currentUploadSchema = null;


        // PUBLIC API
        $scope.addTable = function () {

            // Check if we have unsaved changed before continuing
            if ($scope.currentUploadSchema && !$scope.uploadIsEditorClean) {

                if (!dfNotify.confirm('You have unsaved changes.  Continue without saving?')) {

                    return;
                }

                $scope.currentUploadSchema = null;
            }

            // If we have a bound table and that table has been modified
            else if ($scope.bindTable !== null && !dfObjectService.compareObjectsAsJson($scope.bindTable.record, $scope.bindTable.recordCopy)) {

                // Do you want to continue without saving
                if (!dfNotify.confirm('You have unsaved changes.  Continue without saving?')) {

                    // Yes
                    return;
                }

                $scope.currentEditTable = null;
            }


            $scope._addTable();
        };

        $scope.getTable = function () {

            if ($scope.currentUploadSchema && !$scope.uploadIsEditorClean) {

                if (!dfNotify.confirm('You have unsaved changes.  Continue without saving?')) {

                    $scope.currentTable = angular.copy($scope.lastTable);
                    return;
                }
            }

            // If we have a bound table and that table has been modified
            if ($scope.bindTable !== null && !dfObjectService.compareObjectsAsJson($scope.bindTable.record, $scope.bindTable.recordCopy) && $scope.bindTable.__dfUI.newTable === true) {

                // Do you want to continue without saving
                if (dfNotify.confirm('You have unsaved changes.  Continue without saving?')) {

                    // Yes
                    $scope.lastTable = angular.copy($scope.currentTable);
                    $scope._getTable($scope.currentTable);
                }
                else {

                    $scope.currentTable = angular.copy($scope.lastTable);
                }
            }
            else {

                $scope.lastTable = angular.copy($scope.currentTable);
                $scope._getTable($scope.currentTable);
            }

        };

        $scope.deleteTable = function () {

            if (dfNotify.confirm('Are you sure you want to drop table ' + $scope.currentEditTable.record.name + '?')) {
                $scope._deleteTable();
            }
        };

        $scope.addByJson = function () {


            // If we have a bound table and that table has been modified
            if ($scope.bindTable !== null && !dfObjectService.compareObjectsAsJson($scope.bindTable.record, $scope.bindTable.recordCopy)) {

                // Do you want to continue without saving
                if (dfNotify.confirm('You have unsaved changes.  Continue without saving?')) {

                    // Yes
                    $scope.lastTable = '';
                    $scope.currentEditTable = null;

                }
                else {

                    return;
                }

            }

            $scope.currentEditTable = null;
            $scope._addByJson();

        };

        // PRIVATE API
        $scope._getTableFromServer = function (requestDataObj) {

            return $http({
                method: 'GET',
                url: INSTANCE_URL + '/api/v2/' + $scope.currentService.name + '/_schema/' + requestDataObj.name,
                params: {
                    refresh: true
                }

            });
        };

        $scope._deleteTableFromServer = function (requestDataObj) {

            return $http({
                method: 'DELETE',
                url: INSTANCE_URL + '/api/v2/' + $scope.currentService.name + '/_schema/' + requestDataObj.name
            })
        };

        $scope._saveSchemaToServer = function (requestDataObj) {

            return $http({
                method: 'POST',
                url: INSTANCE_URL + '/api/v2/' + $scope.currentService.name + '/_schema',
                data: requestDataObj.data
            })
        };

        // COMPLEX IMPLEMENTATION
        $scope._addTable = function () {

            //$scope.currentEditTable = new ManagedTableData(null);
            $scope.currentEditTable = new Table(null, $scope.currentService);

            TableDataModel.setTableModel(new Table(null, $scope.currentService));

            $scope.currentTable = '';
        };

        $scope._getTable = function (table) {

            if (!table) {
                $scope.currentTable = null;
                $scope.currentEditTable = null;
                return;
            }


            var requestDataObj = {
                name: table
            };


            $scope._getTableFromServer(requestDataObj).then(
                function (result) {

                    $scope.currentUploadSchema = null;
                    $scope.currentEditTable = new Table(result.data, $scope.currentService);
                    TableDataModel.setTableModel(new Table(result.data, $scope.currentService));
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
        };

        $scope._deleteTable = function () {

            var requestDataObj = {
                name: $scope.currentTable
            };


            $scope._deleteTableFromServer(requestDataObj).then(
                function (result) {

                    var messageOptions = {

                        module: 'Schema',
                        type: 'success',
                        provider: 'dreamfactory',
                        message: 'Table deleted successfully.'
                    };


                    var i = 0;

                    while (i < $scope.currentService.components.length) {

                        if ($scope.currentService.components[i].name === $scope.currentTable) {
                            $scope.currentService.components.splice(i, 1);
                            $scope.currentTable = '';
                            $scope.currentEditTable = null;
                            break;
                        }

                        i++
                    }

                    dfApplicationData.updateServiceComponentsLocal($scope.currentService)
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
            )
        };

        $scope._addByJson = function () {

            $scope.currentUploadSchema = true;

        };

        // WATCHERS
        var watchServiceComponents = $scope.$watchCollection(function() {return ServiceListService.getServices()}, function (newValue, oldValue) {

            if (!newValue) return;

            var tempObj = {};

            angular.forEach(ServiceListService.getServices(), function (serviceData) {

                tempObj[serviceData.name] = new ServiceModel(serviceData);
            });

            $scope.schemaManagerData = tempObj;
        });

        var watchCurrentEditTable = $scope.$watch('currentEditTable', function (newValue, oldValue) {

            if (newValue === null) {

                $scope.currentTable = '';
            }
        });


        // MESSAGES
        $scope.$on('$destroy', function (e) {

            watchSchemaManagerData();
            watchServiceComponents();
            watchCurrentEditTable();
        });

        $scope.$on('refresh:table', function (e, resource) {

            $scope.refreshService(true);
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
        }
    }])


    .directive('dfTableTemplate', ['MOD_SCHEMA_ASSET_PATH', '$timeout', 'NavigationService', 'Table', 'TableDataModel', 'TableDat', 'FieldDat', function (MOD_SCHEMA_ASSET_PATH, $timeout, NavigationService, Table, TableDataModel, TableDat, FieldDat) {

        return {
            restrict: 'E',
            scope: {
                tableData: '=',
            },
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-table-template.html',
            controller: ['$scope', function TemplateCtrl ($scope) {

                this.selectedView = 'empty';
            }],

            link: function (scope, elem, attrs, TemplateCtrl) {

                scope.tabelModel = new TableDat();

                scope.$on('table:navigation:edit', function(event, args) {
                    NavigationService.setStep('edit');
                    scope.showEditView = true;
                    scope.selView = NavigationService.getStep();
                });

                scope.$on('table:navigation:create', function(event, args) {
                    NavigationService.setStep('create');
                    scope.showCreateView = true;
                    scope.selView = NavigationService.getStep();
                });

                scope.$on('table:navigation:field:edit', function(event, args) {
                    NavigationService.setStep('field');
                    scope.showFieldView = true;
                    scope.selView = NavigationService.getStep();
                    scope.fieldEditData = args.value.field;
                });

                scope.$on('table:navigation:field:new', function(event, args) {
                    NavigationService.setStep('field');
                    scope.showFieldView = true;
                    scope.selView = NavigationService.getStep();
                    scope.fieldEditData = new FieldDat();
                });
            }
        }
      }])

      .directive('dfTableCreateView', ['INSTANCE_URL', 'MOD_SCHEMA_ASSET_PATH', 'NavigationService', 'Table', 'TableDataModel', '$http', 'dfNotify', 'TableDat', function (INSTANCE_URL, MOD_SCHEMA_ASSET_PATH, NavigationService, Table, TableDataModel, $http, dfNotify, TableDat) {

        return {
            restrict: 'E',
            scope: {
                tableData: '=',
                selectedView: '='
            },
            require: '^^dfTableTemplate',
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-table-create-view.html',
            controller: function($scope) {


            },

            link: function (scope, elem, attrs, templCtrl) {

                scope.currentCreateField = null;
                scope.currentCreateRelation = null;
                scope.currentService = null;
                scope.viewMode = 'table';
                scope.table = {};

                scope.currentCreateTable = new TableDat();

                scope.savTable = function () {

                    scope.table.currentService = {
                        name: scope.currentService
                    };
                    scope.currentCreateTable.setData(scope.table);
                    scope.currentCreateTable.save();
                }

                scope.closeTable = function () {

                    if (!dfObjectService.compareObjectsAsJson(scope.table.record, scope.table.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return false;
                        }
                    }


                    scope.table = null;
                    scope.tableData = null;
                    scope.currentEditField = null;
                    scope.currentEditRelation = null;
                };

                scope.clearTable = function () {

                  TableDataModel.deleteTableModel();
                  scope.showCreateView = false;
                  scope.selView = null;
                  NavigationService.setStep('root');
                  scope.table = null;
                  scope.currentService = null;
                  scope.currentUploadSchema = null;
/*
                  var confirmRes = dfNotify.confirmNoSave();

                  if (confirmRes) {

                      scope.table.record = {};
                  }
*/
                };

                scope.$on('table:navigation:create', function(event, args) {

                    NavigationService.setStep('create');
                    scope.showCreateView = true;
                    scope.selView = NavigationService.getStep();
                    scope.currentService = args.value.service;
                    scope.currentUploadSchema = null;
                    scope.table = scope.currentCreateTable;

                });
            }
        }
      }])


      .directive('dfTableEditView', ['INSTANCE_URL', 'MOD_SCHEMA_ASSET_PATH', 'NavigationService', 'Table', 'TableDataModel', '$http', 'dfNotify', 'TableDat', function (INSTANCE_URL, MOD_SCHEMA_ASSET_PATH, NavigationService, Table, TableDataModel, $http, dfNotify, TableDat) {

        return {
            restrict: 'E',
            scope: {
                tableData: '=',
                selectedView: '=',
            },
            require: '^^dfTableTemplate',
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-table-edit-view.html',
            controller: ['$scope', function TemplateCtrl ($scope) {

                this.qwe = '123';
                $scope.table = null;
            }],

            link: function (scope, elem, attrs, templateCtrl) {

                scope.currentEditField = null;
                scope.currentEditRelation = null;
                scope.viewMode = 'table';

                scope._getTable = function (obj) {

                    if (!obj) {
                        scope.currentTable = null;
                        scope.currentEditTable = null;
                        return;
                    }

                    var requestDataObj = {
                        service: obj.service,
                        table: obj.table
                    };

                    scope._getTableFromServer(requestDataObj).then(
                        function (result) {

                            var tableObj = {
                                tableData: result.data,
                                currentService: obj.service
                            }

                            scope.currentUploadSchema = null;
                            scope.currentEditTable = new TableDat(tableObj);
                            scope.table = scope.currentEditTable;
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
                };

                scope._getTableFromServer = function (requestDataObj) {

                    return $http({
                        method: 'GET',
                        url: INSTANCE_URL + '/api/v2/' + requestDataObj.service + '/_schema/' + requestDataObj.table,
                        params: {
                            refresh: true
                        }
                    });
                };

                scope.updTable = function () {

                    scope.currentCreateTable = new TableDat();

                    scope.table.currentService = {
                        name: scope.currentService
                    };
                    scope.currentCreateTable.setData(scope.table);
                    scope.currentCreateTable.update();

                };

                scope.$on('table:navigation:edit', function(event, args) {

                    NavigationService.setStep('edit');

                    scope.currentService = args.value.service;

                    scope.showEditView = true;
                    scope.selView = NavigationService.getStep();

                    scope.currentTable = args.value;
                    scope.lastTable = angular.copy(scope.currentTable);

                    scope._getTable(args.value);
                });


                scope.$on('table:navigation:field', function(event, args) {
/*
                    NavigationService.setStep('create');
                    scope.showCreateView = true;
                    scope.selView = NavigationService.getStep();
                    scope.currentService = args.value.service;
                    scope.currentUploadSchema = null;
                    scope.table = scope.currentCreateTable;
*/
                });


            }
        }
      }])


      .directive('dfTableViewJson', ['MOD_SCHEMA_ASSET_PATH', '$timeout', function (MOD_SCHEMA_ASSET_PATH, $timeout) {

        return {
            restrict: 'E',
            scope: {
                tableData: '=',
            },
            require: '^^dfTableTemplate',
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-table-json-view.html',
            controller: function($scope) {

            },

            link: function (scope, elem, attrs, templateCtrl) {

                scope.jsonSelected = templateCtrl.selectedView;
/*
                scope.jsonSelected = false;

                if (templateCtrl.selectedView === 'json') {
                    scope.jsonSelected = true;
                }
*/
            }
        }
      }])

    .directive('dfTableFields', ['MOD_SCHEMA_ASSET_PATH', 'NavigationService', function (MOD_SCHEMA_ASSET_PATH, NavigationService) {

        return {
            restrict: 'E',
            scope: {
                tableData: '=',
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



                scope.addField = function () {

                  NavigationService.setStep('field');

                  scope.viewMode = 'field';
                  //scope.currentService = args.value.service;
                  scope.showFieldView = true;
                  scope.selView = NavigationService.getStep();

/*
                  var naviObj = {
                      type: 'field',
                      value: {
                          field: field
                      }
                  }
*/
                  scope.$emit('table:navigation:field:new', {});

                }

                scope.editField = function (field) {

                    NavigationService.setStep('field');

                    scope.viewMode = 'field';

                    //scope.currentService = args.value.service;

                    scope.showFieldView = true;
                    scope.selView = NavigationService.getStep();

                    var naviObj = {
                        type: 'field',
                        value: {
                            field: field
                        }
                    }

                    scope.$emit('table:navigation:field:edit', naviObj);
                    //scope.$broadcast('table:navigation:field:edit', naviObj);
                    //scope.currentTable = args.value;
                    //scope.lastTable = angular.copy(scope.currentTable);

                }

                // Populate Fields table
                scope.fieldTableData = [];

                var fieldDataSubscribe = scope.$watch('tableData', function(newValue, oldValue) {

                    scope.fieldTableData = newValue;
                });

                scope.$on('$destroy', function () {
                    fieldDataSubscribe();
                });
            }
        }
    }])

    .directive('dfTableRelationships', ['MOD_SCHEMA_ASSET_PATH', function (MOD_SCHEMA_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: {
                tableData: '=',
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

                // Populate Fields table
                scope.relationshipTableData = [];

                var relationshipDataSubscribe = scope.$watch('tableData', function(newValue, oldValue) {

                    scope.relationshipTableData = newValue;
                });


                scope.$on('$destroy', function () {
                    relationshipDataSubscribe();
                });
            }
        }
    }])

    .directive('dfTableDetails', ['MOD_SCHEMA_ASSET_PATH', 'INSTANCE_URL', 'dfNotify', '$http', 'dfObjectService', 'dfApplicationData', '$timeout', 'TableDataModel', function (MOD_SCHEMA_ASSET_PATH, INSTANCE_URL, dfNotify, $http, dfObjectService, dfApplicationData, $timeout, TableDataModel) {

        return {
            restrict: 'E',
            scope: {
                tableData: '=',
                table: '=?bindTable'
            },
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-table-details.html',
            controller: function($scope) {

                this.removeField = function () {

                    $scope.table.record.field.pop();
                }

                $scope.propertyName = 'type';
                $scope.reverse = true;

                $scope.sortBy = function(propertyName) {
                    $scope.reverse = ($scope.propertyName === propertyName) ? !$scope.reverse : false;
                    $scope.propertyName = propertyName;
                };
            },

            link: function (scope, elem, attrs) {


                var Table = function (tableData) {

                    var _new = {
                        name: null,
                        label: null,
                        plural: null,
                        primary_key: null,
                        name_field: null,
                        related: [],
                        access: [],
                        field: [
                            {
                                name: 'example_field',
                                label: 'Example Field',
                                type: 'string'
                            }
                        ]
                    };

                    tableData = tableData || _new;

                    return {

                        __dfUI: {
                            newTable: tableData.name === null
                        },
                        record: angular.copy(tableData),
                        recordCopy: angular.copy(tableData),
                        currentService: tableData.currentService
                    }
                };

                var ManagedFieldData = function (fieldData) {

                    return {
                        __dfUI: {
                            newField: !fieldData
                        },
                        record: fieldData || null,
                        currentService: scope.table.currentService
                    }
                }

                var ManagedRelationData = function (relationData) {

                    return {
                        __dfUI: {
                            newRelation: !relationData
                        },
                        record: relationData || null,
                        currentService: scope.table.currentService
                    }
                }

                //scope.table = null;
                scope.currentEditField = null;
                scope.currentEditRelation = null;
                scope.viewMode = 'table';
                scope.editor = null;
                scope.isEditorClean = true;
                scope.isEditable = true;

                // PUBLIC API
                scope.editField = function (fieldData) {

                    scope._editField(fieldData);
                };

                scope.addField = function () {

                    scope._addField();
                };

                scope.deleteField = function (field) {

                    if (dfNotify.confirm('Are you sure you want to delete field ' + field.name + '?')) {

                        scope._deleteField(field);
                    }
                };

                scope.editRelation = function (relationData) {

                    scope._editRelation(relationData);
                };

                scope.addRelation = function (relationData) {

                    scope._addRelation(relationData);
                };

                scope.deleteRelation = function (relationData) {

                    if (dfNotify.confirm('Are you sure you want to delete relationship ' + relationData.name + '?')) {

                        scope._deleteRelation(relationData);
                    }
                };

                scope.closeTable = function () {

                    scope._closeTable();
                };

                scope.saveTable = function () {

                    scope._saveTable();
                };

                scope.updateTable = function () {

                    scope._updateTable();
                };

                scope.clearTable = function () {

                    scope._clearTable();
                };

                scope.setPrimaryKey = function (field) {

                    scope._setPrimaryKey(field);
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

                scope.checkJSON = function () {

                    scope._checkJSON();
                };


                // PRIVATE API
                scope._saveTableToServer = function (requestDataObj) {

                    return $http({
                        method: 'POST',
                        url: INSTANCE_URL + '/api/v2/' + requestDataObj.path + '?fields=*',
                        data: {"resource": [requestDataObj.data]}
                    });
                };

                scope._updateTableToServer = function (requestDataObj) {

                    return $http({
                        method: 'PUT',
                        url: INSTANCE_URL + '/api/v2/' + requestDataObj.path + '?fields=*',
                        data: {"resource": [requestDataObj.data]}
                    })
                };

                scope._deleteFieldFromTableOnServer = function (requestDataObj) {

                    return $http({
                        method: 'DELETE',
                        url: INSTANCE_URL + '/api/v2/' + requestDataObj.path
                    })

                };

                scope._deleteRelationFromTableOnServer = function (requestDataObj) {

                    return $http({
                        method: 'DELETE',
                        url: INSTANCE_URL + '/api/v2/' + requestDataObj.path
                    })

                };

                scope._clearTable = function () {

                  var confirmRes = dfNotify.confirmNoSave();

                  if (confirmRes) {

                      scope.table.record = {};
                  }

                };


                scope._validateJSON = function () {

                    try {
                        var result = JSON.parse(scope.editor.getValue());

                        if (result) {

                            scope.editor.setValue(angular.toJson(result, true), -1);
                            return true;
                        }
                    }
                    catch (e) {

                        return false;
                    }
                };

                // Had to update the app obj manually via this function.
                // faster than asking the server for all the services with their
                // components.  Trust me Kage.  Its the only way.
                scope._insertNewTableToAppObj = function (resource) {

                    var appObj = dfApplicationData.getApplicationObj();

                    if (appObj.apis.hasOwnProperty('service') && appObj.apis.service.hasOwnProperty('resource')) {

                        for (var i = 0; i < appObj.apis.service.resource.length; i++) {

                            if (appObj.apis.service.resource[i].name === scope.tableData.currentService.name) {

                                appObj.apis.service.resource[i].components.push({
                                    'name': resource.name,
                                    'label': resource.label
                                });
                                break;
                            }
                        }
                    }

                    dfApplicationData.setApplicationObj(appObj);
                }


                // COMPLEX IMPLEMENTATION
                scope._editField = function (fieldData) {

                    scope.table.__dfUI.newField = false;
                    scope.currentEditField = new ManagedFieldData(fieldData);
                };

                scope._addField = function () {

                    scope.table.__dfUI.newField = true;
                    scope.table.record.field.push({});
                    scope.currentEditField = new ManagedFieldData(scope.table.record.field[scope.table.record.field.length - 1]);
                };

                scope._deleteField = function (field) {

                    if (scope.table.__dfUI.newTable) {
                        var i = 0;
                        while (i < scope.table.record.field.length) {

                            if (scope.table.record.field[i].name === field.name) {
                                scope.table.record.field.splice(i, 1);
                                break;
                            }

                            i++;
                        }
                        scope.table.recordCopy = angular.copy(scope.table.record);
                        return;
                    };

                    var requestDataObj = {

                        path: scope.tableData.currentService.name + '/_schema/' + scope.table.record.name + '/_field/' + field.name
                    };

                    scope._deleteFieldFromTableOnServer(requestDataObj).then(
                        function (result) {

                            var i = 0;
                            while (i < scope.table.record.field.length) {

                                if (scope.table.record.field[i].name === field.name) {
                                    scope.table.record.field.splice(i, 1);
                                    break;
                                }

                                i++
                            }

                            scope.table.recordCopy = angular.copy(scope.table.record);

                            var messageOptions = {
                                module: 'Schema',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Field deleted.'
                            };

                            dfNotify.success(messageOptions);

                        },
                        function (reject) {


                            var messageOptions = {
                                module: 'Schema',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);

                        }
                    )
                };

                scope._editRelation = function (relationData) {

                    scope.currentEditRelation = new ManagedRelationData(relationData);
                };

                scope._addRelation = function () {
                    scope.table.record.related.push({is_virtual: true});
                    scope.currentEditRelation = new ManagedRelationData(scope.table.record.related[scope.table.record.related.length - 1]);
                };

                scope._deleteRelation = function (relation) {

                    if (scope.table.__dfUI.newTable) {
                        var i = 0;
                        while (i < scope.table.record.related.length) {

                            if (scope.table.record.related[i].name === relation.name) {
                                scope.table.record.related.splice(i, 1);
                                break;
                            }

                            i++;
                        }
                        scope.table.recordCopy = angular.copy(scope.table.record);
                        return;
                    };

                    var requestDataObj = {

                        path: scope.tableData.currentService.name + '/_schema/' + scope.table.record.name + '/_related/' + relation.name
                    };

                    scope._deleteRelationFromTableOnServer(requestDataObj).then(
                        function (result) {

                            var i = 0;
                            while (i < scope.table.record.related.length) {

                                if (scope.table.record.related[i].name === relation.name) {
                                    scope.table.record.related.splice(i, 1);
                                    break;
                                }

                                i++
                            }

                            scope.table.recordCopy = angular.copy(scope.table.record);

                            var messageOptions = {
                                module: 'Schema',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Relationship deleted.'
                            };

                            dfNotify.success(messageOptions);

                        },
                        function (reject) {


                            var messageOptions = {
                                module: 'Schema',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);

                        }
                    )
                };

                scope._closeTable = function () {

                    if (!dfObjectService.compareObjectsAsJson(scope.table.record, scope.table.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return false;
                        }
                    }


                    scope.table = null;
                    scope.tableData = null;
                    scope.currentEditField = null;
                    scope.currentEditRelation = null;
                };

                scope._saveTable = function () {

                    var requestDataObj = {
                        params: {
                            include_schema: true
                        },
                        data: scope.table.record,
                        path: scope.tableData.currentService.name + '/_schema'
                    };

                    scope._saveTableToServer(requestDataObj).then(
                        function (result) {

                            var messageOptions = {
                                module: 'Schema',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Table saved successfully.'
                            };

                            var newTable = result.data.resource[0];

                            scope.$emit('update:components', newTable);

                            scope._insertNewTableToAppObj(newTable);

                            var service = scope.table.currentService;
                            scope.table = new Table(newTable);
                            TableDataModel.setTableModel(new Table(newTable));
                            scope.table.currentService = service;

                            dfApplicationData.updateServiceComponentsLocal(service);
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
                    )
                };

                scope._updateTable = function () {

                    var requestDataObj = {
                        params: {
                            include_schema: true
                        },
                        data: scope.table.record,
                        path: scope.tableData.currentService.name + '/_schema'
                    };


                    scope._updateTableToServer(requestDataObj).then(
                        function (result) {

                            var messageOptions = {
                                module: 'Schema',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Table updated successfully.'
                            };

                            var newTable = result.data.resource[0];

                            var service = scope.table.currentService;
                            scope.table = new Table(newTable);
                            TableDataModel.setTableModel(new Table(newTable));
                            scope.table.currentService = service;

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
                    )
                };

                scope._setPrimaryKey = function (field) {

                    var i = 0;

                    // Find current primary key
                    while (i < scope.table.record.field.length) {

                        if (scope.table.record.field[i].is_primary_key) {

                            // set to false
                            scope.table.record.field[i].is_primary_key = false;
                            break;
                        }

                        i++
                    }

                    // Set passed field to primary key
                    field.is_primary_key = true;
                    scope.table.record.primary_key = field.name;
                };

                scope._toggleViewMode = function () {

                    scope.viewMode = scope.viewMode === 'json' ? 'table' : 'json';

                    if (scope.viewMode === 'table') {

                        scope.table.record = angular.fromJson(scope.editor.getValue());
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


                // WATCHERS
                var watchTableData = scope.$watch('tableData', function (newValue, oldValue) {

                    if (newValue === null) return;

                    scope.table = newValue.__dfUI.newTable ? new Table() : new Table(newValue.record);
                    TableDataModel.setTableModel(new Table(scope.table));
                    scope.table.currentService = newValue.currentService;

                    scope.$broadcast('schema:tabledata', scope.table);
                });

                var listener = function () {

                    $timeout(function () {
                        if (!scope.editor.session.$annotations) return;
                        var canDo = scope.editor.session.$annotations.some(function (item) {
                            if (item.type === 'error') return true;
                            else return false;
                        });

                        if (canDo) {
                            $('.save-schema-btn').addClass('disabled');
                        } else {
                            $('.save-schema-btn').removeClass('disabled');
                        }
                    }, 500);
                }

                var editorWatch = scope.$watch('editor', function (newValue) {

                    if (!newValue) {
                        return;
                    }

                    scope.$watch(function () {

                        return scope.editor.session.$annotations;
                    }, function () {
                        listener();
                    });

                    scope.editor.on('input', function () {

                        if (!scope.editor.getValue()) {

                            $('.save-schema-btn').addClass('disabled');
                            return;
                        }
                        listener();
                    });
                });


                // MESSAGES
                scope.$on('$destroy', function (e) {
                    editorWatch();
                    watchTableData();
                });

                scope.$on('update:managedtable', function (e) {

                     scope.table = new Table(scope.table.record);
                     TableDataModel.setTableModel(new Table(scope.table.record));
                })
            }
        }
    }])


    .directive('dfFieldDetails', ['MOD_SCHEMA_ASSET_PATH', 'INSTANCE_URL', '$http', 'dfNotify', 'dfObjectService', 'dfApplicationData', 'FieldModel', 'FieldDat', 'FieldOptions', function (MOD_SCHEMA_ASSET_PATH, INSTANCE_URL, $http, dfNotify, dfObjectService, dfApplicationData, FieldModel, FieldDat, FieldOptions) {

        return {
            restrict: 'E',
            scope: {
                fieldData: '=',
                currentTable: '='
            },
            require: '^^dfTableTemplate',
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-field-details.html',
            link: function (scope, elem, attrs, dfTableTemplateCtrl) {

              scope.field = null;

              scope.typeOptions = FieldOptions.typeOptions;
              scope.returnTypeOptions = FieldOptions.returnTypeOptions;
              scope.helpText = FieldOptions.helpText

              scope.updField = function (value) {

                  //console.log('updField ' + value);
              }

              scope.closeField = function (value) {

                  //console.log('closeField ' + value);
              }

              var watchFieldData = scope.$watch('fieldData', function (newValue, oldValue) {

                  if (!newValue) return;

                  scope.field = new FieldDat(scope.fieldData);
/*
                  scope.field = newValue.__dfUI.newField ? new FieldDat() : new FieldDat(newValue.record);

                  if (!newValue.record.ref_table) {
                      scope.refFields = null;
                  }
*/
              });


/*
              scope.$on('table:navigation:field:edit', function(event, args) {
                  scope.field = new FieldModel(args, 'mysql3');
                  console.log(scope.field);
              });
*/
/*


                scope.refTables = null;
                scope.refFields = null;
                //scope.fieldData = null;

                // PUBLIC API
                scope.closeField = function (noConfirm) {

                    if (!dfObjectService.compareObjectsAsJson(scope.field.record, scope.field.recordCopy)) {

                        if (!noConfirm && dfNotify.confirmNoSave()) {

                          // Remove the temporary field inserted in the table
                          if (angular.equals(scope.field.recordCopy, {})) {
                              dfTableDetailsCtrl.removeField();
                          }
                          // Undo changes to field record object
                          scope.field.record = angular.copy(scope.field.recordCopy);
                          //dfObjectService.deepMergeObjects(scope.field.recordCopy, scope.field.record);
                        }

                        scope._closeField();
                    }
                    else {

                        if (angular.equals(scope.field.record, {})) {
                            dfTableDetailsCtrl.removeField();
                        }

                        scope._closeField();
                    }
                };

                scope.saveField = function (newTable) {

                    scope._saveField(newTable);
                }

                scope.changeForeignKey = function () {
                    if (!scope.field.record.is_foreign_key) {
                        scope.field.record.ref_table = null;
                        scope.field.record.ref_field = null;
                        scope.refTables = null;
                        scope.refFields = null;
                    } else {
                        scope._loadReferenceTables();
                        scope._loadReferenceFields();
                    }
                };

                // PRIVATE API
                scope._loadReferenceTables = function () {

                    $http.get(INSTANCE_URL + '/api/v2/' + scope.fieldData.currentService.name + '/_schema/').then(
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

                    $http.get(INSTANCE_URL + '/api/v2/' + scope.fieldData.currentService.name + '/_schema/' + scope.field.record.ref_table).then(
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
                    )

                };

                scope._saveFieldToServer = function () {

                    var recordObj = angular.copy(scope.field.record);
                    var service = scope.$parent.$parent.currentService.name;

                    return $http({
                        url: INSTANCE_URL + '/api/v2/' + service + '/_schema/' + scope.currentTable + '/' + recordObj.name,
                        method: 'PATCH',
                        data: recordObj
                    }).then(
                        function (result) {
                            // Refresh the table
                            scope.$emit('refresh:table');
                        }
                    );
                };

                // COMPLEX IMPLEMENTATION
                scope._closeField = function () {
                    scope.fieldData = null;
                    scope.$parent.$parent.getTable();
                };

                scope._saveField = function (newTable) {

                    newTable = newTable || false;

                    if (newTable === true) return;

                    scope._saveFieldToServer().then(
                        function (result) {

                            var messageOptions = {
                                module: 'Schema',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Field saved.'
                            };

                            dfNotify.success(messageOptions);

                            // Reset field object
                            if (scope.field !== null) {
                                scope.field = new Field(scope.field.record);
                            }
                        },

                        function (reject) {

                            var messageOptions = {
                                module: 'Schema',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                        }
                    );
                };

                // WATCHERS
                var watchFieldData = scope.$watch('fieldData', function (newValue, oldValue) {

                    if (!newValue) return;

                    scope.field = newValue.__dfUI.newField ? new Field() : new Field(newValue.record);

                    if (!newValue.record.ref_table) {
                        scope.refFields = null;
                    }
                });


*/

                // MESSAGES
                scope.$on('$destroy', function (e) {

                    watchFieldData();
                });

            }

        }
    }])

    .directive('dfRelationDetails', ['MOD_SCHEMA_ASSET_PATH', 'INSTANCE_URL', '$http', 'dfNotify', 'dfObjectService', 'dfApplicationData', function (MOD_SCHEMA_ASSET_PATH, INSTANCE_URL, $http, dfNotify, dfObjectService, dfApplicationData) {

          return {
            restrict: 'E',
            scope: {
                relationData: '=',
                currentTable: '=',
                schemaData: '&'
            },
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-relation-details.html',
            link: function (scope, elem, attrs) {

                var Relation = function (relationData) {

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

                    relationData = relationData || _new;

                    return {
                        __dfUI: {
                            newRelation: relationData.type == null
                        },
                        record: relationData,
                        recordCopy: angular.copy(relationData)
                    }
                };

                var Service = function (schemaData) {

                    function getSchemaComponents(array) {

                        var service = [];

                        angular.forEach(array, function (component) {

                            // setup object to be pushed onto services
                            var componentObj = {
                                __dfUI: {
                                    newTable: false
                                },
                                id: component.id,
                                name: component.name,
                                label: component.label
                            };

                            service.push(componentObj);
                        });

                        return service;
                    }

                    return {
                        __dfUI: {
                            unfolded: false
                        },
                        id: schemaData.id,
                        name: schemaData.name,
                        label: schemaData.label,
                        components: getSchemaComponents(schemaData.components),
                        updateComponents: function (array) {

                            this.components = getSchemaComponents(array);
                        }
                    }
                };

                scope.typeOptions = [
                    {name: "Belongs To", value: "belongs_to"},
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

                    scope._saveRelation(newTable);
                    scope._closeRelation();
                }

                scope.changeReferenceService = function () {
                    scope.relation.record.ref_table = null;
                    scope.relation.record.ref_field = null;
                    scope._loadReferenceTables();
                    scope._loadReferenceFields();
                };

                // PRIVATE API
                scope._loadFields = function () {

                    if (scope.currentTable === null || scope.$parent.table.__dfUI.newTable === true) {
                        scope.fields = scope.$parent.table.record.field
                        return;
                    }

                    $http.get(INSTANCE_URL + '/api/v2/' + scope.relationData.currentService.name + '/_schema/' + scope.currentTable + '/_field/').then(
                        function (result) {

                            scope.fields = result.data.resource;
                        },
                        function (reject) {
                            /*
                            var messageOptions = {

                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                            */

                            scope.fields = scope.$parent.table.record.field;
                        }
                    )

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

                    return scope.relationData.currentService.name;
                };

                scope._loadReferenceTables = function () {

                    var ref_service_name = scope._getServiceNameFromId(scope.relation.record.ref_service_id);

                    $http.get(INSTANCE_URL + '/api/v2/' + ref_service_name + '/_schema/').then(
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

                    $http.get(INSTANCE_URL + '/api/v2/' + ref_service_name + '/_schema/' + scope.relation.record.ref_table).then(
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
                    )

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

                    $http.get(INSTANCE_URL + '/api/v2/' + ref_service_name + '/_schema/').then(
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

                    $http.get(INSTANCE_URL + '/api/v2/' + ref_service_name + '/_schema/' + scope.relation.record.junction_table).then(
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
                    )

                };


                scope._saveRelationToServer = function () {

                    var recordObj = {
                        related: [angular.copy(scope.relation.record)]
                    };

                    var service = scope.$parent.$parent.currentService.name;

                    return $http({
                        url: INSTANCE_URL + '/api/v2/' + service + '/_schema/' + scope.currentTable,
                        method: 'PATCH',
                        data: recordObj
                    }).then(
                        function (result) {

                            // Refresh the table
                            scope.$emit('refresh:table');
                        }
                    );

                    scope._closeRelation();
                };


                // COMPLEX IMPLEMENTATION
                scope._closeRelation = function () {

                    scope.relationData = null;
                    scope.$parent.$parent.getTable();
                };

                scope._saveRelation = function (newTable) {

                    newTable = newTable || false;

                    if (newTable === true) return;

                    scope._saveRelationToServer().then(
                        function (result) {

                            var messageOptions = {
                                module: 'Schema',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Relation saved.'
                            };

                            dfNotify.success(messageOptions);

                            // Reset relation object
                            scope.relation = new Relation(scope.relation.record);
                        },

                        function (reject) {


                            var messageOptions = {
                                module: 'Schema',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);

                        }
                    );
                };

                // WATCHERS
                var watchRelationData = scope.$watch('relationData', function (newValue, oldValue) {

                    if (!newValue) return;

                    scope.relation = newValue.__dfUI.newRelation ? new Relation() : new Relation(newValue.record);

                    if (!scope.fields) {
                        scope._loadFields();
                    }
                    if (newValue.record.ref_table) {
                        scope._loadReferenceTables();
                        scope._loadReferenceFields();
                    } else {
                        scope.refFields = null;
                    }
                    if (newValue.record.junction_table) {
                        scope._loadJunctionTables();
                        scope._loadJunctionFields();
                    } else {
                        scope.junctionFields = null;
                    }
                });

                scope.$watch('schemaData', function(newValue) {

                    if (!newValue) return;

                    scope.refServices = newValue;
                });

                scope.helpText = {
                    'is_virtual': {
                        title: 'Is Virtual Relationship',
                        text: 'Is this a virtual relationship. See <a href="http://wiki.dreamfactory.com/DreamFactory/Features/Database/Schema#Database_Functions" target="_blank">here</a> for more info.'
                    }
                };


                // MESSAGES
                scope.$on('$destroy', function (e) {

                    watchRelationData();
                });

            }
        }
    }])

    .directive('dfSchemaNavigator', ['MOD_SCHEMA_ASSET_PATH', 'dfApplicationData', 'ServiceListService', 'StateService', 'TableListService', 'NavigationService', function (MOD_SCHEMA_ASSET_PATH, dfApplicationData, ServiceListService, StateService, TableListService, NavigationService) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-schema-navigator.html',
            link: function (scope, elem, attrs) {

                //ServiceListService.getServices();

                scope.serviceSelect = function() {

                    StateService.set('dfservice', scope.currentService);
                    TableListService.getTableList();
                }

                scope.tableSelect = function(test) {

                    StateService.set('dftable', scope.currentTable);

                    var naviObj = {
                        type: 'tableSelect',
                        value: {
                            table: scope.currentTable,
                            service: scope.currentService.name
                        }
                    }

                    NavigationService.setStep('edit');
                    scope.$broadcast('table:navigation:edit', naviObj);
                }

                scope.reload = function() {
                    ServiceListService.getServices();
                }

                scope.navigationSelect = function (selected) {

                    var naviObj = {
                        type: selected,
                        value: {
                            service: scope.currentService.name
                        }
                    }

                    scope.$broadcast('table:navigation:' + selected, naviObj);
                }
            }
        }
    }])

    .directive('dfSchemaEditor', ['MOD_SCHEMA_ASSET_PATH', function (MOD_SCHEMA_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-schema-editor.html',
            link: function (scope, elem, attrs) {
            }
        }
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
        }
    }])

    .directive('dfUploadSchema', ['MOD_SCHEMA_ASSET_PATH', 'dfNotify', '$timeout', 'ServiceListService', 'SchemaJSONData', function (MOD_SCHEMA_ASSET_PATH, dfNotify, $timeout, ServiceListService, SchemaJSONData) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-upload-schema.html',
            link: function (scope, elem, attrs) {


                scope.uploadEditor = null;
                scope.uploadIsEditorClean = true;
                scope.uploadIsEditable = true;

                scope.uploadSchemaData = SchemaJSONData.schemaJSON;

/*
                scope.uploadSchemaData = {
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
*/

                var listener = function () {

                    $timeout(function () {

                        if (!scope.uploadEditor.session.$annotations) return;
                        var canDo = scope.uploadEditor.session.$annotations.some(function (item) {
                            if (item.type === 'error') return true;
                            else return false;
                        });

                        if (canDo) {
                            $('.btn-upload-schema').addClass('disabled');
                        } else {
                            $('.btn-upload-schema').removeClass('disabled');
                        }
                    }, 500);
                }

                var editorWatch = scope.$watch('uploadEditor', function (newValue) {

                    if (!newValue) {
                        return;
                    }

                    scope.$watch(function () {
                        return scope.uploadEditor.session.$annotations;
                    }, function () {
                        listener();
                    });

                    scope.uploadEditor.on('input', function (value) {

                        if (scope.uploadEditor && !scope.uploadEditor.getValue()) {

                            $('.btn-upload-schema').addClass('disabled');
                            return;
                        }
                        listener();
                    });
                });

                scope.uploadSchema = function () {

                    scope._uploadSchema();
                };

                scope.closeUploadSchema = function () {

                    scope._closeUploadSchema();
                }


                scope._uploadSchema = function () {

                    var requestDataObj = {
                        params: {
                            include_schema: true
                        },
                        data: angular.fromJson(scope.uploadEditor.getValue())
                    }

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


                            scope.uploadEditor.session.getUndoManager().reset();
                            scope.uploadEditor.session.getUndoManager().markClean();
                            scope.uploadIsEditorClean = true;

                            ServiceListService.getServices();
                            //scope.refreshService(true);
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
                    )
                }

                scope._closeUploadSchema = function () {

                    if (!scope.uploadIsEditorClean) {
                        if (!dfNotify.confirm('You have unsaved changes.  Continue without saving?')) {

                            return;
                        }
                        else {
                            scope.$parent.currentUploadSchema = null;
                        }
                    }

                    scope.$parent.currentUploadSchema = null;

                }
            }
        }
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
