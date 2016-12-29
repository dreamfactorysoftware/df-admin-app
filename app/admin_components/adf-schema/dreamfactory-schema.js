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

    .run(['INSTANCE_URL', '$templateCache', 'tableManager', 'StateService', 'tableListManager', function (INSTANCE_URL, $templateCache, tableManager, StateService, tableListManager) {



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

            if (!currentService) return

            for (var i = 0; i < currentService.components.length; i++) {

                //if (currentService.components[i].name === $scope.currentTable) {
                    //tableObj = currentService.components[i]
                //}
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
                    //if (tableObj) {
                    //    $scope.currentTable = tableObj.name;
                    //    $scope.getTable();
                    //}
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


    .factory('TableList', ['$http', 'INSTANCE_URL', function($http, INSTANCE_URL) {
        function TableList(tableData) {
            if (tableData) {
                this.setData(tableData);
            }
        };
        TableList.prototype = {
            setData: function(tableData) {
                angular.extend(this, tableData);
            },
            delete: function() {
                $http.delete(INSTANCE_URL + '/api/v2/' + params.service + '/_schema/' + params.table);
            },
            update: function(params) {

                $http.put(INSTANCE_URL + '/api/v2/' + params.service + '/_schema/' + params.table, this);
            },
            isAvailable: function() {
                if (!this.table.stores || this.table.stores.length === 0) {
                    return false;
                }
                return this.table.stores.some(function(store) {
                    return store.quantity > 0;
                });
            }
        };
        return TableList;
    }])


    .factory('tableListManager', ['INSTANCE_URL', '$http', '$q', 'TableList', 'StateService', function(INSTANCE_URL, $http, $q, TableList, StateService) {
        var tableListManager = {
            _pool: {},
            _retrieveInstance: function(serviceName, tableData) {
                var instance = this._pool[serviceName];

                if (instance) {
                    instance.setData(tableData);
                } else {
                    instance = new TableList(tableData);
                    this._pool[serviceName] = instance;
                }

                return instance;
            },
            _search: function(serviceName) {
                return this._pool[serviceName];
            },
            _load: function(serviceName, deferred) {
                var scope = this;

                $http.get(INSTANCE_URL + '/api/v2/' + serviceName + '/_schema')
                    .success(function(tablesArray) {

                        var tables = [];

                        if (Array.isArray(tablesArray.resource)) {
                            tablesArray.resource.forEach(function(tableData) {
                                var table = scope._retrieveInstance(serviceName, tableData.resource);
                                tables.push(table);
                            });
                        }
                        else {
                            tables = tablesArray;
                        }

                        //var table = scope._retrieveInstance(serviceName, tableData.resource);
                        deferred.resolve(tables);
                    })
                    .error(function() {
                        deferred.reject();
                    });
            },
            /* Public Methods */
            /* Use this function in order to get a book instance by it's id */
            getTableList: function(serviceName) {
                var deferred = $q.defer();
                var table = this._search(serviceName.name);
                if (table) {
                    deferred.resolve(table);
                } else {
                    this._load(serviceName.name, deferred);
                }
                return deferred.promise;
            },
            /* Use this function in order to get instances of all the books */
            loadAllTables: function(serviceName) {
                var deferred = $q.defer();
                var scope = this;
                $http.get(INSTANCE_URL + '/api/v2/' + serviceName.name + '/_schema')
                    .success(function(tablesArray) {
                        var tables = [];

                        if (Array.isArray(tablesArray.resource)) {
                            tablesArray.resource.forEach(function(tableData) {
                                var table = scope._retrieveInstance(serviceName.name, tableData);
                                tables.push(table);
                            });
                        }
                        else {
                            tables = tablesArray;
                        }

                        deferred.resolve(tables);
                    })
                    .error(function() {
                        deferred.reject();
                    });
                return deferred.promise;
            },
            /*  This function is useful when we got somehow the book data and we wish to store it or update the pool and get a book instance in return */
            setTableList: function(tableData, params) {
                var scope = this;
                var table = this._search(tableData.name);
                if (table) {
                    table.setData(tableData);
                    table.update({
                        service: StateService.get('dfservice'),
                        table: StateService.get('dftable')
                    });
                } else {
                    table = scope._retrieveInstance(tableData);
                }
                return table;
            },

        };
        return tableListManager;
    }])

    .factory('TableDat', ['INSTANCE_URL', '$http', 'dfNotify', 'TableUtilities', 'StateService', function(INSTANCE_URL, $http, dfNotify, TableUtilities, StateService) {

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
                  newTable: (tableObj.tableData === undefined) //|| !(tableObj.name === undefined) //!tableObj.tableData
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

                return $http({
                    method: 'POST',
                    url: INSTANCE_URL + '/api/v2/' + this.currentService.name + '/_schema' + '?fields=*',
                    data: {"resource": [this.record]}
                })/*.then(
                    function (result) {

                        var messageOptions = {
                            module: 'Schema',
                            type: 'success',
                            provider: 'dreamfactory',
                            message: 'Table saved successfully.'
                        };

                        var newTable = result.data.resource[0];

//                        TableUtilities.insertNewTableToAppObj(newTable, self.currentService.name);

//                        TableUtilities.updateServiceComponents(newTable, self.currentService);

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
                )*/
            },
            load: function(id) {

              return this.record;
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



    .factory('Table', ['$q', '$http', 'INSTANCE_URL', 'dfNotify', function($q, $http, INSTANCE_URL, dfNotify) {
        function Table(tableData) {
            if (tableData) {
                this.setData(tableData);
            }
        };
        Table.prototype = {
            setData: function(tableData) {
                angular.extend(this, tableData);
            },
            delete: function(params) {

                  return $http.delete(INSTANCE_URL + '/api/v2/' + params.service + '/_schema/' + params.table);

            },
            update: function(params) {

                $http.put(INSTANCE_URL + '/api/v2/' + params.service + '/_schema/' + params.table, this);
            },
            update1: function(params, data) {
                var deferred = $q.defer();

                $http.put(INSTANCE_URL + '/api/v2/' + params.service + '/_schema/' + params.table, this)
                .success(function () {

                    var messageOptions = {
                        module: 'Schema',
                        type: 'success',
                        provider: 'dreamfactory',
                        message: 'Table saved successfully.'
                    };

                    dfNotify.success(messageOptions);

                    deferred.resolve(true);
                })
                .error(function (reject) {

                  var messageOptions = {

                      module: 'Api Error',
                      type: 'error',
                      provider: 'dreamfactory',
                      message: reject
                  };

                  dfNotify.success(messageOptions);

                  deferred.reject();
                });

                return deferred.promise;
            },
            getImageUrl: function(width, height) {
                return 'our/image/service/' + this.book.id + '/width/height';
            },
            isAvailable: function() {
                if (!this.table.stores || this.table.stores.length === 0) {
                    return false;
                }
                return this.table.stores.some(function(store) {
                    return store.quantity > 0;
                });
            }
        };
        return Table;
    }])


    .factory('tableManager', ['INSTANCE_URL', '$http', '$q', 'Table', 'StateService', 'dfNotify', function(INSTANCE_URL, $http, $q, Table, StateService, dfNotify) {
        var tableManager = {
            _pool: {},
            _retrieveInstance: function(tableName, tableData) {
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

                $http.get(INSTANCE_URL + '/api/v2/' + params.service + '/_schema/' + params.table)
                    .success(function(tableData) {

                        var table = scope._retrieveInstance(tableData.name, tableData);
                        deferred.resolve(table);
                    })
                    .error(function() {
                        deferred.reject();
                    });
            },
            _delete: function(params) {

                return $http.delete(INSTANCE_URL + '/api/v2/' + params.service.name + '/_schema/' + params.table);
            },
            /* Public Methods */
            /* Use this function in order to get a book instance by it's id */
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
            /* Use this function in order to get instances of all the books */
            loadAllTables: function(params) {
                var deferred = $q.defer();
                var scope = this;
                $http.get(INSTANCE_URL + '/api/v2/' + params.service + '/_schema/' + params.table)
                    .success(function(tablesArray) {
                        var tables;

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
                    })
                    .error(function() {
                        deferred.reject();
                    });
                return deferred.promise;
            },
            /*  This function is useful when we got somehow the book data and we wish to store it or update the pool and get a book instance in return */
            setTable: function(tableData, params) {
                var scope = this;
                var table = this._search(tableData.record.name);
                if (table) {
                    table.setData(tableData);
                    table.update({
                        service: StateService.get('dfservice'),
                        table: StateService.get('dftable')
                    });
                } else {
                    table = scope._retrieveInstance(tableData);
                }
                return table;
            },

            setTable1: function(tableData) {

              var deferred = $q.defer();
                var scope = this;
                var table = this._search(tableData.record.name);

                if (table) {
                    table.setData(tableData);

                    table.update({
                        service: tableData.currentService.name,//StateService.get('dfservice').name,
                        table: tableData.record.name//StateService.get('dftable')
                    }, tableData.record).then(function () {
                        deferred.resolve(table);
                    })

                } else {
                    //table = scope._retrieveInstance(tableData);
                    /**/
                }

                //return table;
                //deferred.resolve(table);
                return deferred.promise;
            },
            deleteTable: function(params) {



                return this._delete(params);
                //return this._delete(params);

                /*
                //$http.delete(INSTANCE_URL + '/api/v2/' + params.service + '/_schema/' + params.table);
                var deferred = $q.defer();

                this._delete(params)
                .success(function (response) {

                    var messageOptions = {
                        module: 'Schema',
                        type: 'success',
                        provider: 'dreamfactory',
                        message: 'Table deleted successfully.'
                    };

                    dfNotify.success(messageOptions);

                    deferred.resolve(response);
                })
                .error(function (reject) {

                  var messageOptions = {

                      module: 'Api Error',
                      type: 'error',
                      provider: 'dreamfactory',
                      message: reject.error.message
                  };

                  dfNotify.success(messageOptions);

                  deferred.reject(reject);

                });

                return deferred.promise;
                */
            }
        };
        return tableManager;
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

                return {
                    __dfUI: {
                        newField: !tableObj ? true : false //!(fieldObj.type !== undefined)
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



    .service('TableObj', function () {

        return function (tableObj, currentService) {

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

            return {
                __dfUI: {
                    newTable: !tableObj ? true : false
                },
                record: tableObj,
                recordCopy: angular.copy(tableObj),
                currentService: currentService
          }
        }
    })

    .service('FieldObj', function () {

        return function (fieldData) {

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

          fieldData = fieldData || _new;

          console.log(fieldData);
          console.log(!fieldData ? true : false);

            return {
                __dfUI: {
                    newTable: !fieldData ? true : false
                },
                record: fieldData,
                recordCopy: angular.copy(fieldData),
                //currentService: currentService
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

/*
        $scope.deleteTable = function () {

            if (dfNotify.confirm('Are you sure you want to drop table ' + $scope.currentEditTable.record.name + '?')) {
                $scope._deleteTable();
            }
        };
*/

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

/*
        $scope._deleteTableFromServer = function (requestDataObj) {

            return $http({
                method: 'DELETE',
                url: INSTANCE_URL + '/api/v2/' + $scope.currentService.name + '/_schema/' + requestDataObj.name
            })
        };
*/

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
            $scope.currentEditTable = new TableObj(null, $scope.currentService);

            TableDataModel.setTableModel(new TableObj(null, $scope.currentService));

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
                    $scope.currentEditTable = new TableObj(result.data, $scope.currentService);
                    TableDataModel.setTableModel(new TableObj(result.data, $scope.currentService));
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

/*
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
*/

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


        // MESSAGES
        $scope.$on('$destroy', function (e) {

            //watchSchemaManagerData();
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


    .directive('dfTableTemplate', ['MOD_SCHEMA_ASSET_PATH', '$q', '$timeout', 'NavigationService', 'Table', 'TableDataModel', 'TableDat', 'FieldDat', function (MOD_SCHEMA_ASSET_PATH, $q, $timeout, NavigationService, Table, TableDataModel, TableDat, FieldDat) {

        return {
            restrict: 'E',
            scope: {
                tableData: '=',
            },
            //require: '^^dfTableEditView',
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-table-template.html',
            transclude: true,
            controllerAs: 'ctrl',
            controller: ['$scope', function TemplateCtrl ($scope) {

                this.selectedView = 'empty';

                var ctrl = this;
                ctrl.childCtrl = [];
                ctrl.register = register;
                ctrl.$onDestroy = onDestroy;

                function register(child, childCtrl) {
                  ctrl.childCtrl[child] = childCtrl;
                  //ctrl.childCtrl.push(childCtrl);
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

                scope.tabelModel = new TableDat();


                scope.$on('table:delete', function(event, args) {

                    //console.log(ctrl.childCtrl['table_edit'].deleteTable(args));

                    ctrl.childCtrl['table_edit'].deleteTable(args).then(
                      function () {

                        NavigationService.setStep('empty');
                        //scope.showCreateView = true;
                        scope.selView = NavigationService.getStep();
                      },
                      function () {

                      }
                    );

                    //NavigationService.setStep('empty');
                    //scope.showCreateView = true;
                    //scope.selView = NavigationService.getStep();
                });

                scope.$on('table:create:form', function(event, args) {
                    NavigationService.setStep('create');
                    scope.showCreateView = true;
                    scope.selView = NavigationService.getStep();
                    //ctrl.childCtrl['table_create'].getTable(args);
                    ctrl.childCtrl['table_create'].getEmpty(args);
                });

                scope.$on('table:edit', function(event, args) {
                    NavigationService.setStep('edit');
                    scope.showCreateView = true;
                    scope.selView = NavigationService.getStep();
                    ctrl.childCtrl['table_edit'].getTable(args);
                });

                scope.$on('table:create:close', function(event, args) {
                    NavigationService.setStep('empty');
                    scope.selView = NavigationService.getStep();
                });

                scope.$on('table:delete:close', function(event, args) {
                    NavigationService.setStep('empty');
                    //scope.showCreateView = true;
                    scope.selView = NavigationService.getStep();
                    //scope.currentService = 0;
                    //scope.currentTable = '';
                    //ctrl.childCtrl['table_edit'].speak('test123')
                });


                scope.$on('table:edit:close', function(event, args) {
                    NavigationService.setStep('empty');
                    //scope.showCreateView = true;
                    scope.selView = NavigationService.getStep();
                    //scope.currentService = 0;
                    //scope.currentTable = '';
                    //ctrl.childCtrl['table_edit'].speak('test123')
                });

                scope.$on('table:navigation1:close', function(event, args) {
                    NavigationService.setStep('empty');
                    scope.selView = NavigationService.getStep();
                });


                scope.$on('table:navigation:edit', function(event, args) {
                    NavigationService.setStep('edit');
                    scope.showEditView = true;
                    scope.selView = NavigationService.getStep();

                    //ctrl.childCtrl['table_edit'].speak('test345');
                });

                scope.$on('table:navigation:create', function(event, args) {
                    NavigationService.setStep('create');
                    scope.showCreateView = true;
                    scope.selView = NavigationService.getStep();
                });

                scope.$on('table:navigation:close', function(event, args) {
                    NavigationService.setStep('empty');
                    //scope.showCreateView = true;
                    scope.selView = NavigationService.getStep();
                    //scope.currentService = 0;
                    //scope.currentTable = '';
                    //ctrl.childCtrl['table_edit'].speak('test123')
                });

                scope.$on('table:navigation:field:edit', function(event, args) {
                    NavigationService.setStep('field');
                    scope.showFieldView = true;
                    scope.selView = NavigationService.getStep();
                    scope.fieldEditData = args.value.field;
                });

                scope.$on('table:navigation:field:create', function(event, args) {
                    NavigationService.setStep('field');
                    scope.showFieldView = true;
                    scope.selView = NavigationService.getStep();
                    scope.fieldEditData = new FieldDat();
                });

                scope.$on('table:navigation:field:close', function(event, args) {
                    NavigationService.setStep('edit');
                    scope.showEditView = true;
                    scope.selView = NavigationService.getStep();
                    //scope.fieldEditData = new FieldDat();

                });
            }
        }
      }])

      .directive('dfTableCreateView', ['INSTANCE_URL', 'MOD_SCHEMA_ASSET_PATH', 'NavigationService', 'Table', 'TableDataModel', '$http', 'dfNotify', 'TableDat', 'dfObjectService', 'StateService', 'dfApplicationData', 'TableUtilities', 'TableObj', function (INSTANCE_URL, MOD_SCHEMA_ASSET_PATH, NavigationService, Table, TableDataModel, $http, dfNotify, TableDat, dfObjectService, StateService, dfApplicationData, TableUtilities, TableObj) {

        return {
            restrict: 'E',
            scope: {
                tableData: '=',
                selectedView: '='
            },
            require: ['dfTableCreateView', '^^dfTableTemplate'],
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-table-create-view.html',
            controller: function($scope) {

                $scope.currentCreateField = null;
                $scope.currentCreateRelation = null;
                $scope.viewMode = 'table';
                $scope.table = {};

                var ctrl = this;

                ctrl.getEmpty = function () {

                    $scope.currentCreateTable = new TableDat();
                    $scope.table = $scope.currentCreateTable;
                }
            },

            link: function (scope, elem, attrs, ctrls) {

                var childCtrl = ctrls[0];
                var  parentCtrl = ctrls[1];

                parentCtrl.register('table_create', childCtrl);


                scope.saveTable = function () {

                    scope._saveTable();
                }

                scope.cancelTable = function () {

                    scope._cancelTable();
                }

                scope._saveTable = function () {

                    scope.currentService = StateService.get('dfservice');

                    scope.table.currentService = {
                        name: scope.currentService.name
                    };

                    scope.currentCreateTable.setData(scope.table);
                    scope.currentCreateTable.save().then(
                        function (result) {

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
                                label: scope.table.record.label
                            }

                            scope.currentService.components.push(component);


                            TableUtilities.insertNewTableToAppObj(component, scope.currentService.name);
                            TableUtilities.updateServiceComponents(newTable, scope.currentService);

                            scope.table.__dfUI.newTable = false;

                            scope.table.recordCopy = angular.copy(scope.table.record);

                            dfNotify.success(messageOptions);

                            var naviObj = {
                                service: scope.currentService.name,
                                table: scope.table.record.name,
                                type: 'form'
                            }

                            scope.$emit('table:navigation:select', naviObj);
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

                    //scope.$emit('table:navigation:tables:update', scope.table);
                    //scope.$emit('table:navigation:close', false);
                }

                scope._cancelTable = function () {

                    if (!dfObjectService.compareObjectsAsJson(scope.table.record, scope.table.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return false;
                        }
                    }

                    scope.table = null;
                    scope.$emit('table:create:close', false);
                    scope.currentEditField = null;
                    scope.currentEditRelation = null;

                };
            }
        }
      }])


      .directive('dfTableEditView', ['INSTANCE_URL', 'MOD_SCHEMA_ASSET_PATH', '$q', 'NavigationService', 'Table', 'TableDataModel', '$http', 'dfNotify', 'TableDat', 'tableManager', 'TableObj', 'dfObjectService', 'dfApplicationData', 'StateService', function (INSTANCE_URL, MOD_SCHEMA_ASSET_PATH, $q, NavigationService, Table, TableDataModel, $http, dfNotify, TableDat, tableManager, TableObj, dfObjectService, dfApplicationData, StateService) {
        var childNumber = 1;
        return {
            restrict: 'E',
            scope: {
                tableData: '=',
                selectedView: '=',
            },
            //require: '^^dfTableTemplate',
            require: ["dfTableEditView", "^dfTableTemplate"],
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-table-edit-view.html',
            controller: function ($scope) {

                var ctrl = this;

                $scope.table = null;
                $scope.currentEditField = null;
                $scope.currentEditRelation = null;
                $scope.viewMode = 'table';


                $scope.reset = function () {

                  $scope.table = null;
                  $scope.currentEditField = null;
                  $scope.currentEditRelation = null;
                  $scope.viewMode = 'table';
                  $scope.table = null;
                  $scope.currentTable = '';
                  $scope.currentEditTable = null;
                }


                $scope.thisService = null;


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
                            recordCopy: tables,
                            currentService: service.service
                        };
                    })
                }


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
                    }


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
                                i++
                            }

                            $scope.table.currentService = currentService;

                            dfApplicationData.updateServiceComponentsLocal($scope.table.currentService);

                            $scope.table = null;
                            $scope.currentTable = '';
                            $scope.currentEditTable = null;
                            $scope.reset();

                            dfNotify.success(messageOptions);

                            deferred.resolve();
                        },
                        function (reject) {

                            var messageOptions = {

                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);

                            deferred.reject();
                        }
                    )

                    return deferred.promise;
                };


                ctrl.speak = function(test) {
                  console.log(test);
                }


                ctrl.create = function () {

                    console.log('create');
                }

                ctrl.edit = function () {

                    console.log('edit');
                }

                ctrl.delete = function () {

                    console.log('delete');
                }

                ctrl.close = function () {

                    console.log('close');
                }
            },

            link: function (scope, elem, attrs, ctrls) {

                var childCtrl = ctrls[0];
                var  parentCtrl = ctrls[1];

                parentCtrl.register('table_edit', childCtrl);

                scope.updTable = function () {

                    scope.currentCreateTable = new TableDat();

                    scope.currentService = StateService.get('dfservice');

                    scope.table.currentService = {
                        name: scope.currentService.name
                    };

                    scope.currentCreateTable.setData(scope.table);
                    scope.currentCreateTable.update();

                    var updatedTable = {
                        __dfUI: {
                            newTable: false
                        },
                        name: scope.table.record.name,
                        label: scope.table.record.label
                    }


                    var i = 0;

                    while (i < scope.currentService.components.length) {

                        if (scope.currentService.components[i].name === scope.table.record.name) {
                            scope.currentService.components[i] = updatedTable;
                            break;
                        }

                        i++
                    }

                    dfApplicationData.updateServiceComponentsLocal(scope.currentService)
                    StateService.set('dfservice', scope.currentService);

                };

                scope.closeTable = function () {

                    //scope.$emit('table:navigation:close', false);
                    scope._closeTable();
                }

                scope._closeTable = function () {

                    if (!dfObjectService.compareObjectsAsJson(scope.table.record, scope.table.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return false;
                        }
                    }

                    scope.table = null;

                    scope.$emit('table:navigation:close', false);
                };


                scope.$on('table:update', function(event, args) {

                    scope.table = args;
                });


                scope.$on('table:fields:update', function(event, args) {

                    scope.table = args;
                });


                scope.$on('table:edit:clear', function (event, args) {
                    console.log('table:edit:clear');

                    scope.table = null;
                    scope.currentService = null;

                    scope.showEditView = false;
                    scope.currentTable = null;
                    scope.lastTable = null;
                    NavigationService.setStep('empty');
                    scope.selView = NavigationService.getStep();
                });


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

    .directive('dfTableFields', ['MOD_SCHEMA_ASSET_PATH', 'NavigationService', 'tableManager', 'TableObj', 'StateService', function (MOD_SCHEMA_ASSET_PATH, NavigationService, tableManager, TableObj, StateService) {

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
                  scope.$emit('table:navigation:field:create', {});

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

                scope.deleteField = function (field) {

                    var params = {
                      service: StateService.get('dfservice'),
                      table: StateService.get('dftable')
                    };

                    tableManager.getTable(params).then(function(tables) {

                        var tableFields = tables.field;

                        var fieldIndex = tableFields.findIndex(function (element, index, array) {

                            return element.name === field.name;
                        })

                        tableFields.splice(fieldIndex, 1);

                        tables.field = tableFields;

                        tableManager.setTable(tables);

                        scope.$emit('table:fields:update', new TableObj(tables));
                    });

                }

                scope.setPrimaryField = function (field) {

                    var params = {
                        service: StateService.get('dfservice'),
                        table: StateService.get('dftable')
                    };

                    tableManager.getTable(params).then(function(tables) {

                        var tableFields = tables.field;

                        var fieldIndex = tableFields.findIndex(function (element, index, array) {

                            return element.name === field.name;
                        })

                        var primaryKeyName = null;

                        for (var i = 0; i < tableFields.length; i++) {
                            if (tableFields[i].name === field.name) {
                                tableFields[i].is_primary_key = true;
                                primaryKeyName = field.name;
                            }
                            else {
                                tableFields[i].is_primary_key = false;
                                tables.primary_key = null;
                            }
                        }

                        tables.field = tableFields;
                        tables.primary_key = primaryKeyName;

                        tableManager.setTable(tables);

                        scope.$emit('table:fields:update', new TableObj(tables));


                    });

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




                scope.closeTable = function (noConfirm) {
                  scope._closeTable();
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

                    //scope.$emit('table:navigation:field:close', false);
                };






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

                scope.closeTable1 = function () {

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

                scope._clearTable1 = function () {

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

                scope._closeTable2 = function () {

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
                            scope.table = new TableObj(newTable);
                            TableDataModel.setTableModel(new TableObj(newTable));
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
                            scope.table = new TableObj(newTable);
                            TableDataModel.setTableModel(new TableObj(newTable));
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

                    scope.table = newValue.__dfUI.newTable ? new TableObj() : new TableObj(newValue.record);
                    TableDataModel.setTableModel(new TableObj(scope.table));
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

                     scope.table = new TableObj(scope.table.record);
                     TableDataModel.setTableModel(new TableObj(scope.table.record));
                })
            }
        }
    }])


    .directive('dfFieldDetails', ['MOD_SCHEMA_ASSET_PATH', 'INSTANCE_URL', '$q', '$http', 'dfNotify', 'dfObjectService', 'dfApplicationData', 'FieldModel', 'FieldDat', 'FieldOptions', 'TableDat', 'tableManager', 'StateService', 'FieldObj', function (MOD_SCHEMA_ASSET_PATH, INSTANCE_URL, $q, $http, dfNotify, dfObjectService, dfApplicationData, FieldModel, FieldDat, FieldOptions, TableDat, tableManager, StateService, FieldObj) {

        return {
            restrict: 'E',
            scope: {
                selectedView: '=',
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


                if (false){//scope.field.__dfUI.newField) {

                  var params = {
                    service: StateService.get('dfservice'),
                    table: StateService.get('dftable')
                  };

                  tableManager.getTable(params).then(function(tables) {

                      var tableFields = tables.field;

                      var fieldIndex = tableFields.findIndex(function (element, index, array) {

                          return element.name === scope.field.record.name;
                      })

                      tableFields[fieldIndex] = scope.field.record;

                      tables.field = tableFields;



                      scope.$broadcast('table:update', tables);

                      tableManager.setTable(tables);



                      scope.$emit('table:navigation:field:close', false);
                  });
                }
                else {

                  var params = {
                    service: StateService.get('dfservice'),
                    table: StateService.get('dftable')
                  };

                  tableManager.getTable(params).then(function(tables) {

                      var tableFields = tables.field;

                      var fieldIndex = tableFields.findIndex(function (element, index, array) {

                          return element.name === scope.field.record.name;
                      })

                      if (fieldIndex > -1) {
                          tableFields[fieldIndex] = scope.field.record;
                          tables.field = tableFields;
                      }
                      else {

                          tables.field.push(scope.field.record);
                      }

                      dfObjectService.mergeObjects(scope.field.record, scope.field.recordCopy)

                      scope.$broadcast('table:update', tables);

                      tableManager.setTable(tables);

                      scope.$emit('table:navigation:field:close', false);
                  });
                }
              }


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
                  scope.$emit('table:navigation:field:close', false);
              }



              scope._updateOnServer = function (table) {

                  var deferred = $q.defer();
                  var result = tableManager.setTable(table);
                  if (result) {
                      deferred.resolve(result);
                  } else {
                      deferred.reject(result);
                  }
                  return deferred.promise;
              }





              var watchFieldData = scope.$watch('selectedView', function (newValue, oldValue) {

                  if (!newValue) return;

                  if (newValue === 'field') {


                  }

                  //scope.field = new FieldObj(scope.fieldData);
                  //console.log(scope.field);
                  /*
                  scope.field = newValue.__dfUI.newField ? new FieldDat() : new FieldDat(newValue.record);

                  if (!newValue.record.ref_table) {
                      scope.refFields = null;
                  }
                  */
                  /*
                  var params = {
                      service: StateService.get('dfservice'),
                      table: StateService.get('dftable')
                  };

                  tableManager.getTable(params).then(function(tables) {

                  });
                  */
              });




              var watchFieldData = scope.$watch('fieldData', function (newValue, oldValue) {

                  if (!newValue) return;

                  scope.field = new FieldObj(scope.fieldData);
/*
                  scope.field = newValue.__dfUI.newField ? new FieldDat() : new FieldDat(newValue.record);

                  if (!newValue.record.ref_table) {
                      scope.refFields = null;
                  }

                  var params = {
                      service: StateService.get('dfservice'),
                      table: StateService.get('dftable')
                  };

                  tableManager.getTable(params).then(function(tables) {
                      //$scope.books = books
                  });
*/
/*
                  tableManager.loadAllTables().then(function(tables) {
                      //$scope.books = books
                      console.log(tables);
                  });
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

    .directive('dfRelationDetails', ['MOD_SCHEMA_ASSET_PATH', 'INSTANCE_URL', '$http', 'dfNotify', 'dfObjectService', 'dfApplicationData', 'StateService', function (MOD_SCHEMA_ASSET_PATH, INSTANCE_URL, $http, dfNotify, dfObjectService, dfApplicationData, StateService) {

          return {
            restrict: 'E',
            scope: {
                relationData: '=',
                currentTable: '=',
                schemaData: '&'
            },
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-relation-details.html',
            link: function (scope, elem, attrs) {

              scope.updField = function (value) {

                if (scope.field.__dfUI.newField) {

                  var params = {
                      service: StateService.get('dfservice'),
                      table: StateService.get('dftable')
                  };

                  tableManager.getTable(params).then(function(tables) {

                      var tableFields = tables.field;

                      var fieldIndex = tableFields.findIndex(function (element, index, array) {

                          return element.name === scope.field.record.name;
                      })

                      tableFields[fieldIndex] = scope.field.record;
                      tables.field = tableFields;

                      scope._updateOnServer(tables).then(function (result) {
                          //console.log(result);
                      })
                  });
                }

                  //console.log('updField ' + scope.field.__dfUI.newField);
              }

              scope.closeField = function (value) {

                  //console.log('closeField ' + value);
              }


              scope._updateOnServer = function (table) {

                  var deferred = $q.defer();
                  var result = tableManager.setTable(table);
                  if (result) {
                      deferred.resolve(result);
                  } else {
                      deferred.reject(result);
                  }
                  return deferred.promise;
              }

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

    .directive('dfSchemaNavigator', ['MOD_SCHEMA_ASSET_PATH', 'dfApplicationData', 'ServiceListService', 'StateService', 'TableListService', 'NavigationService', 'tableManager', 'tableListManager', 'dfNotify', function (MOD_SCHEMA_ASSET_PATH, dfApplicationData, ServiceListService, StateService, TableListService, NavigationService, tableManager, tableListManager, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-schema-navigator.html',
            link: function (scope, elem, attrs) {


                scope.serviceSelect = function() {

                    scope.$broadcast('table:navigation1:close', false);

                    scope.currentTable = null;
                    StateService.set('dfservice', scope.currentService);
                    TableListService.getTableList();
                }

                scope.navigationSelect = function (selected) {

                    var naviObj = {
                        type: selected,
                        value: {
                            service: scope.currentService.name
                        }
                    }

                    scope.currentTable = '';

                    scope.$broadcast('table:create:' + selected, naviObj);
                }

                scope.deleteTable = function () {

                    var params = {
                        table: scope.currentTable,
                        service: scope.currentService
                    }

                    scope.$broadcast('table:delete', params);
                };

                scope.tableSelect = function(test) {

                  var params = {
                      table: scope.currentTable,
                      service: scope.currentService.name
                  }

                    scope.$broadcast('table:edit', params);
                };

                scope.reload = function() {
                    ServiceListService.getServices();
                }

                scope.$on('table:navigation:select', function (event, args) {

                    if (args.hasOwnProperty('service') && args.hasOwnProperty('table') && args.hasOwnProperty('type')) {
                        scope.currentTable = args.table;

                        var params = {
                            table: args.table,
                            service: args.service
                        }

                        scope.$broadcast('table:edit', params);
                    }
                });

                scope.$on('table:navigation:close', function(event, args) {

                    scope.currentService = 0;
                    scope.currentTable = '';
                });
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
