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

    .run(['INSTANCE_URL', '$templateCache', function (INSTANCE_URL, $templateCache) {}])

    .controller('SchemaCtrl', ['INSTANCE_URL', '$scope', '$http', 'dfApplicationData', 'dfNotify', 'dfObjectService', function(INSTANCE_URL, $scope, $http, dfApplicationData, dfNotify, dfObjectService) {


        var Service = function (schemaData) {

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

            return {
                __dfUI: {
                    unfolded: false
                },
                name: schemaData.name,
                label: schemaData.label,
                components: getSchemaComponents(schemaData.components),
                updateComponents : function (array) {

                    this.components = getSchemaComponents(array);
                }
            }
        };

        var ManagedTableData = function (tableData) {

            return {

                __dfUI: {
                    newTable: !tableData
                },
                record: tableData,
                currentService: $scope.currentService
            }
        };


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

        // Bind this to the dfTableDetails directive so we have
        // access to the edit obj in the table values.  Not for access
        // but just so we can check if it has been modified
        $scope.bindTable = null;


        var tempObj = {};

        angular.forEach(dfApplicationData.getApiData('service', {type: 'sql_db'}), function (serviceData) {

            tempObj[serviceData.name] = new Service(serviceData);
        });

        $scope.schemaManagerData = tempObj;

        $scope.currentService = null;
        $scope.currentTable = null;
        $scope.lastTable = '';


        $scope.schemaManagerData = null;
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
            if ($scope.bindTable !== null && !dfObjectService.compareObjectsAsJson($scope.bindTable.record, $scope.bindTable.recordCopy)) {

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

        $scope.refreshService = function (forceRefresh) {

            $scope._refreshService(forceRefresh);
        };



        // PRIVATE API
        $scope._getTableFromServer = function (requestDataObj) {

            return $http({
                method: 'GET',
                url: INSTANCE_URL + '/api/v2/'+ $scope.currentService.name + '/_schema/' + requestDataObj.name,
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

        $scope._refreshServiceFromServer = function () {
            return dfApplicationData.getServiceComponents($scope.currentService.name, INSTANCE_URL + '/api/v2/' + $scope.currentService.name + '/_schema', {params: {refresh: true, fields: 'name,label'}});
        };

        // COMPLEX IMPLEMENTATION
        $scope._addTable = function () {

            $scope.currentEditTable = new ManagedTableData(null);
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
                    $scope.currentEditTable = new ManagedTableData(result.data);

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


            $scope._deleteTableFromServer(requestDataObj).then (
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

        $scope._refreshService = function (forceRefresh) {

            var tableObj = null;

            for (var i = 0; i < $scope.currentService.components.length; i++) {

                if ($scope.currentService.components[i].name === $scope.currentTable) {
                     tableObj = $scope.currentService.components[i]
                }
            }


            dfApplicationData.getServiceComponents($scope.currentService.name, INSTANCE_URL + '/api/v2/' + $scope.currentService.name + '/_schema', {params: {refresh: true, fields: 'name,label'}}, forceRefresh).then(
                function (result) {

                    // update service components
                    $scope.currentService.updateComponents(result);

                    // Build notification
                    var messageOptions = {
                        module: 'Schema',
                        type: 'success',
                        provider: 'dreamfactory',
                        message: $scope.currentService.name + ' refreshed.'
                    };

                    // Send notification to user
                    if (forceRefresh)
                        dfNotify.success(messageOptions);


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
            )
        };



        // WATCHERS
        var watchSchemaManagerData = $scope.$watch('schemaManagerData', function (newValue, oldValue) {

            if (newValue !== null) return;

            var tempObj = {};

            angular.forEach(dfApplicationData.getApiData('service', {type: 'sql_db'}), function (serviceData) {

                tempObj[serviceData.name] = new Service(serviceData);
            });

        });

        var watchServiceComponents = $scope.$watchCollection(function() {return dfApplicationData.getApiData('service', {type: 'sql_db'})}, function (newValue, oldValue) {

            if (!newValue) return;

            var tempObj = {};

            angular.forEach(dfApplicationData.getApiData('service', {type: 'sql_db'}), function (serviceData) {

                tempObj[serviceData.name] = new Service(serviceData);
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

    .directive('dfTableDetails', ['MOD_SCHEMA_ASSET_PATH', 'INSTANCE_URL', 'dfNotify', '$http', 'dfObjectService', 'dfApplicationData',  function (MOD_SCHEMA_ASSET_PATH, INSTANCE_URL, dfNotify, $http, dfObjectService, dfApplicationData) {

        return {
            restrict: 'E',
            scope: {
                tableData: '=',
                table: '=?bindTable'
            },
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-table-details.html',
            link: function (scope, elem, attrs) {


                var Table = function (tableData) {

                    var _new = {
                        name: null,
                        label: null,
                        plural: null,
                        primary_key: null,
                        name_field: null,
                        related: null,
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


                scope.table = null;

                scope.currentEditField = null;

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

                    if (dfNotify.confirm('Are you sure you want to delete field ' + field.name + '?' )) {

                        scope._deleteField(field);
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
                    })
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

                }

                scope._validateJSON = function () {

                    try {
                        var result = JSON.parse( scope.editor.getValue() );

                        if ( result ) {

                            scope.editor.setValue(angular.toJson(result, true), -1);
                            return true;
                        }
                    }
                    catch ( e ) {

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

                                appObj.apis.service.resource[i].components.push({'name': resource.name, 'label': resource.label});
                                break;
                            }
                        }
                    }

                    dfApplicationData.setApplicationObj(appObj);
                }


                // COMPLEX IMPLEMENTATION
                scope._editField = function (fieldData) {

                    scope.currentEditField = new ManagedFieldData(fieldData);
                };

                scope._addField = function () {
                    scope.table.record.field.push({});
                    scope.currentEditField = new ManagedFieldData(scope.table.record.field[scope.table.record.field.length -1]);
                };

                scope._deleteField = function (field) {

                    if (scope.table.__dfUI.newTable) {
                        var i = 0;
                        while(i < scope.table.record.field.length) {

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

                        path: scope.tableData.currentService.name + '/_schema/' + scope.table.record.name + '/' + field.name
                    };

                    scope._deleteFieldFromTableOnServer(requestDataObj).then (
                        function (result) {

                            var i = 0;
                            while(i < scope.table.record.field.length) {

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

                scope._closeTable = function () {


                    if (!dfObjectService.compareObjectsAsJson(scope.table.record, scope.table.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return false;
                        }
                    }


                    scope.table = null;
                    scope.tableData = null;
                    scope.currentEditField = null;
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


                    }else {
                        var messageOptions = {

                            module: 'Api Error',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: 'JSON Invalid.'
                        };

                        dfNotify.error(messageOptions);
                    }
                }


                // WATCHERS
                var watchTableData = scope.$watch('tableData', function (newValue, oldValue) {

                    if (newValue === null) return;

                    scope.table = newValue.__dfUI.newTable ? new Table() : new Table(newValue.record);
                    scope.table.currentService = newValue.currentService;
                });


                // MESSAGES
                scope.$on('$destroy', function (e) {
                    watchTableData();
                });

                scope.$on('update:managedtable', function (e) {

                    // scope.table = new Table(scope.table.record);

                })
            }
        }
    }])

    .directive('dfFieldDetails', ['MOD_SCHEMA_ASSET_PATH', 'INSTANCE_URL', '$http', 'dfNotify', 'dfObjectService', function (MOD_SCHEMA_ASSET_PATH, INSTANCE_URL, $http, dfNotify, dfObjectService) {


        return {
            restrict: 'E',
            scope: {
                fieldData: '=',
                currentTable: '='
            },
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-field-details.html',
            link: function (scope, elem, attrs) {


                var Field = function (fieldData) {

                    var _new = {
                        allow_null: false,
                        auto_increment: false,
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
                        ref_fields: '',
                        ref_table: '',
                        required: false,
                        scale: 0,
                        supports_multibyte: false,
                        type: null,
                        validation: null,
                        value: []
                    };


                    fieldData = fieldData || _new;

                    return {
                        __dfUI: {
                            newField: fieldData.type == null
                        },
                        record: fieldData,
                        recordCopy: angular.copy(fieldData)
                    }
                };

                scope.typeOptions = [
                    {name : "I will manually enter a type" , value: ""},
                    {name : "id",value: "id"},
                    {name : "string", value: "string"},
                    {name: "integer",value: "integer"},
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
                    {name: "user_id_on_create",value: "user_id_on_create"},
                    {name: "user_id_on_update",value: "user_id_on_update"},
                    {name: "timestamp",value: "timestamp"},
                    {name: "timestamp_on_create",value: "timestamp_on_create"},
                    {name: "timestamp_on_update",value: "timestamp_on_update"}

                ];
                scope.refFields = null;

                // PUBLIC API
                scope.closeField = function (noConfirm) {

                    if (!dfObjectService.compareObjectsAsJson(scope.field.record, scope.field.recordCopy)) {

                        if (!noConfirm && !dfNotify.confirmNoSave()) {
                            return false;
                        }

                        // Undo changes to field record object
                        dfObjectService.mergeObjects(scope.field.recordCopy, scope.field.record)
                    }

                    scope._closeField();
                };

                scope.saveField = function () {

                    scope._saveField();
                }


                // PRIVATE API
                scope._loadReferenceTables = function () {

                    $http.get(INSTANCE_URL + '/api/v2/' + scope.fieldData.currentService.name + '/_schema/').then(

                        function (result) {
                            scope.field.record.ref_tables = result.data.resource;
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
                            scope.field.record.ref_fields = null;
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

                    if (recordObj.hasOwnProperty('ref_tables'))
                        delete recordObj.ref_tables;

                    return $http({
                        url: INSTANCE_URL + '/api/v2/' + scope.fieldData.currentService.name + '/_schema/' + scope.currentTable + '/' + recordObj.name,
                        method: 'PATCH',
                        data: recordObj
                    })
                };


                // COMPLEX IMPLEMENTATION
                scope._closeField = function () {

                    scope.field = null;
                    scope.fieldData = null;
                };

                scope._saveField = function () {

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
                            scope.field = new Field(scope.field.record);

                            // Notify the Managed table object that it's record has changed.
                            scope.$emit('update:managedtable');


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
                var watchFieldData = scope.$watch('fieldData', function(newValue, oldValue) {


                    if (!newValue) return;

                    scope.field = newValue.__dfUI.newField ? new Field() : new Field(newValue.record);

                    if (!newValue.record.ref_table) {
                        scope.refFields = null;
                        return;
                    }


                    $http.get(INSTANCE_URL + '/api/v2/' + scope.fieldData.currentService.name + '/_schema/' + scope.field.record.ref_table).then(
                        function (result) {

                            scope.refFields = result.data.field
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
                });


                // MESSAGES
                scope.$on('$destroy', function (e) {

                    watchFieldData();
                });

            }
        }
    }])

    .directive('dfSchemaNavigator', ['MOD_SCHEMA_ASSET_PATH', 'dfApplicationData', function (MOD_SCHEMA_ASSET_PATH, dfApplicationData) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-schema-navigator.html',
            link: function (scope, elem, attrs) {

               

                
                
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


                $(function() {
                    $( "#schema-navigator-resizable" ).resizable({
                        alsoResize: "#schema-navigator-resizable-also"
                    });
                    $( "#schema-navigator-resizable-also" ).resizable();
                });
            }
        }
    }])

    .directive('dfUploadSchema', ['MOD_SCHEMA_ASSET_PATH', 'dfNotify', function (MOD_SCHEMA_ASSET_PATH, dfNotify) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SCHEMA_ASSET_PATH + 'views/df-upload-schema.html',
            link: function (scope, elem, attrs) {


                scope.uploadEditor = null;
                scope.uploadIsEditorClean = true;
                scope.uploadIsEditable = true;

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
                                    "type": "boolean"
                                }
                            ]
                        }
                    ]
                };


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
                        function(result) {


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


                            dfNotify.success(messageOptions);

                        },
                        function(reject) {

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
                        if(!dfNotify.confirm('You have unsaved changes.  Continue without saving?')) {

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

