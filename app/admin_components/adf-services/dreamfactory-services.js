'use strict';


angular.module('dfServices', ['ngRoute', 'dfUtility', 'dfServiceTemplates'])
    .constant('MOD_SERVICES_ROUTER_PATH', '/services')
    .constant('MOD_SERVICES_ASSET_PATH', 'admin_components/adf-services/')
    .config(['$routeProvider', 'MOD_SERVICES_ROUTER_PATH', 'MOD_SERVICES_ASSET_PATH',
        function ($routeProvider, MOD_SERVICES_ROUTER_PATH, MOD_SERVICES_ASSET_PATH) {
            $routeProvider
                .when(MOD_SERVICES_ROUTER_PATH, {
                    templateUrl: MOD_SERVICES_ASSET_PATH + 'views/main.html',
                    controller: 'ServicesCtrl',
                    resolve: {
                        checkCurrentUser: ['UserDataService', '$location', '$q', function (UserDataService, $location, $q) {

                            var currentUser = UserDataService.getCurrentUser(),
                                defer = $q.defer();

                            // If there is no currentUser and we don't allow guest users
                            if (!currentUser) {

                                $location.url('/login');

                                throw {
                                    routing: true
                                }
                            }

                            // There is a currentUser but they are not an admin
                            else if (currentUser && !currentUser.is_sys_admin) {

                                $location.url('/launchpad');

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

    .controller('ServicesCtrl', ['$rootScope', '$scope', 'dfApplicationData', 'dfNotify', function ($rootScope, $scope, dfApplicationData, dfNotify) {

        $scope.$parent.title = 'Services';

        $rootScope.isRouteLoading = true;

        // Set module links
        $scope.links = [
            {
                name: 'manage-services',
                label: 'Manage',
                path: 'manage-services'
            },
            {
                name: 'create-service',
                label: 'Create',
                path: 'create-service'
            }
        ];

        // Set empty section options
        $scope.emptySectionOptions = {
            title: 'You have no Services!',
            text: 'Click the button below to get started building your first Service.  You can always create new services by clicking the "Create" tab located in the section menu to the left.',
            buttonText: 'Create A Service!',
            viewLink: $scope.links[1]
        };

        $scope.$on('$destroy', function (e) {

            // dump data if not on page 1
            $scope.$broadcast('toolbar:paginate:service:destroy');
        });

        // load data

        $scope.apiData = null;

        $scope.loadTabData = function(init) {

            // eventlist is loaded only as needed to improve user experience
            var apis = ['service', 'service_type', 'environment'];

            dfApplicationData.getApiData(apis).then(
                function (response) {
                    var newApiData = {};
                    apis.forEach(function(value, index) {
                        newApiData[value] = response[index].resource ? response[index].resource : response[index];
                    });
                    $scope.apiData = newApiData;
                    if (init) {
                        $scope.$broadcast('toolbar:paginate:service:load');
                    }
                },
                function (error) {
                    var messageOptions = {
                        module: 'Services',
                        provider: 'dreamfactory',
                        type: 'error',
                        message: 'There was an error loading data for the Services tab. Please try refreshing your browser and logging in again.'
                    };
                    dfNotify.error(messageOptions);
                }
            );
        };

        $scope.loadTabData(true);
    }])

    .directive('dfServiceDetails', ['MOD_SERVICES_ASSET_PATH', '$q', 'dfApplicationData', 'dfNotify', 'dfObjectService', 'dfServiceValues', '$http', 'INSTANCE_URL', function (MOD_SERVICES_ASSET_PATH, $q, dfApplicationData, dfNotify, dfObjectService, dfServiceValues, $http, INSTANCE_URL) {

        return {

            restrict: 'E',
            scope: {
                serviceData: '=?',
                newService: '=?',
                apiData: '=?'
            },
            templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-service-details.html',
            link: function (scope, elem, attrs) {

                var Service = function (serviceData) {

                    var newService = {
                        "id": null,
                        "name": '',
                        "label": '',
                        "description": '',
                        "is_active": true,
                        "type": "",
                        "mutable": true,
                        "deletable": true,
                        "config": {},
                        "doc": ''
                    };

                    serviceData = serviceData || newService;

                    if (serviceData && serviceData.config) {
                        // Convert object from config types to array
                        Object.keys(serviceData.config).forEach(function(key) {
                          if (serviceData.config[key] && serviceData.config[key].constructor === Object) {
                            var arr = [];
                            Object.keys(serviceData.config[key]).forEach(function (objKey) {
                                arr.push({ key: objKey, value: serviceData.config[key][objKey] })
                            });
                            serviceData.config[key] = arr;
                          }
                        });


                    }

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: angular.copy(serviceData),
                        recordCopy: angular.copy(serviceData)
                    }
                };

                scope.service = null;

                // Is this going to be a new Service
                if (scope.newService) {
                    scope.service = new Service();
                }


                // Other Data

                // PUBLIC API
                scope.saveService = function () {

                    if (scope.newService) {

                        scope._saveService();
                    }
                    else {

                        scope._updateService();
                    }
                };

                scope.deleteService = function () {

                    scope._deleteService();
                };

                scope.closeService = function () {

                    scope._closeService();
                };

                scope.testSetting = function () {
                    scope._testSetting();
                };


                // PRIVATE API
                scope._saveServiceToServer = function (requestDataObj) {

                    return dfApplicationData.saveApiData('service', requestDataObj).$promise;
                };

                scope._updateServiceToServer = function (requestDataObj) {

                    return dfApplicationData.updateApiData('service', requestDataObj).$promise;
                };

                scope._deleteServiceFromServer = function (requestDataObj) {

                    return dfApplicationData.deleteApiData('service', requestDataObj).$promise;
                };

                scope._prepareServiceData = function () {

                    scope._prepareServiceInfoData();
                    scope._prepareServiceConfigData();

                    switch (scope.service.record.type) {

                        case 'rws':
                        case 'nodejs':
                        case 'php':
                        case 'python':
                        case 'v8js':
                            scope._prepareServiceDefinitionData();
                            break;

                        default:
                            delete scope.service.record.service_doc_by_service_id;
                            delete scope.service.recordCopy.service_doc_by_service_id;
                            scope.service.record.service_doc_by_service_id = null;
                            scope.service.recordCopy.service_doc_by_service_id = null;
                    }
                };

                scope._trimRequestDataObj = function (requestObj) {

                    if (requestObj.data.hasOwnProperty.call(config, 'options_ctrl'))
                        delete requestObj.data.config.options_ctrl;

                    return requestObj;
                };

                scope._restoreRequestDataObj = function (requestObj) {
                    if (requestObj.resource) {
                        requestObj = requestObj.resource;
                    }

                    if (!requestObj.hasOwnProperty.call(config, 'options'))
                        return requestObj;

                    if (requestObj.config.options && requestObj.config.options.hasOwnProperty('ssl'))
                        requestObj.config.options_ctrl = true;
                    else
                        requestObj.config.options_ctrl = false;

                    scope._storageType = requestObj.config;

                    return requestObj;
                }

                scope._resetServiceDetails = function () {


                    if (scope.newService) {

                        scope.service = new Service();
                    }
                    else {

                        scope.serviceData = null;
                    }


                    // reset tabs
                    angular.element('#info-tab').trigger('click');

                };


                var normalizeKeyValuePairs = function () {

                    var data = angular.copy(scope.service.record);

                    var convert = function (item) {
                        var arr = data.config[item.name];
                        data.config[item.name] = {};
                        arr.forEach(function(arrItem) {
                          data.config[item.name][arrItem.key] = arrItem.value;
                        });
                    };

                    if (scope.selectedSchema.hasOwnProperty('config_schema') && scope.selectedSchema.config_schema !== null) {
                        // convert key, value pair array to object
                        scope.selectedSchema.config_schema.forEach(function(item) {
                            if (item.type.indexOf('object') > -1 && data.config[item.name] && data.config[item.name].length) {
                                convert(item);
                            }
                        });
                    }

                    return data;
                };

                // COMPLEX IMPLEMENTATION
                scope._saveService = function () {
                    var error = false;

                    if (!scope.serviceInfo.record.config.hasOwnProperty('content') && (
                      (scope.serviceInfo.record.type === 'nodejs') ||
                      (scope.serviceInfo.record.type === 'php') ||
                      (scope.serviceInfo.record.type === 'python') ||
                      (scope.serviceInfo.record.type === 'v8js'))) {
                        error = true;
                    }

                    if (scope.serviceInfo.record.config.hasOwnProperty('content')) {
                        if (!scope.serviceInfo.record.config.content.length) {
                            error = true;
                        }
                    }

                    if (error) {
                        var messageOptions = {
                            module: 'Service Save Error',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: 'Content is required and can\'t be empty'
                        };

                        dfNotify.error(messageOptions);

                        return;
                    }

                    scope._prepareServiceData();

                    var data = normalizeKeyValuePairs();

                    var requestDataObj = {
                        params: {
                            fields: '*'
                        },
                        data: data
                    };

                    requestDataObj = scope._trimRequestDataObj(requestDataObj);

                    scope._saveServiceToServer(requestDataObj).then(
                        function (result) {

                            var messageOptions = {
                                module: 'Services',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Service saved successfully.'

                            };

                            scope.service = new Service(result);
                            dfNotify.success(messageOptions);


                            // clean form
                            scope._resetServiceDetails();

                            scope.$emit('sidebar-nav:view:reset');
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
                    ).finally(
                        function () {

                            // console.log('Save Services finally')
                        }
                    );
                };

                scope._updateService = function () {

                    scope._prepareServiceData();

                    var data = normalizeKeyValuePairs();

                    var requestDataObj = {
                        params: {
                            fields: '*'
                        },
                        data: data
                    };

                    requestDataObj = scope._trimRequestDataObj(requestDataObj);

                    scope._updateServiceToServer(requestDataObj).then(
                        function (result) {


                            var messageOptions = {
                                module: 'Services',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Service updated successfully'

                            };

                            result = scope._restoreRequestDataObj(result);

                            dfNotify.success(messageOptions);
                            scope.service = new Service(result);

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
                    ).finally(
                        function () {

                            // console.log('Update Service finally')
                        }
                    );

                    scope._resetServiceDetails();
                };

                scope._deleteService = function () {

                    var requestDataObj = {
                        params: {},
                        data: scope.service.record
                    };


                    scope._deleteServiceFromServer(requestDataObj).then(
                        function (result) {

                            // notify success
                            var messageOptions = {
                                module: 'Services',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Service successfully deleted.'
                            };

                            dfNotify.success(messageOptions);

                            scope.service = null;

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
                    ).finally(
                        function () {

                            // console.log('Delete Service Finally')
                        }
                    )

                };

                scope._closeService = function () {

                    scope._prepareServiceData();

                    if (!dfObjectService.compareObjectsAsJson(scope.service.record, scope.service.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return false;
                        }
                    }

                    scope._resetServiceDetails();
                };

                scope._testSetting = function () {
                    $http.get(INSTANCE_URL + '/api/v2/' + scope.service.record.name).then(function (response) {
                        var messageOptions = {
                            module: 'Services',
                            type: 'success',
                            provider: 'dreamfactory',
                            message: 'Test was successful!'
                        };
                        dfNotify.success(messageOptions);
                    }, function (response) {
                        var messageOptions = {
                            module: 'Services',
                            type: 'Api Error',
                            provider: 'dreamfactory',
                            message: response.data.error.message
                        };
                        dfNotify.error(messageOptions);
                    });
                };

                // Refreshes the editor when switching tabs
                scope.refreshEditor = function() {

                    if (scope.currentEditor !== null) {
                        scope.currentEditor.renderer.updateText();

                        var aceElement = $('div[id^="ide"]');
                        var editor = ace.edit(aceElement[0].id);

                        editor.resize(true);
                        editor.focus();
                    }
                };


                // WATCHERS
                var watchData = scope.$watch('serviceData', function (newValue, oldValue) {

                    // No data.  Return
                    if (!newValue) return false;

                    // We're creating a service.  The default is a Remote Web Service
                    // The Service obj is already set to create one of these so Return
                    if (scope.newService) return false;

                    // We have passed in data from an existing service.  Let's create
                    // a new Service obj from that data.
                    scope.service = new Service(newValue);

                    if (newValue.hasOwnProperty('label')) {

                        scope.dfLargeHelp.config = {
                            title: 'Config Overview',
                            text: 'Specify any service-specific configuration for <b>' + newValue['label'] + '</b> below.'
                        };

                        scope.dfLargeHelp.serviceDef = {
                            title: 'Service Definition Overview',
                            text: 'For the service <b>' + newValue['label'] + '</b> you can specify a definition below. Refer to the <a target="_blank" href="https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md" title="Link to Swagger">OpenAPI docs</a> for details, or build and export your own from <a target="_blank" href="http://editor.swagger.io/#/" title="Link to Swagger Editor">here</a>.'
                        },
                        scope.dfLargeHelp.serviceDefReadOnly = {
                            title: 'Service Definition Overview',
                            text: 'The service definition for <b>' + newValue['label'] + '</b>\'s service type is pre-defined and can not be edited.'
                        }
                    }
                });

                // MESSAGES
                scope.$on('$destroy', function (e) {
                    watchData();
                });


                // HELP
                scope.dfHelp = {
                    createService: {
                        title: 'Create Service Information',
                        text: 'Create Service information help text'
                    }
                };


                scope.dfLargeHelp = {

                    basic: {
                        title: 'Services Overview',
                        text: 'Services are where you set up REST API connections to databases, file storage, email, remote web services, and more.'
                    },
                    config: {
                        title: 'Config Overview',
                        text: 'Specify any service-specific configuration below.'
                    },
                    serviceDef: {
                        title: 'Service Definition Overview',
                        text: 'For Remote Services and Scripts, you can specify a definition of the service below. Refer to the <a target="_blank" href="https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md" title="Link to Swagger">OpenAPI docs</a> for details, or build and export your own from <a target="_blank" href="http://editor.swagger.io/#/" title="Link to Swagger Editor">here</a>.'
                    },
                    serviceDefReadOnly: {
                        title: 'Service Definition Overview',
                        text: 'The service definition for this service type is pre-defined and can not be edited.'
                    }
                }
            }
        }
    }])
    .directive('dfServiceInfo', ['MOD_SERVICES_ASSET_PATH', 'dfServiceValues', 'dfApplicationData', 'dfObjectService', 'dfStorageTypeFactory', '$compile', '$templateCache', '$rootScope', function (MOD_SERVICES_ASSET_PATH, dfServiceValues, dfApplicationData, dfObjectService, dfStorageTypeFactory, $compile, $templateCache, $rootScope) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-service-info.html',
            link: function (scope, elem, attrs) {

                scope.serviceArray = [];
                scope.servicesReady = false;

                // @TODO: Refactor to factory
                var ServiceInfo = function (serviceInfoData) {

                    var _new = {
                        "name": null,
                        "label": null,
                        "description": null,
                        "is_active": true,
                        "type": "",
                        "mutable": true,
                        "deletable": true,
                        "config": {}
                    };

                    var data = angular.copy(serviceInfoData) || _new;


                    return {
                        __dfUI: {},
                        record: data,
                        recordCopy: angular.copy(data)
                    }
                };

                scope._sortArray = function(groupsArray, orderArray) {
                    var result = [];

                    orderArray.forEach(function(group){
                        if (groupsArray.indexOf(group) !== -1) {
                            result.push(group);
                        }
                    });

                    if (groupsArray.length > orderArray.length) {
                        var unsortedGroups = groupsArray.filter(function(i) {return result.indexOf(i) < 0;});
                        result.push.apply(result, unsortedGroups);
                    }

                    return result;
                };

                scope.customConfig = [];

                scope.serviceGroups = [];
                scope.hcv = new dfServiceValues();
                scope._script = {};
                scope.serviceInfo = {};
                scope._storageType = {};
                scope.sql_server_host_identifier = null;
                scope.sql_server_db_identifier = null;

                scope._buildFieldSet = function (fieldSetArray, append) {

                    var addFields = null;

                    if (!append) {
                        elem.html('');
                    }
                    else {

                        addFields = angular.element('#additionalFields');

                        if (addFields.length) {

                            addFields.html('');
                        } else {

                            elem.append('<div id="additionalFields"></div>');
                            addFields = angular.element('#additionalFields');
                        }
                    }

                    if (!fieldSetArray) {
                        return;
                    }

                    angular.forEach(fieldSetArray, function (fieldName) {

                        if (!append) {

                            elem.append($compile($templateCache.get('_service-' + fieldName + '.html'))(scope));
                        }
                        else {

                            addFields.append($compile($templateCache.get('_service-' + fieldName + '.html'))(scope));
                        }
                    });
                };


                scope._prepareServiceNoSQLData = function () {

                    if (scope.service.record.storage_type === 'mongodb') {
                        if (scope.service.record.config.options_ctrl === true) {
                            scope.service.record.config.options = {ssl: true};
                        }
                        else {
                            scope.service.record.config.options = {};
                        }
                    }
                };

                scope._prepareServiceInfoData = function () {
                    scope.service.record = dfObjectService.mergeObjects(scope.serviceInfo.record, scope.service.record);
                };

                scope._prepareRWS = function () {

                    return scope._storageType;
                };

                scope._prepareEmailData = function () {

                    scope._storageType['user'] = scope.serviceInfo.record.config.user;
                    scope._storageType['password'] = scope.serviceInfo.record.config.password;

                    return scope._storageType;
                };

                scope._prepareRFS = function () {

                    switch (scope.serviceInfo.record.storage_type) {
                        case "aws s3":
                            // nothing to do
                            break;
                        case "azure blob":
                            delete scope._storageType.PartitionKey
                            break;
                        case "rackspace cloudfiles":
                        case "openstack object storage":
                            // nothing to do
                            break;
                    }
                    return scope._storageType;
                };

                scope._prepareSF = function () {

                    return scope._storageType;
                }

                scope._prepareNoSQL = function () {

                    switch (scope.serviceInfo.record.storage_type) {
                        case "aws dynamodb":
                        case "aws simpledb":
                        case "azure tables":
                            var temp = angular.copy(scope._storageType);
                            if (temp.hasOwnProperty('private_paths')) {
                                delete temp.private_paths
                            }
                            return temp;
                        case "couchdb":
                        case "mongodb":
                            return scope._storageType;
                    }
                };

                scope._prepareSQLDB = function () {

                    return {
                        dsn: scope._storageType.dsn,
                        user: scope._storageType.user,
                        pwd: scope._storageType.pwd
                    };
                };

                scope._prepareLFS = function () {

                    return scope._storageType;
                };

                scope._preparePS = function () {

                    return scope._storageType;
                };

                scope._dsnToFields = function (dsn) {


                    function nth_ocurrence(str, needle, nth) {

                        for (var i = 0; i < str.length; i++) {
                            if (str.charAt(i) == needle) {
                                if (!--nth) {
                                    return i;
                                }
                            }
                        }
                        return false;
                    }


                    dsn = dsn || scope._storageType.dsn;

                    if (!dsn) return;

                    scope._storageType['prefix'] = dsn.slice(0, dsn.indexOf(":"));

                    switch (scope._storageType.prefix) {

                        case 'oci':
                            scope.sql_server_host_identifier = "host";
                            scope.sql_server_db_identifier = "sid";


                            scope._storageType['host'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_host_identifier), nth_ocurrence(dsn, ')', 2)).split("=")[1];
                            scope._storageType['dbname'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_db_identifier), nth_ocurrence(dsn, ')', 6)).split("=")[1];
                            break;


                        case 'ibm':
                            scope.sql_server_host_identifier = "HOSTNAME";
                            scope.sql_server_db_identifier = "DATABASE";

                            scope._storageType['host'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_host_identifier), nth_ocurrence(dsn, ';', 3)).split("=")[1];
                            scope._storageType['dbname'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_db_identifier), nth_ocurrence(dsn, ';', 2)).split("=")[1];
                            break;

                        case 'sqlsrv':

                            // set the host/db identifiers
                            scope.sql_server_host_identifier = "Server";
                            scope.sql_server_db_identifier = "Database";


                        default:

                            scope.sql_server_host_identifier = "host";
                            scope.sql_server_db_identifier = "dbname";

                            scope._storageType['host'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_host_identifier), dsn.indexOf(";")).split("=")[1];


                            if (dsn.indexOf('port=') > dsn.indexOf(scope.sql_server_db_identifier)) {
                                scope._storageType['dbname'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_db_identifier), nth_ocurrence(dsn, ';', 2)).split("=")[1];

                            }
                            else if (dsn.indexOf('port=') > dsn.indexOf(scope.sql_server_db_identifier)) {
                                scope._storageType['dbname'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_db_identifier), dsn.length).split("=")[1];
                            }

                    }
                };

                scope.updateAffectedFields = function (fieldValue, field) {

                    if (field.name == 'driver' && field.values) {
                        var foundValue = field.values.filter(function (item) {
                            return item.name === fieldValue;
                        })[0] || {};

                        scope.serviceInfo.record.config.dsn = foundValue.dsn;
                    }

                    /*
                    if (field.label === 'Scripting Engine Type'){
                        var mode = 'text';
                        if(fieldValue === 'nodejs' || fieldValue === 'v8js'){
                            mode = 'javascript';
                        } else if (fieldValue) {
                            mode = fieldValue;
                        }

                        var ide = ace.edit('ide');
                        ide.session.setMode('ace/mode/' + mode);
                    }
                    */
                };

                scope._updateDsn = function () {

                    var string = '';

                    switch (scope._storageType.prefix) {

                        case 'sqlsrv':

                            // set the host/db identifiers
                            scope.sql_server_host_identifier = "Server";
                            scope.sql_server_db_identifier = "Database";

                            if (scope._storageType.prefix) string += scope._storageType.prefix + ':';

                            string += scope.sql_server_host_identifier + '=' + scope._storageType.host + ';';
                            string += scope.sql_server_db_identifier + '=' + scope._storageType.dbname;

                            break;

                        case 'oci':
                            scope.sql_server_host_identifier = "host";
                            scope.sql_server_db_identifier = "sid";

                            if (scope._storageType.prefix) string += scope._storageType.prefix + ':';

                            string += "dbname=(DESCRIPTION = (ADDRESS_LIST = (ADDRESS = (PROTOCOL = TCP)(" + scope.sql_server_host_identifier + '=' + scope._storageType.host + ")(PORT = 1521))) (CONNECT_DATA = (" + scope.sql_server_db_identifier + "=" + scope._storageType.dbname + ")))"

                            break;

                        case 'ibm':
                            scope.sql_server_host_identifier = "HOSTNAME";
                            scope.sql_server_db_identifier = "DATABASE";

                            if (scope._storageType.prefix) string += scope._storageType.prefix + ':';

                            string += "DRIVER={IBM DB2 ODBC DRIVER};" + scope.sql_server_db_identifier + "=" + scope._storageType.dbname + ";" + scope.sql_server_host_identifier + "=" + scope._storageType.host + ";PORT=50000;PROTOCOL=TCPIP;";

                            break;

                        default:
                            scope.sql_server_host_identifier = "host";
                            scope.sql_server_db_identifier = "dbname";

                            if (scope._storageType.prefix) string += scope._storageType.prefix + ':';

                            string += scope.sql_server_host_identifier + '=' + scope._storageType.host + ';';
                            string += scope.sql_server_db_identifier + '=' + scope._storageType.dbname;
                    }


                    scope._storageType.dsn = string;
                };

                scope._fieldsToDsn = function () {

                    return scope._storageType.prefix + ':' + scope.sql_server_host_identifier + '=' + scope._storageType.host + ';' + scope.sql_server_db_identifier + '=' + scope._storageType.dbname
                };

                scope._renderAdditionalEmailFields = function () {

                    switch (scope._storageType.transport_type) {
                        case 'command':
                            scope._buildFieldSet(
                                [
                                    'email-command'
                                ], true);
                            break;
                        case 'smtp':
                            scope._buildFieldSet(
                                [
                                    'email-host',
                                    'email-port',
                                    'email-security',
                                    'user-name',
                                    'password'
                                ], true);
                            break;
                    }
                };

                scope._renderAdditionalFields = function (storageType) {

                    var creds = {};

                    if (storageType === scope.serviceInfo.recordCopy.storage_type) {
                        creds = scope.serviceInfo.record.config;
                    }

                    switch (storageType) {

                        case 'aws dynamodb':
                        case 'aws simpledb':

                            scope._storageType = new dfStorageTypeFactory('aws', creds);
                            scope._buildFieldSet(
                                [
                                    'aws-access-key',
                                    'aws-secret-key',
                                    'aws-region'
                                ], true);
                            break;

                        case 'azure tables':

                            scope._storageType = new dfStorageTypeFactory('azure', creds);
                            scope._buildFieldSet(
                                [
                                    'azure-acct-name',
                                    'azure-acct-key',
                                    'azure-partition-key'
                                ], true);
                            break;

                        case 'couchdb':

                            scope._storageType = new dfStorageTypeFactory('couchdb', creds);
                            scope._buildFieldSet(
                                [
                                    'couch-dsn',
                                    'couch-user-name',
                                    'couch-password'
                                ], true);
                            break;

                        case 'mongodb':

                            scope._storageType = new dfStorageTypeFactory('mongodb', creds);
                            scope._buildFieldSet(
                                [
                                    'mongo-dsn',
                                    'mongo-database',
                                    'mongo-user-name',
                                    'mongo-password',
                                    'mongo-options-ssl'
                                ], true);
                            break;

                        case 'aws s3':

                            scope._storageType = new dfStorageTypeFactory('aws', creds);
                            scope._buildFieldSet(
                                [
                                    'aws-access-key',
                                    'aws-secret-key',
                                    'aws-region'
                                ], true);
                            break;

                        case 'azure blob':

                            scope._storageType = new dfStorageTypeFactory('azure', creds);
                            scope._buildFieldSet(
                                [
                                    'azure-acct-name',
                                    'azure-acct-key'
                                ], true);
                            break;

                        case 'rackspace cloudfiles':

                            scope._storageType = new dfStorageTypeFactory('rackspace', creds);
                            scope._buildFieldSet(
                                [
                                    'rs-user-name',
                                    'rs-api-key',
                                    'rs-tenet-name',
                                    'rs-region',
                                    'rs-endpoint'
                                ], true);
                            break;

                        case 'openstack object storage':

                            scope._storageType = new dfStorageTypeFactory('openstack', creds);
                            scope._buildFieldSet(
                                [
                                    'os-user-name',
                                    'os-password',
                                    'os-tenet-name',
                                    'os-region',
                                    'os-endpoint'
                                ], true);
                            break;

                        case 'aws sns':

                            scope._storageType = new dfStorageTypeFactory('aws', creds);
                            scope._buildFieldSet(
                                [
                                    'aws-access-key',
                                    'aws-secret-key',
                                    'aws-region'
                                ], true);
                            break;


                        default:
                            scope._buildFieldSet(
                                null, true);
                            break;
                    }

                };

                scope._renderServiceFields = function (serviceType) {

                };

                scope._renderRegionUrl = function (region, regions) {

                    var regionObj = regions.find(function (element, index, array) {
                        if (element.value === region) {
                            return element;
                        }
                    });

                    this._storageType.url = regionObj.url;
                };

                scope.addMissingPaidServices = function (types) {

                    // if these paid services are not in service_type array then add them with subscription_required = true

                    var silverServices = [{
                        "name": "adldap",
                        "label": "Active Directory",
                        "description": "A service for supporting Active Directory integration",
                        "group": "LDAP"
                    }, {
                        "name": "ldap",
                        "label": "Standard LDAP",
                        "description": "A service for supporting Open LDAP integration",
                        "group": "LDAP"
                    }, {
                        "name": "oidc",
                        "label": "OpenID Connect",
                        "description": "OpenID Connect service supporting SSO.",
                        "group": "OAuth"
                    }, {
                        "name": "oauth_azure_ad",
                        "label": "Azure Active Directory OAuth",
                        "description": "OAuth service for supporting Azure Active Directory authentication and API access.",
                        "group": "OAuth"
                    }, {
                        "name": "saml",
                        "label": "SAML 2.0",
                        "description": "SAML 2.0 service supporting SSO.",
                        "group": "SSO"
                    }, {
                        "name": "ibmdb2",
                        "label": "IBM DB2",
                        "description": "Database service supporting IBM DB2 SQL connections.",
                        "group": "Database"
                    }, {
                        "name": "informix",
                        "label": "IBM Informix",
                        "description": "Database service supporting IBM Informix SQL connections.",
                        "group": "Database"
                    }, {
                        "name": "oracle",
                        "label": "Oracle",
                        "description": "Database service supporting SQL connections.",
                        "group": "Database"
                    }, {
                        "name": "salesforce_db",
                        "label": "Salesforce",
                        "description": "Database service with SOAP and/or OAuth authentication support for Salesforce connections.",
                        "group": "Database"
                    }, {
                        "name": "soap",
                        "label": "SOAP Service",
                        "description": "A service to handle SOAP Services",
                        "group": "Remote Service"
                    }, {
                        "name": "sqlanywhere",
                        "label": "SAP SQL Anywhere",
                        "description": "Database service supporting SAP SQL Anywhere connections.",
                        "group": "Database"
                    }, {
                        "name": "sqlsrv",
                        "label": "SQL Server",
                        "description": "Database service supporting SQL Server connections.",
                        "group": "Database"
                    }, {
                        "name": "apns",
                        "label": "Apple Push Notification",
                        "description": "Apple Push Notification Service Provider.",
                        "group": "Notification"
                    }, {
                        "name": "gcm",
                        "label": "GCM Push Notification",
                        "description": "GCM Push Notification Service Provider.",
                        "group": "Notification"
                    }];

                    var goldServices = [{
                        "name": "logstash",
                        "label": "Logstash",
                        "description": "Logstash service.",
                        "group": "Log"
                    }];

                    var add = [];

                    angular.forEach(silverServices, function (svc) {

                        var matches = types.filter(function (type) {
                            return svc.name === type.name;
                        });
                        if (matches.length === 0) {
                            svc.singleton = false;
                            svc.config_schema = null;
                            svc.subscription_required = true;
                            svc.subscription_type = 'Silver';
                            add.push(svc);
                        }
                    });

                    angular.forEach(goldServices, function (svc) {

                        var matches = types.filter(function (type) {
                            return svc.name === type.name;
                        });
                        if (matches.length === 0) {
                            svc.singleton = false;
                            svc.config_schema = null;
                            svc.subscription_required = true;
                            svc.subscription_type = 'Gold';
                            add.push(svc);
                        }
                    });

                    return types.concat(add);
                };

                var watchEmailProvider = scope.$watch('_storageType.transport_type', function (newValue, oldValue) {

                    if (!newValue) return false;
                    scope._renderAdditionalEmailFields();

                });

                // Watch the service for changes.
                var watchService = scope.$watch('service', function (newValue, oldValue) {

                    // We don't have a service.  Don't do anything.
                    if (!newValue) return false;

                    // Create a ServiceInfo object
                    scope.serviceInfo = new ServiceInfo(newValue.record);

                    scope.selectedSchema = scope.hcv.serviceTypes && scope.hcv.serviceTypes.filter(function (item) {
                            return scope.serviceInfo && scope.serviceInfo.record && item.name === scope.serviceInfo.record.type;
                        })[0];

                    if (scope.selectedSchema) {
                        scope.decorateSchema();
                    }


                    // We set this to null and then during the _renderServiceFields function
                    // a storage type will be assigned
                    scope._storageType = null;

                    // Sets fields, tabs, and _storageType (this is confusing,  we should change this so that
                    // we just render the proper type of object based on the selected service type.  This is overly
                    // complicated and verbose. Originally, we didn't want to repeat certain sections of code but...
                    // it may make sense to do so in this case.)
                    scope._renderServiceFields(scope.serviceInfo.record.type);

                });

                // watch service types for changes
                var watchServiceTypes = scope.$watchCollection('apiData.service_type', function (newValue, oldValue) {

                    if (newValue) {
                        scope.hcv.serviceTypes = scope.addMissingPaidServices(newValue);
                        if (scope.newService) {
                            // remove any non-creatable types like system or user
                            scope.hcv.serviceTypes = scope.hcv.serviceTypes
                                .filter(function (el) {
                                    return !el.singleton;
                                });
                        }

                        if (!scope.serviceInfo.record)
                            return;

                        scope.selectedSchema = scope.hcv.serviceTypes.filter(function (item) {
                            return item.name === scope.serviceInfo.record.type;
                        })[0];

                        var typeObj = {};

                        var groups = scope.hcv.serviceTypes.map(function(obj) {
                            if (!typeObj.hasOwnProperty(obj.group)) {
                                typeObj[String(obj.group)] = [];
                            }

                            typeObj[String(obj.group)].push({name: obj.name, label: obj.label})

                            return obj.group;
                        });

                        groups = groups.filter(function(v,i) { return groups.indexOf(v) == i; });

                        var sortingArray = [
                            'Database',
                            'File',
                            'Email',
                            'Notification',
                            'Remote Service',
                            'Script',
                            'OAuth',
                            'LDAP'
                        ];

                        groups = scope._sortArray(groups, sortingArray);

                        var _serviceArray = [];

                        for (var i = 0; i < groups.length; i++) {
                            _serviceArray.push({group_name: groups[i], group_types: typeObj[String(groups[i])]});
                            if (i === groups.length - 1) {
                                scope.servicesReady = true;
                                scope.serviceArray = _serviceArray;
                            }
                        }
                    }
                });

                scope.$on('$destroy', function (e) {
                    watchService();
                    watchServiceTypes();
                    watchEmailProvider();
                });

                // HELP
                scope.dfSimpleHelp = {

                    serviceType: {
                        title: 'Service Type ',
                        text: 'Select the type of service you\'re adding.'
                    },
                    name: {
                        title: 'Name ',
                        text: 'Select a name for making API requests, such as \'db\' in /api/v2/db.'
                    },
                    label: {
                        title: 'Label ',
                        text: 'The display name or label for the service.'
                    },
                    description: {
                        title: 'Description ',
                        text: 'Write a brief description of the API (optional).'
                    },
                    baseUrl: {
                        title: 'Base Url ',
                        text: 'Specify the base URL for the remote web service. For example, if you named the API \'mydb\'' +
                        ' and the base URL is http://api.myservice.com/v1/api/, then a REST call to /api/v2/mydb/mytable' +
                        ' would tell DreamFactory to call http://api.myservice.com/v1/api/mydb/mytable.'
                    },
                    userName: {
                        title: 'Username ',
                        text: 'Specify the username for the service you\'re connecting to.'
                    },
                    password: {
                        title: 'Password ',
                        text: 'Specify the password for the service you\'re connecting to.'
                    },
                    connectionString: {
                        title: 'Connection String ',
                        text: 'Specify the connection string for the database you\'re connecting to. '
                    },
                    sqlVendor: {
                        title: 'SQL Vendor ',
                        text: 'Specify the type of database you\'re connecting to.'
                    },
                    sqlHost: {
                        title: 'SQL Host ',
                        text: 'Specify the database host for the database you\'re connecting to.'
                    },
                    sqlDatabaseName: {
                        title: 'SQL Database Name ',
                        text: 'Specify the name of the database you\'re connecting to.'
                    },

                    sfSecurityToken: {
                        title: 'SalesForce Security Token ',
                        text: 'Specify the security token for the Salesforce Org you\'re connecting to.'
                    },
                    sfApiVersion: {
                        title: 'SalesForce APi Version ',
                        text: 'Specify the version of the Salesforce API you\'re using'
                    },
                    noSqlType: {
                        title: 'NoSQL Service Type ',
                        text: 'Specify the type of database you\'re connecting to.'
                    },
                    databaseName: {
                        title: 'Database Name',
                        text: 'Specify the name of the database you\'re connecting to.'
                    },
                    awsAccessKey: {
                        title: 'AWS Access Key ',
                        text: 'Specify the AWS Access Key for the database you\'re connecting to.'
                    },
                    awsSecretKey: {
                        title: 'AWS Secret Key ',
                        text: 'Specify the AWS Secret Key for the database you\'re connecting to.'
                    },
                    awsRegion: {
                        title: 'AWS Region ',
                        text: 'Select the AWS Region for the database you\'re connecting to.'
                    },
                    azureAcctName: {
                        title: 'Azure Account Name ',
                        text: 'Specify the Azure Account Name for the database you\'re connecting to.'
                    },
                    azureAcctKey: {
                        title: 'Azure Account Key ',
                        text: 'Specify the Azure Account Key for the database you\'re connecting to.'
                    },
                    azureDefaultPartitionKey: {
                        title: 'Azure Partition Key ',
                        text: 'Specify the Azure Default Partition Key for the database you\'re connecting to.'
                    },
                    storageType: {
                        title: 'Storage Type ',
                        text: 'Specify the type of storage you\'re connecting to.'
                    },
                    rsApiKey: {
                        title: 'RackSpace Api Key ',
                        text: 'Specify the API Key for the storage you\'re connecting to.'
                    },
                    rsTenantName: {
                        title: 'RackSpace Tenant Name ',
                        text: 'Specify the Tenant Name for the storage you\'re connecting to.'
                    },
                    rsTenantRegion: {
                        title: 'RackSpace Tenant Region ',
                        text: 'Specify the Region for the storage you\'re connecting to.'
                    },
                    rsEndpoint: {
                        title: 'RackSpace Endpoint/URL ',
                        text: 'Specify the URL Endpoint for the storage you\'re connecting to.'
                    },
                    osApiKey: {
                        title: 'OpenStack Api Key ',
                        text: 'Specify the API Key for the storage you\'re connecting to.'
                    },
                    osTenantName: {
                        title: 'OpenStack Tenant Name ',
                        text: 'Specify the Tenant Name for the storage you\'re connecting to.'
                    },
                    osRegion: {
                        title: 'OpenStack Region ',
                        text: 'Specify the Region for the storage you\'re connecting to.'
                    },
                    osEndpoint: {
                        title: 'OpenStack Endpoint/URL ',
                        text: 'Specify the URL Endpoint for the storage you\'re connecting to.'
                    },

                    emailTransportType: {
                        title: 'Email Provider',
                        text: 'Specify the type of provider.'
                    },
                    emailHost: {
                        title: 'Email Host ',
                        text: 'Specify the email host.'
                    },
                    emailPort: {
                        title: 'Email Port ',
                        text: 'Specify the port number.'
                    },
                    emailSecurity: {
                        title: 'Email Security ',
                        text: 'Specify the type of security (e.g. TLS).'
                    },
                    emailCommand: {
                        title: 'Email Command ',
                        text: 'Specify the command path for email.'
                    },
                    pushServiceVendor: {
                        title: 'Push Notification Service Vendor',
                        text: 'Select a Push Notfication Service Provider'
                    }
                }
            }
        }
    }])
    .directive('dfServiceConfig', ['MOD_SERVICES_ASSET_PATH', 'dfServiceValues', 'dfApplicationData', 'dfObjectService', 'dfStorageTypeFactory', '$compile', '$templateCache', '$rootScope', 'dfNotify', function (MOD_SERVICES_ASSET_PATH, dfServiceValues, dfApplicationData, dfObjectService, dfStorageTypeFactory, $compile, $templateCache, $rootScope, dfNotify) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-service-config.html',
            link: function (scope, elem, attrs) {

                // @TODO: Refactor to factory
                var ServiceConfig = function (serviceConfigData) {

                    var _new = {
                        "config": {}
                    };

                    var data = angular.copy(serviceConfigData) || _new;

                    return {
                        __dfUI: {},
                        record: data,
                        recordCopy: angular.copy(data)
                    }
                };

                scope.allowedConfigFormats = '.json,.js,.php,.py,.python,.yaml,.yml';
                scope.allowedConfigGitFormats = ['json','js','php','py','python','yaml','yml'];
                scope.serviceTypeConfig = 'configmodal';

                scope.isArray = angular.isArray;

                scope.customConfig = [];
                scope.servicesReady = false;

                scope.githubModalShowConfig = function () {

                    $rootScope.$broadcast('githubShowModal', 'configmodal');
                };

                scope.addKeyValue = function (field) {
                    if (!scope.serviceInfo.record.config[field]) {
                        scope.serviceInfo.record.config[field] = [];
                    }
                    scope.serviceInfo.record.config[field].push({key: 'new_key', value: 'new_value'});
                };

                scope.deleteKeyValue = function (obj, $index) {
                    obj.splice($index, 1);
                };

                scope.appendItemToArray = function (configObj, key) {
                    if (!configObj[key]) {
                        configObj[key] = [];
                    }

                    var schema = scope.selectedSchema.config_schema.filter(function (item) {
                        return item.name == key
                    })[0] || {};

                    if (schema.items instanceof Array) {
                        scope.serviceInfo.record.config[key].push({ });
                    } else if (schema.items === 'string') {
                        scope.serviceInfo.record.config[key].push('');
                    }
                };

                scope.deleteStringFromArray = function (arr, index) {
                    arr.splice(index, 1);
                };

                scope.addObjectInArray = function (configObj, key, items) {
                    if (!configObj[key]) {
                        configObj[key] = [];
                    }
                    var newObj = {};
                    items.forEach(function (item) {
                        switch (item.type) {
                            case 'text':
                            case 'string':
                                newObj[item.name] = '';
                                break;
                            case "boolean":
                                newObj[item.name] = false;
                                break;
                            case "verb_mask":
                                newObj[item.name] = 31; // allow all verbs
                                break;
                        }
                    });
                    configObj[key].push(newObj);
                };

                scope.deleteObjectFromArray = function (arr, index) {
                    arr = arr.splice(index, 1);
                };

                scope.decorateSchema = function () {
                    var selectedType = scope.serviceInfo.record.type;
                    var customConfigs = scope.customConfig.filter(function (config) {
                        return config.applicableTo.some(function (item) {
                            return item === selectedType;
                        })
                    });

                    customConfigs.forEach(function (item) {
                        var obj = scope.selectedSchema.config_schema.filter(function (schema) {
                                return schema.name == item.name;
                            })[0] || {};

                        angular.extend(obj, item)
                    });

                    if (scope.selectedSchema.hasOwnProperty('config_schema') && scope.selectedSchema.config_schema !== null) {

                        // Set default dfServiceValues
                        scope.selectedSchema.config_schema.forEach(function (schema) {

                            if (schema.default) {
                                scope.serviceInfo.record.config[schema.name] = scope.serviceInfo.record.config[schema.name] || schema.default;

                            } else if (schema.name === "content" && scope.selectedSchema.group === "Custom") {
                                scope.serviceInfo.record.config["content"] = scope.serviceInfo.record.config["content"] || "";
                            }

                        });
                    }
                };

                scope.getReferences = function (key, valueField) {
                    var dfApplicationObjApis = dfApplicationData.getApplicationObj().apis || [];
                    return dfApplicationObjApis[key].record.map(function (item) {
                        return {name: item.name, value: item[valueField] || item.id };
                    });
                };

                scope.hcv = new dfServiceValues();

                scope.changeServiceType = function () {

                    if (!scope.serviceInfo && !scope.serviceInfo.record) {
                        return;
                    }

                    scope.serviceInfo.record.config = {};
                    scope.selectedSchema = scope.hcv.serviceTypes.filter(function (item) {
                        return item.name === scope.serviceInfo.record.type;
                    })[0];

                    if (scope.selectedSchema) {
                        scope.decorateSchema();
                    }

                    scope._changeDefinitionView();

                    scope.hcv.serviceTypes = scope.addMissingPaidServices(scope.apiData.service_type);

                    scope.handleFiles = function (files) {
                        if (!files) return;
                        var file = files && files[0];
                        if (file) {
                            var reader = new FileReader();
                            reader.readAsText(file, "UTF-8");
                            reader.onload = function (evt) {
                                scope.serviceInfo.record.config["content"] = evt.target.result;
                                scope.$apply();
                            };
                            reader.onerror = function (evt) {
                                console.log('error')
                            }
                        }
                    };

                    if (scope.newService) {
                        // remove any non-creatable types like system or user
                        scope.hcv.serviceTypes = scope.hcv.serviceTypes
                            .filter(function (el) {
                                return !el.singleton;
                            });
                    }

                    if (!scope.serviceInfo.record)
                        return;

                    scope.selectedSchema = scope.hcv.serviceTypes.filter(function (item) {
                        return item.name === scope.serviceInfo.record.type;
                    })[0];

                    scope.servicesReady = true;
                };


                scope._script = {};
                scope.serviceInfo = {};
                scope._storageType = {};
                scope.eventList = [];

                scope.sql_server_host_identifier = null;
                scope.sql_server_db_identifier = null;


                scope._buildFieldSet = function (fieldSetArray, append) {

                    var addFields = null;

                    if (!append) {
                        elem.html('');
                    }
                    else {

                        addFields = angular.element('#additionalFields');

                        if (addFields.length) {

                            addFields.html('');
                        } else {

                            elem.append('<div id="additionalFields"></div>');
                            addFields = angular.element('#additionalFields');
                        }
                    }

                    if (!fieldSetArray) {
                        return;
                    }

                    angular.forEach(fieldSetArray, function (fieldName) {

                        if (!append) {

                            elem.append($compile($templateCache.get('_service-' + fieldName + '.html'))(scope));
                        }
                        else {

                            addFields.append($compile($templateCache.get('_service-' + fieldName + '.html'))(scope));
                        }
                    });
                };


                scope._prepareServiceNoSQLData = function () {

                    if (scope.service.record.storage_type === 'mongodb') {
                        if (scope.service.record.config.options_ctrl === true) {
                            scope.service.record.config.options = {ssl: true};
                        }
                        else {
                            scope.service.record.config.options = {};
                        }
                    }
                };

                scope._prepareServiceConfigData = function () {

                    scope.service.record = dfObjectService.mergeObjects(scope.serviceInfo.record, scope.service.record);
                };

                scope._prepareRWS = function () {

                    return scope._storageType;
                };

                scope._prepareEmailData = function () {

                    scope._storageType['user'] = scope.serviceInfo.record.config.user;
                    scope._storageType['password'] = scope.serviceInfo.record.config.password;

                    return scope._storageType;
                };

                scope._prepareRFS = function () {

                    switch (scope.serviceInfo.record.storage_type) {
                        case "aws s3":
                            // nothing to do
                            break;
                        case "azure blob":
                            delete scope._storageType.PartitionKey
                            break;
                        case "rackspace cloudfiles":
                        case "openstack object storage":
                            // nothing to do
                            break;
                    }
                    return scope._storageType;
                };

                scope._prepareSF = function () {

                    return scope._storageType;
                };

                scope._prepareNoSQL = function () {

                    switch (scope.serviceInfo.record.storage_type) {
                        case "aws dynamodb":
                        case "aws simpledb":
                        case "azure tables":
                            var temp = angular.copy(scope._storageType);
                            if (temp.hasOwnProperty('private_paths')) {
                                delete temp.private_paths
                            }
                            return temp;
                        case "couchdb":
                        case "mongodb":
                            return scope._storageType;
                    }
                };

                scope._prepareSQLDB = function () {

                    return {
                        dsn: scope._storageType.dsn,
                        user: scope._storageType.user,
                        pwd: scope._storageType.pwd
                    };
                };

                scope._prepareLFS = function () {

                    return scope._storageType;
                };

                scope._preparePS = function () {

                    return scope._storageType;
                };

                scope._dsnToFields = function (dsn) {


                    function nth_ocurrence(str, needle, nth) {

                        for (var i = 0; i < str.length; i++) {
                            if (str.charAt(i) == needle) {
                                if (!--nth) {
                                    return i;
                                }
                            }
                        }
                        return false;
                    }


                    dsn = dsn || scope._storageType.dsn;

                    if (!dsn) return;

                    scope._storageType['prefix'] = dsn.slice(0, dsn.indexOf(":"));

                    switch (scope._storageType.prefix) {

                        case 'oci':
                            scope.sql_server_host_identifier = "host";
                            scope.sql_server_db_identifier = "sid";


                            scope._storageType['host'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_host_identifier), nth_ocurrence(dsn, ')', 2)).split("=")[1];
                            scope._storageType['dbname'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_db_identifier), nth_ocurrence(dsn, ')', 6)).split("=")[1];
                            break;


                        case 'ibm':
                            scope.sql_server_host_identifier = "HOSTNAME";
                            scope.sql_server_db_identifier = "DATABASE";

                            scope._storageType['host'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_host_identifier), nth_ocurrence(dsn, ';', 3)).split("=")[1];
                            scope._storageType['dbname'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_db_identifier), nth_ocurrence(dsn, ';', 2)).split("=")[1];
                            break;

                        case 'sqlsrv':

                            // set the host/db identifiers
                            scope.sql_server_host_identifier = "Server";
                            scope.sql_server_db_identifier = "Database";


                        default:

                            scope.sql_server_host_identifier = "host";
                            scope.sql_server_db_identifier = "dbname";

                            scope._storageType['host'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_host_identifier), dsn.indexOf(";")).split("=")[1];


                            if (dsn.indexOf('port=') > dsn.indexOf(scope.sql_server_db_identifier)) {
                                scope._storageType['dbname'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_db_identifier), nth_ocurrence(dsn, ';', 2)).split("=")[1];

                            }
                            else if (dsn.indexOf('port=') > dsn.indexOf(scope.sql_server_db_identifier)) {
                                scope._storageType['dbname'] = dsn.slice(dsn.lastIndexOf(scope.sql_server_db_identifier), dsn.length).split("=")[1];
                            }

                    }
                };

                scope._updateDsn = function () {

                    var string = '';


                    switch (scope._storageType.prefix) {

                        case 'sqlsrv':

                            // set the host/db identifiers
                            scope.sql_server_host_identifier = "Server";
                            scope.sql_server_db_identifier = "Database";

                            if (scope._storageType.prefix) string += scope._storageType.prefix + ':';

                            string += scope.sql_server_host_identifier + '=' + scope._storageType.host + ';';
                            string += scope.sql_server_db_identifier + '=' + scope._storageType.dbname;

                            break;

                        case 'oci':
                            scope.sql_server_host_identifier = "host";
                            scope.sql_server_db_identifier = "sid";

                            if (scope._storageType.prefix) string += scope._storageType.prefix + ':';

                            string += "dbname=(DESCRIPTION = (ADDRESS_LIST = (ADDRESS = (PROTOCOL = TCP)(" + scope.sql_server_host_identifier + '=' + scope._storageType.host + ")(PORT = 1521))) (CONNECT_DATA = (" + scope.sql_server_db_identifier + "=" + scope._storageType.dbname + ")))"

                            break;

                        case 'ibm':
                            scope.sql_server_host_identifier = "HOSTNAME";
                            scope.sql_server_db_identifier = "DATABASE";

                            if (scope._storageType.prefix) string += scope._storageType.prefix + ':';

                            string += "DRIVER={IBM DB2 ODBC DRIVER};" + scope.sql_server_db_identifier + "=" + scope._storageType.dbname + ";" + scope.sql_server_host_identifier + "=" + scope._storageType.host + ";PORT=50000;PROTOCOL=TCPIP;";

                            break;

                        default:
                            scope.sql_server_host_identifier = "host";
                            scope.sql_server_db_identifier = "dbname";

                            if (scope._storageType.prefix) string += scope._storageType.prefix + ':';

                            string += scope.sql_server_host_identifier + '=' + scope._storageType.host + ';';
                            string += scope.sql_server_db_identifier + '=' + scope._storageType.dbname;
                    }


                    scope._storageType.dsn = string;
                };

                scope._fieldsToDsn = function () {

                    return scope._storageType.prefix + ':' + scope.sql_server_host_identifier + '=' + scope._storageType.host + ';' + scope.sql_server_db_identifier + '=' + scope._storageType.dbname
                };


                scope._renderAdditionalEmailFields = function () {

                    switch (scope._storageType.transport_type) {
                        case 'command':
                            scope._buildFieldSet(
                                [
                                    'email-command'
                                ], true);
                            break;
                        case 'smtp':
                            scope._buildFieldSet(
                                [
                                    'email-host',
                                    'email-port',
                                    'email-security',
                                    'user-name',
                                    'password'
                                ], true);
                            break;
                    }
                };

                scope._renderAdditionalFields = function (storageType) {

                    var creds = {};

                    if (storageType === scope.serviceInfo.recordCopy.storage_type) {
                        creds = scope.serviceInfo.record.config;
                    }

                    switch (storageType) {

                        case 'aws dynamodb':
                        case 'aws simpledb':

                            scope._storageType = new dfStorageTypeFactory('aws', creds);
                            scope._buildFieldSet(
                                [
                                    'aws-access-key',
                                    'aws-secret-key',
                                    'aws-region'
                                ], true);
                            break;

                        case 'azure tables':

                            scope._storageType = new dfStorageTypeFactory('azure', creds);
                            scope._buildFieldSet(
                                [
                                    'azure-acct-name',
                                    'azure-acct-key',
                                    'azure-partition-key'
                                ], true);
                            break;

                        case 'couchdb':

                            scope._storageType = new dfStorageTypeFactory('couchdb', creds);
                            scope._buildFieldSet(
                                [
                                    'couch-dsn',
                                    'couch-user-name',
                                    'couch-password'
                                ], true);
                            break;

                        case 'mongodb':

                            scope._storageType = new dfStorageTypeFactory('mongodb', creds);
                            scope._buildFieldSet(
                                [
                                    'mongo-dsn',
                                    'mongo-database',
                                    'mongo-user-name',
                                    'mongo-password',
                                    'mongo-options-ssl'
                                ], true);
                            break;

                        case 'aws s3':

                            scope._storageType = new dfStorageTypeFactory('aws', creds);
                            scope._buildFieldSet(
                                [
                                    'aws-access-key',
                                    'aws-secret-key',
                                    'aws-region'
                                ], true);
                            break;

                        case 'azure blob':

                            scope._storageType = new dfStorageTypeFactory('azure', creds);
                            scope._buildFieldSet(
                                [
                                    'azure-acct-name',
                                    'azure-acct-key'
                                ], true);
                            break;

                        case 'rackspace cloudfiles':

                            scope._storageType = new dfStorageTypeFactory('rackspace', creds);
                            scope._buildFieldSet(
                                [
                                    'rs-user-name',
                                    'rs-api-key',
                                    'rs-tenet-name',
                                    'rs-region',
                                    'rs-endpoint'
                                ], true);
                            break;

                        case 'openstack object storage':

                            scope._storageType = new dfStorageTypeFactory('openstack', creds);
                            scope._buildFieldSet(
                                [
                                    'os-user-name',
                                    'os-password',
                                    'os-tenet-name',
                                    'os-region',
                                    'os-endpoint'
                                ], true);
                            break;

                        case 'aws sns':

                            scope._storageType = new dfStorageTypeFactory('aws', creds);
                            scope._buildFieldSet(
                                [
                                    'aws-access-key',
                                    'aws-secret-key',
                                    'aws-region'
                                ], true);
                            break;


                        default:
                            scope._buildFieldSet(
                                null, true);
                            break;
                    }

                };

                scope._renderServiceFields = function (serviceType) {

                };

                scope._renderRegionUrl = function (region, regions) {

                    var regionObj = regions.find(function (element, index, array) {
                        if (element.value === region) {
                            return element;
                        }
                    });

                    this._storageType.url = regionObj.url;
                };

                var watchEmailProvider = scope.$watch('_storageType.transport_type', function (newValue, oldValue) {

                    if (!newValue) return false;
                    scope._renderAdditionalEmailFields();

                });

                // Watch the service for changes.
                var watchService = scope.$watch('service', function (newValue, oldValue) {

                    // We don't have a service.  Don't do anything.
                    if (!newValue) return false;

                    // Create a ServiceConfig object
                    scope.serviceInfo = new ServiceConfig(newValue.record);

                    scope.selectedSchema = scope.hcv.serviceTypes && scope.hcv.serviceTypes.filter(function (item) {
                            return scope.serviceInfo && scope.serviceInfo.record && item.name === scope.serviceInfo.record.type;
                        })[0];

                    if (scope.selectedSchema) {
                        scope.decorateSchema();
                    }

                    // We set this to null and then during the _renderServiceFields function
                    // a storage type will be assigned
                    scope._storageType = null;

                    // Sets fields, and _storageType (this is confusing,  we should change this so that
                    // we just render the proper type of object based on the selected service type.  This is overly
                    // complicated and verbose. Originally, we didn't want to repeat certain sections of code but...
                    // it may make sense to do so in this case.)
                    scope._renderServiceFields(scope.serviceInfo.record.type);


                });

                var watchSelectedSchema = scope.$watch('selectedSchema', function (newValue, oldValue) {

                    var loadEvents, i;

                    if (!newValue) return;

                    // set allowed file types
                    switch (newValue.name) {
                        case 'nodejs':
                            scope.allowedConfigFormats = '.js';
                            scope.allowedConfigGitFormats = ['js'];
                            break;
                        case 'php':
                            scope.allowedConfigFormats = '.php';
                            scope.allowedConfigGitFormats = ['php'];
                            break;
                        case 'python':
                            scope.allowedConfigFormats = '.py,.python';
                            scope.allowedConfigGitFormats = ['py','python'];
                            break;
                        case 'v8js':
                            scope.allowedConfigFormats = '.js';
                            scope.allowedConfigGitFormats = ['js'];
                            break;
                        default:
                            scope.allowedConfigFormats = '.json,.js,.php,.yaml,.yml';
                            scope.allowedConfigGitFormats = ['json','js','php','yaml','yml'];
                    }

                    // Some services need an event list, currently GCM, APN, and Logstash. These all have a
                    // common entry in their config_schema array named 'service_event_map' which we look for
                    // to trigger loading of events. Events are loaded only as needed, because it can be
                    // slow when there are many services or fail completely if there are bad services, rendering
                    // the admin app services tab inoperable. We check for this here because it works for both
                    // creating and editing services.
                    if (newValue.config_schema) {
                        loadEvents = false;
                        for (i = 0; i < newValue.config_schema.length; i++) {
                            if (newValue.config_schema[i].name === 'service_event_map') {
                                loadEvents = true;
                                break;
                            }
                        }
                        if (loadEvents) {
                            // Trigger loading of event list. It will be cached after first time.
                            dfApplicationData.getApiData(['eventlist']).then(
                                function (response) {
                                    scope.apiData.eventlist = response[0].resource;
                                },
                                function (error) {
                                    var messageOptions = {
                                        module: 'Services',
                                        provider: 'dreamfactory',
                                        type: 'error',
                                        message: 'There was an error loading the service. Please try refreshing your browser and logging in again.'
                                    };
                                    dfNotify.error(messageOptions);
                                }
                            );
                        }
                    }
                });

                var watchEventList = scope.$watchCollection('apiData.eventlist', function (newValue, oldValue) {

                    var temp = {};
                    var serviceEvents = [];

                    if (newValue) {
                        angular.forEach(newValue, function (event) {
                            var service = event;
                            var index = service.indexOf('.');
                            if (index >= 0) {
                                service = service.substr(0, index);
                            }
                            if (!temp[service]) {
                                temp[service] = [];
                            }
                            temp[service].push({
                                'label': event,
                                'name': event
                            });
                        });

                        angular.forEach(temp, function(items, service) {
                            items.unshift({'label': 'All ' + service + ' events', 'name': service + '.*'});
                            serviceEvents.push({'label': service, 'name': service, 'items': items});
                        });

                        scope.eventList = serviceEvents;
                    }
                });


                scope.$on('$destroy', function (e) {

                    watchService();
                    watchEmailProvider();
                    watchSelectedSchema();
                    watchEventList();
                });

                // HELP
                scope.dfSimpleHelp = {

                    serviceType: {
                        title: 'Service Type ',
                        text: 'Select the type of service you\'re adding.'
                    },
                    name: {
                        title: 'Name ',
                        text: 'Select a name for making API requests, such as \'db\' in /api/v2/db.'
                    },
                    label: {
                        title: 'Label ',
                        text: 'The display name or label for the service.'
                    },
                    description: {
                        title: 'Description ',
                        text: 'Write a brief description of the API (optional).'
                    },
                    baseUrl: {
                        title: 'Base Url ',
                        text: 'Specify the base URL for the remote web service. For example, if you named the API \'mydb\'' +
                        ' and the base URL is http://api.myservice.com/v1/api/, then a REST call to /api/v2/mydb/mytable' +
                        ' would tell DreamFactory to call http://api.myservice.com/v1/api/mydb/mytable.'
                    },
                    userName: {
                        title: 'Username ',
                        text: 'Specify the username for the service you\'re connecting to.'
                    },
                    password: {
                        title: 'Password ',
                        text: 'Specify the password for the service you\'re connecting to.'
                    },
                    connectionString: {
                        title: 'Connection String ',
                        text: 'Specify the connection string for the database you\'re connecting to. '
                    },
                    sqlVendor: {
                        title: 'SQL Vendor ',
                        text: 'Specify the type of database you\'re connecting to.'
                    },
                    sqlHost: {
                        title: 'SQL Host ',
                        text: 'Specify the database host for the database you\'re connecting to.'
                    },
                    sqlDatabaseName: {
                        title: 'SQL Database Name ',
                        text: 'Specify the name of the database you\'re connecting to.'
                    },

                    sfSecurityToken: {
                        title: 'SalesForce Security Token ',
                        text: 'Specify the security token for the Salesforce Org you\'re connecting to.'
                    },
                    sfApiVersion: {
                        title: 'SalesForce APi Version ',
                        text: 'Specify the version of the Salesforce API you\'re using'
                    },
                    noSqlType: {
                        title: 'NoSQL Service Type ',
                        text: 'Specify the type of database you\'re connecting to.'
                    },
                    databaseName: {
                        title: 'Database Name',
                        text: 'Specify the name of the database you\'re connecting to.'
                    },
                    awsAccessKey: {
                        title: 'AWS Access Key ',
                        text: 'Specify the AWS Access Key for the database you\'re connecting to.'
                    },
                    awsSecretKey: {
                        title: 'AWS Secret Key ',
                        text: 'Specify the AWS Secret Key for the database you\'re connecting to.'
                    },
                    awsRegion: {
                        title: 'AWS Region ',
                        text: 'Select the AWS Region for the database you\'re connecting to.'
                    },
                    azureAcctName: {
                        title: 'Azure Account Name ',
                        text: 'Specify the Azure Account Name for the database you\'re connecting to.'
                    },
                    azureAcctKey: {
                        title: 'Azure Account Key ',
                        text: 'Specify the Azure Account Key for the database you\'re connecting to.'
                    },
                    azureDefaultPartitionKey: {
                        title: 'Azure Partition Key ',
                        text: 'Specify the Azure Default Partition Key for the database you\'re connecting to.'
                    },
                    storageType: {
                        title: 'Storage Type ',
                        text: 'Specify the type of storage you\'re connecting to.'
                    },
                    rsApiKey: {
                        title: 'RackSpace Api Key ',
                        text: 'Specify the API Key for the storage you\'re connecting to.'
                    },
                    rsTenantName: {
                        title: 'RackSpace Tenant Name ',
                        text: 'Specify the Tenant Name for the storage you\'re connecting to.'
                    },
                    rsTenantRegion: {
                        title: 'RackSpace Tenant Region ',
                        text: 'Specify the Region for the storage you\'re connecting to.'
                    },
                    rsEndpoint: {
                        title: 'RackSpace Endpoint/URL ',
                        text: 'Specify the URL Endpoint for the storage you\'re connecting to.'
                    },
                    osApiKey: {
                        title: 'OpenStack Api Key ',
                        text: 'Specify the API Key for the storage you\'re connecting to.'
                    },
                    osTenantName: {
                        title: 'OpenStack Tenant Name ',
                        text: 'Specify the Tenant Name for the storage you\'re connecting to.'
                    },
                    osRegion: {
                        title: 'OpenStack Region ',
                        text: 'Specify the Region for the storage you\'re connecting to.'
                    },
                    osEndpoint: {
                        title: 'OpenStack Endpoint/URL ',
                        text: 'Specify the URL Endpoint for the storage you\'re connecting to.'
                    },

                    emailTransportType: {
                        title: 'Email Provider',
                        text: 'Specify the type of provider.'
                    },
                    emailHost: {
                        title: 'Email Host ',
                        text: 'Specify the email host.'
                    },
                    emailPort: {
                        title: 'Email Port ',
                        text: 'Specify the port number.'
                    },
                    emailSecurity: {
                        title: 'Email Security ',
                        text: 'Specify the type of security (e.g. TLS).'
                    },
                    emailCommand: {
                        title: 'Email Command ',
                        text: 'Specify the command path for email.'
                    },
                    pushServiceVendor: {
                        title: 'Push Notification Service Vendor',
                        text: 'Select a Push Notfication Service Provider'
                    }
                }
            }
        }
    }])
    .directive('dfManageServices', ['$rootScope', 'MOD_SERVICES_ASSET_PATH', 'dfApplicationData', 'dfNotify', function ($rootScope, MOD_SERVICES_ASSET_PATH, dfApplicationData, dfNotify) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-manage-services.html',
            link: function (scope, elem, attrs) {


                var ManagedService = function (serviceData) {

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: serviceData
                    }
                };

                scope.services = null;

                scope.currentEditService = null;

                scope.fields = [
                    {
                        name: 'id',
                        label: 'ID',
                        active: true
                    },
                    {
                        name: 'name',
                        label: 'Name',
                        active: true
                    },
                    {
                        name: 'label',
                        label: 'Label',
                        active: true
                    },
                    {
                        name: 'description',
                        label: 'Description',
                        active: true
                    },
                    {
                        name: 'type',
                        label: 'Type',
                        active: true
                    },
                    {
                        name: 'is_active',
                        label: 'Active',
                        active: true
                    }
                ];

                scope.order = {
                    orderBy: 'id',
                    orderByReverse: false
                };

                scope.selectedServices = [];

                scope.allSelected = false;


                // PUBLIC API
                scope.toggleViewMode = function (mode) {

                    scope._toggleViewMode(mode);
                };

                scope.editService = function (service) {
                    scope._editService(service);
                };

                scope.deleteService = function (service) {

                    if (dfNotify.confirm("Delete " + service.record.label + "?")) {
                        scope._deleteService(service);
                    }
                };

                scope.deleteSelectedServices = function () {

                    if (dfNotify.confirm("Delete selected services?")) {
                        scope._deleteSelectedServices();
                    }
                };

                scope.orderOnSelect = function (fieldObj) {

                    scope._orderOnSelect(fieldObj);
                };

                scope.setSelected = function (service) {

                    scope._setSelected(service);
                };


                // PRIVATE API
                scope._deleteFromServer = function (requestDataObj) {

                    return dfApplicationData.deleteApiData('service', requestDataObj).$promise;
                };


                // COMPLEX IMPLEMENTATION

                scope._editService = function (service) {
                    scope.currentEditService = service;
                };

                scope._deleteService = function (service) {

                    var requestDataObj = {
                        params: {
                            id: service.record.id
                        }
                    };


                    scope._deleteFromServer(requestDataObj).then(
                        function (result) {

                            // notify success
                            var messageOptions = {
                                module: 'Services',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Service successfully deleted.'
                            };

                            dfNotify.success(messageOptions);

                            // Was this service previously selected before
                            // we decided to remove them individually
                            if (service.__dfUI.selected) {

                                // This will remove the service from the selected
                                // service array
                                scope.setSelected(service);

                            }

                            scope.$broadcast('toolbar:paginate:service:delete');
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
                    ).finally(
                        function () {

                            // console.log('Delete Service Finally')
                        }
                    )
                };

                scope._orderOnSelect = function (fieldObj) {

                    var orderedBy = scope.order.orderBy;

                    if (orderedBy === fieldObj.name) {
                        scope.order.orderByReverse = !scope.order.orderByReverse;
                    } else {
                        scope.order.orderBy = fieldObj.name;
                        scope.order.orderByReverse = false;
                    }
                };

                scope._setSelected = function (service) {


                    var i = 0;

                    while (i < scope.selectedServices.length) {

                        if (service.record.id === scope.selectedServices[i]) {

                            service.__dfUI.selected = false;
                            scope.selectedServices.splice(i, 1);
                            return;
                        }

                        i++
                    }

                    service.__dfUI.selected = true;
                    scope.selectedServices.push(service.record.id);

                };

                scope._deleteSelectedServices = function () {

                    var requestDataObj = {
                        params: {
                            ids: scope.selectedServices.join(','),
                            rollback: true
                        }
                    };


                    scope._deleteFromServer(requestDataObj).then(
                        function (result) {

                            var messageOptions = {
                                module: 'Services',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Services deleted successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.selectedServices = [];

                            scope.$broadcast('toolbar:paginate:service:reset');
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
                    ).finally(
                        function () {

                            // console.log('Delete Services Finally');
                        }
                    )
                };


                // WATCHERS

                // this fires when the API data changes
                // apiData is passed in to the details directive as data-api-data
                var watchApiData = scope.$watchCollection('apiData.service', function (newValue, oldValue) {

                    var _services = [];

                    if (newValue) {
                        angular.forEach(newValue, function (service) {
                            _services.push(new ManagedService(service));
                        });
                        scope.emptySectionOptions.active = (newValue.length === 0);
                    }

                    scope.services = _services;
                });


                // MESSAGES

                // broadcast by pagination code when new data is available
                scope.$on('toolbar:paginate:service:update', function (e) {

                    scope.loadTabData();
                });

                scope.$on('$destroy', function (e) {

                    // Destroy watchers
                    watchApiData();
                });

                scope.$watch('$viewContentLoaded',
                    function(event){
                        $rootScope.isRouteLoading = false;
                    }
                );
            }
        }
    }])

    .directive('dfServiceLoading', ['$rootScope', function($rootScope) {
        return {
            restrict: 'E',
            template: "<div class='col-lg-12' ng-if='isRouteLoading'><span style='display: block; width: 100%; text-align: center; color: #A0A0A0; font-size: 50px; margin-top: 100px'><i class='fa fa-refresh fa-spin'></i></div>"
        };
    }])

    .directive('dfServiceDefinition', ['MOD_SERVICES_ASSET_PATH', 'dfServiceValues', '$timeout', '$rootScope', function (MOD_SERVICES_ASSET_PATH, dfServiceValues, $timeout, $rootScope) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-service-definition.html',
            link: function (scope, elem, attrs) {

                scope.isEditorClean = true;
                scope.isEditable = false;
                scope.currentEditor = null;
                scope.currentFile = null;
                scope.hideGutter = true;
                scope.serviceDefinitionFormat = 0;
                scope.allowedDefinitionFormats = ['json','yml','yaml'];
                scope.serviceType = 'definition';

                scope._changeDefinitionView = function() {

                    switch (scope.serviceInfo.record.type) {

                        case 'rws':
                        case 'nodejs':
                        case 'php':
                        case 'python':
                        case 'v8js':
                            scope.isEditable = true;
                            break;

                        default:
                            scope.isEditable = false;
                    }
                };

                scope._prepareServiceDefinitionData = function () {

                    if (scope.currentEditor === null) {
                      scope.service.record.service_doc_by_service_id = [];
                      return;
                    }

                    if (scope.currentEditor.session.getValue() === "") {
                        scope.service.record.service_doc_by_service_id = [];
                    }
                    else {
                        scope.service.record.service_doc_by_service_id[0] = scope.service.record.service_doc_by_service_id[0] || {};
                        scope.service.record.service_doc_by_service_id[0].content = scope.currentEditor.session.getValue();
                        scope.service.record.service_doc_by_service_id[0].format = parseInt(scope.serviceDefinitionFormat);
                    }
                };

                scope.changeDefinitionFormat = function() {
                    var aceElement = $('div[id^="ide_"]');
                    scope.editor = ace.edit(aceElement[0].id);

                    if (scope.serviceDefinitionFormat == 0) {
                        scope.editor.session.setMode("ace/mode/json");
                    }
                    else if (scope.serviceDefinitionFormat == 1) {
                        scope.editor.session.setMode("ace/mode/yaml");
                    }
                };

                scope.handleDefinitionFiles = function (files) {
                    if (!files) return;

                    var file = files && files[0];
                    if (file) {
                        var reader = new FileReader();
                        reader.readAsText(file, "UTF-8");
                        reader.onload = function (evt) {

                            scope.currentFile = evt.target.result;
                            scope.$apply();

                            var aceElement = $('div[id^="ide_"]');
                            scope.editor = ace.edit(aceElement[0].id);

                            if (files[0].name.indexOf('json') !== -1) {
                                scope.editor.session.setMode("ace/mode/json");
                                scope.serviceDefinitionFormat = 0;
                            }
                            else if (files[0].name.indexOf('yml') !== -1) {
                                scope.editor.session.setMode("ace/mode/yaml");
                                scope.serviceDefinitionFormat = 1;
                            }
                            else if (files[0].name.indexOf('yaml') !== -1) {
                                scope.editor.session.setMode("ace/mode/yaml");
                                scope.serviceDefinitionFormat = 1;
                            }
                            else {
                                scope.editor.session.setMode("ace/mode/json");
                                scope.serviceDefinitionFormat = 0;
                            }

                            scope.$apply();
                        };
                        reader.onerror = function (evt) {
                            console.log('error')
                        }
                    }
                };


                scope.$watch('service', function (newValue, oldValue) {

                    if (!newValue) return;

                    if (newValue.record.hasOwnProperty('service_doc_by_service_id') && newValue.record.service_doc_by_service_id[0]) {
                        if(!newValue.record.service_doc_by_service_id[0].content) {
                            scope.currentFile = '';
                        } else {
                            if (newValue.record.service_doc_by_service_id[0].format === 0) {
                                scope.currentFile = angular.fromJson(newValue.record.service_doc_by_service_id[0].content);
                                scope.serviceDefinitionFormat = 0;
                            }
                            else {
                                scope.currentFile = newValue.record.service_doc_by_service_id[0].content;
                                scope.serviceDefinitionFormat = 1;
                            }
                        }
                    } else {
                        scope.currentFile = '';
                    }

                    switch (newValue.record.type) {
                        case 'rws':
                        case 'nodejs':
                        case 'php':
                        case 'python':
                        case 'v8js':
                            scope.isEditable = true;
                            break;

                        default:
                            scope.isEditable = false;
                    }
                });

                scope.githubModalShowDef = function (serviceType) {

                    $rootScope.$broadcast('githubShowModal', 'definition');
                };

                // Hack way to update text in editor;
                $('#json-editor-tab').on('click', function () {
                    scope.currentEditor.renderer.updateText();
                    scope.currentEditor.focus();
                    $(window).trigger('resize');
                });

                $(window).on('resize', function () {

                    var h = $(window).height();

                    $('div[id^="ide_"]').css({
                        height: h - 400 + 'px'
                    })
                });

                var listener = function () {
                    $timeout(function() {
                        if (!scope.currentEditor.session.$annotations) return;

                        var canDo = scope.currentEditor.session.$annotations.some(function(item) {
                            if(item.type === 'error') return true;
                            else return false;
                        });

                        if (canDo) {
                            $('.save-service-btn').addClass('disabled');
                        } else {
                            $('.save-service-btn').removeClass('disabled');
                        }
                    }, 500);
                };

                var editorWatch = scope.$watch('currentEditor', function(newValue) {
                    if (!newValue) {
                        return;
                    }

                    scope.$watch(function() {
                        return scope.currentEditor.session.$annotations;
                    }, function () {
                        listener();
                    });

                    scope.currentEditor.on('input', function () {
                        listener();
                    });
                });
            }
        }
    }])
    .factory('dfStorageTypeFactory', ['dfObjectService', function (dfObjectService) {


        return function (storageType, data) {

            // Is this object stringified
            if (Object.prototype.toString.call('data') === '[object String]') {
                data = angular.fromJson(data);
            }

            // check if we actually passed any data
            if (!data || !Object.keys(data).length > 0) {
                data = null;
            }


            var AWS = function (data) {

                var _new = {
                    private_paths: [],
                    access_key: null,
                    secret_key: null,
                    region: null
                };

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            };

            var Azure = function (data) {

                var _new = {
                    private_paths: [],
                    account_name: null,
                    account_key: null,
                    PartitionKey: null
                };

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            };

            var Rackspace = function (data) {

                var _new = {
                    private_paths: [],
                    url: null,
                    api_key: null,
                    username: null,
                    tenant_name: null,
                    region: null
                };

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }

            };

            var Openstack = function (data) {

                var _new = {
                    private_paths: [],
                    url: null,
                    password: null,
                    username: null,
                    tenant_name: null,
                    region: null
                };

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            };

            var MongoDB = function (data) {

                var _new = {
                    dsn: null,
                    user: null,
                    pwd: null,
                    db: null,
                    options: {},
                    options_ctrl: null

                };

                if (data) {
                    if (data.options.hasOwnProperty('ssl'))
                        data.options_ctrl = true;
                    else
                        data.options_ctrl = false;

                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            };

            var CouchDB = function (data) {

                var _new = {
                    dsn: null,
                    user: null,
                    pwd: null
                };

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            };

            var Salesforce = function (data) {

                var _new = {
                    username: null,
                    password: null,
                    security_token: null,
                    version: null
                };

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            };

            var Email = function (data) {

                var _new = {
                    transport_type: 'default',
                    host: null,
                    port: null,
                    security: 'SSL',
                    command: null
                };

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            };

            var SQLServer = function (data) {

                /*prefix: null,
                 host: null,
                 dbname: null,*/

                var _new = {

                    dsn: null,
                    user: null,
                    pwd: null
                };

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            };

            var LocalFileStorage = function (data) {

                var _new = {
                    private_paths: []
                };

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            };

            var LocalSQLDB = function (data) {

                return [];
            };

            var RemoteWebService = function (data) {
                var _new = {
                    cache_config: {
                        enabled: false,
                        ttl: null
                    },
                    client_exclusions: {
                        parameters: []
                    }
                };

                if (data) {
                    return dfObjectService.mergeObjects(data, _new);
                }
                else {
                    return _new;
                }
            };


            switch (storageType) {

                case 'aws':
                    return new AWS(data);
                case 'azure':
                    return new Azure(data);
                case 'rackspace':
                    return new Rackspace(data);
                case 'openstack':
                    return new Openstack(data);
                case 'mongodb':
                    return new MongoDB(data);
                case 'couchdb':
                    return new CouchDB(data);
                case 'salesforce':
                    return new Salesforce(data);
                case 'email':
                    return new Email(data);
                case 'sql':
                    return new SQLServer(data);
                case 'local file storage':
                    return new LocalFileStorage(data);
                case 'local sql db':
                    return new LocalSQLDB(data);
                case 'remote web service':
                    return new RemoteWebService(data);
            }
        }
    }])
    .factory('dfServiceValues', ['SystemConfigDataService', function (SystemConfigDataService) {


        return function () {

            // Set prefixes for db drivers
            var sql_placeholder = "mysql:Server=my_server;Database=my_database";
            var microsoft_sql_server_prefix = "sqlsrv";

            //if(SystemConfigDataService.getSystemConfig().server_os.indexOf("win") !== -1 && SystemConfigDataService.getSystemConfig().server_os.indexOf("darwin") === -1){
            //
            //    sql_placeholder="mysql:Server=my_server;Database=my_database";
            //    microsoft_sql_server_prefix = "sqlsrv"
            //}else{

            microsoft_sql_server_prefix = "dblib"
            //}

            var values = {

                emailOptions: [
                    {name: "Server Default", value: 'default'},
                    {name: "Server Command", value: "command"},
                    {name: "SMTP", value: "smtp"}
                ],

                securityOptions: [
                    {name: "SSL", value: "SSL"},
                    {name: "TLS", value: "TLS"}
                ],
                sqlVendors: [
                    {name: "MySQL", prefix: "mysql"},
                    {name: "Microsoft SQL Server", prefix: microsoft_sql_server_prefix},
                    {name: "PostgreSQL", prefix: "pgsql"},
                    {name: "Oracle", prefix: "oci"},
                    {name: "IBM DB2", prefix: "ibm"}

                ],
                NoSQLOptions: [
                    {name: "Amazon DynamoDB", value: "aws dynamodb"},
                    {name: "Amazon SimpleDB", value: "aws simpledb"},
                    {name: "Windows Azure Tables", value: "azure tables"},
                    {name: "CouchDB", value: "couchdb"},
                    {name: "MongoDB", value: "mongodb"}

                ],
                awsRegions: [
                    {name: "US EAST (N Virgina)", value: "us-east-1"},
                    {name: "US WEST (N California)", value: "us-west-1"},
                    {name: "US WEST (Oregon)", value: "us-west-2"},
                    {name: "EU WEST (Ireland)", value: "eu-west-1"},
                    {name: "Asia Pacific (Singapore)", value: "ap-southeast-1"},
                    {name: "Asia Pacific (Sydney)", value: "ap-southeast-2"},
                    {name: "Asia Pacific (Tokyo)", value: "ap-northeast-1"},
                    {name: "South America (Sao Paulo)", value: "sa-east-1"}
                ],
                rackspaceRegions: [
                    {name: "London", value: "LON", url: "https://lon.identity.api.rackspacecloud.com"},
                    {name: "Chicago", value: "ORD", url: "https://identity.api.rackspacecloud.com"},
                    {name: "Dallas / Fort Worth", value: "DFW", url: "https://identity.api.rackspacecloud.com"}
                ],
                remoteOptions: [
                    {name: "Amazon S3", value: "aws s3"},
                    {name: "Windows Azure Storage", value: "azure blob"},
                    {name: "RackSpace CloudFiles", value: "rackspace cloudfiles"},
                    {name: "OpenStack Object Storage", value: "openstack object storage"}
                ],
                pushOptions: [
                    {name: "Amazon SNS", value: "aws sns"}
                ]
            };

            return values;
        }


    }]);


angular.module('dfServiceTemplates', [])
    .run(['$templateCache', function ($templateCache) {

        $templateCache.put('_service-is-active.html',
            '<div class="form-group">' +
            '<div class="checkbox">' +
            '<label>' +
            '<input data-ng-model="serviceInfo.record.is_active" type="checkbox" /> Active' +
            '</label>' +
            '</div>' +
            '</div>'
        );

        $templateCache.put('_service-type.html',
            '<div class="form-group">' +
            '<label>Service Type</label><df-simple-help data-options="dfSimpleHelp.serviceType"></df-simple-help>' +
            '<select class="form-control" data-ng-disabled="!newService" data-ng-change="_renderServiceFields(serviceInfo.record.type)" data-ng-model="serviceInfo.record.type" data-ng-options="option.value as option.label for option in hcv.serviceTypes"></select>' +
            '</div>'
        );

        $templateCache.put('_service-api-name.html',
            '<div class="form-group">' +
            '<label>API Name</label><df-simple-help data-options="dfSimpleHelp.apiName"></df-simple-help>' +
            '<input class="form-control" data-ng-disabled="!newService" data-ng-disabled="serviceInfo.record.deletable" data-ng-model="serviceInfo.record.api_name" type="text" required/>' +
            '</div>'
        );

        $templateCache.put('_service-name.html',
            '<div class="form-group">' +
            '<label>Name</label><df-simple-help data-options="dfSimpleHelp.name"></df-simple-help>' +
            '<input class="form-control" data-ng-model="serviceInfo.record.name" type="text" required/>' +
            '</div>'
        );

        $templateCache.put('_service-description.html',
            '<div class="form-group">' +
            '<label>Description</label><df-simple-help data-options="dfSimpleHelp.description"></df-simple-help>' +
            '<input class="form-control" data-ng-model="serviceInfo.record.description" type="text"/>' +
            '</div>'
        );

        $templateCache.put('_service-base-url.html',
            '<div class="form-group">' +
            '<label>Base URL</label>' +
            '<df-simple-help data-ng-if="!_storageType.transport_type" data-options="dfSimpleHelp.baseUrl"></df-simple-help>' +
            '<input class="form-control" data-ng-model="serviceInfo.record.base_url" type="text"/>' +
            '</div>'
        );

        $templateCache.put('_service-user-name.html',
            '<div class="form-group">' +
            '<label>Username</label><df-simple-help data-options="dfSimpleHelp.userName"></df-simple-help>' +
            '<input class="form-control" id="serviceInfo-record-user" name="serviceInfo-record-user" data-ng-model="serviceInfo.record.config.user" type="text"/>' +
            '</div>'
        );

        $templateCache.put('_service-password.html',
            '<div class="form-group">' +
            '<label>Password</label><df-simple-help data-options="dfSimpleHelp.password"></df-simple-help>' +
            '<input class="form-control" id="serviceInfo-record-password" name="serviceInfo-record-password" data-ng-model="serviceInfo.record.config.password" type="password"/>' +
            '</div>'
        );


        // Remote Web Service
        $templateCache.put('_service-remote-web-service-cache.html',
            '<div class="row"><div class="col-xs-12"><hr /></div></div>' +
            '<h3>Caching</h3>' +
            '<div class="form-group">' +
            '<div class="input-group">' +
            '<span class="input-group-addon">' +
            '<input data-ng-model="_storageType.cache_config.enabled" type="checkbox"/>' +
            '</span>' +
            '<input class="form-control" data-ng-model="_storageType.cache_config.ttl" type="text" placeholder="Enter cache time to live (seconds)" data-ng-disabled="!_storageType.cache_config.enabled"/>' +
            '</div>' +
            '</div>'
        );


        // Email Templates

        $templateCache.put('_service-email-transport-type.html',
            '<div class="form-group">' +
            '<label>Provider</label><df-simple-help data-options="dfSimpleHelp.emailTransportType"></df-simple-help>' +
            '<select class="form-control" data-ng-model="_storageType.transport_type" data-ng-options="option.value as option.name for option in hcv.emailOptions"></select>' +
            '</div>'
        );

        $templateCache.put('_service-email-host.html',
            '<div class="form-group">' +
            '<label>Host</label><df-simple-help data-options="dfSimpleHelp.emailHost"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.host" type="text" placeholder="e.g. SMTP.gmail.com"/>' +
            '</div>'
        );

        $templateCache.put('_service-email-port.html',
            '<div class="form-group">' +
            '<label>Port</label><df-simple-help data-options="dfSimpleHelp.emailPort"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.port" type="text" placeholder="e.g. 465"/>' +
            '</div>'
        );

        $templateCache.put('_service-email-security.html',
            '<div class="form-group">' +
            '<label>Security</label><df-simple-help data-options="dfSimpleHelp.emailSecurity"></df-simple-help>' +
            '<select class="form-control" data-ng-options="option.value as option.name for option in hcv.securityOptions" data-ng-model="_storageType.security">' +
            '</select>' +
            '</div>'
        );

        $templateCache.put('_service-email-command.html',
            '<div class="form-group">' +
            '<label>Command</label><df-simple-help data-options="dfSimpleHelp.emailCommand"></df-simple-help>' +
            '<input class="form-control" data-ng-value="" type="text" data-ng-model="_storageType.command" placeholder="e.g. /usr/sbin/sendmail -bs"/>' +
            '</div>'
        );


        // SQL Templates

        $templateCache.put('_service-sql-user-name.html',
            '<div class="form-group">' +
            '<label>Username</label><df-simple-help data-options="dfSimpleHelp.userName"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.user" type="text"/>' +
            '</div>'
        );

        $templateCache.put('_service-sql-password.html',
            '<div class="form-group">' +
            '<label>Password</label><df-simple-help data-options="dfSimpleHelp.password"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.pwd" type="password"/>' +
            '</div>'
        );

        $templateCache.put('_service-sql-vendor.html',
            '<div data-ng-hide="!newService" class="form-group">' +
            '<label>SQL Vendor</label><df-simple-help data-options="dfSimpleHelp.sqlVendor"></df-simple-help>' +
            '<select class="form-control" data-ng-model="_storageType.prefix" data-ng-change="_updateDsn()"  data-ng-options="server.prefix as server.name for server in hcv.sqlVendors">' +
            '<option value="">-- Select Vendor --</option>' +
            '</select>' +
            '</div>'
        );

        $templateCache.put('_service-sql-host.html',
            '<div data-ng-hide="!newService" class="form-group">' +
            '<label>Host</label><df-simple-help data-options="dfSimpleHelp.sqlHost"></df-simple-help>' +
            '<input data-ng-disabled="!_storageType.prefix" class="form-control" data-ng-keyup="_updateDsn()" data-ng-model="_storageType.host"/>' +
            '</div>'
        );

        $templateCache.put('_service-sql-database-name.html',
            '<div data-ng-hide="!newService" class="form-group">' +
            '<label>Database Name</label><df-simple-help data-options="dfSimpleHelp.sqlDatabaseName"></df-simple-help>' +
            '<input data-ng-disabled="!_storageType.host" class="form-control" data-ng-keyup="_updateDsn()" data-ng-model="_storageType.dbname"/>' +
            '</div>'
        );

        // Use this to update fields from dsn
        // needs more work
        // data-ng-keyup="_dsnToFields()"
        $templateCache.put('_service-sql-dsn.html',
            '<div class="form-group">' +
            '<label>Connection String</label><df-simple-help data-options="dfSimpleHelp.connectionString"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.dsn" type="text" placeholder="{{sql_placeholder}}"/>' +
            '</div>'
        );


        // SalesForce

        $templateCache.put('_service-sf-user-name.html',
            '<div class="form-group">' +
            '<label>Username</label><df-simple-help data-options="dfSimpleHelp.userName"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.username" type="text"/>' +
            '</div>'
        );

        $templateCache.put('_service-sf-password.html',
            '<div class="form-group">' +
            '<label>Password</label><df-simple-help data-options="dfSimpleHelp.password"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.password" type="password"/>' +
            '</div>'
        );

        $templateCache.put('_service-sf-security-token.html',
            '<div class="form-group">' +
            '<label>Security Token</label><df-simple-help data-options="dfSimpleHelp.sfSecurityToken"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.security_token" type="text"/>' +
            '</div>'
        );

        $templateCache.put('_service-sf-api-version.html',
            '<div class="form-group">' +
            '<label>API Version</label><df-simple-help data-options="dfSimpleHelp.sfApiVersion"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.version" placeholder="v28.0" type="text"/>' +
            '</div>'
        );


        // NoSQL DB

        $templateCache.put('_service-nosql-type.html',
            '<div class="form-group">' +
            '<label>NoSQL Vendor</label><df-simple-help data-options="dfSimpleHelp.noSqlType"></df-simple-help>' +
            '<select class="form-control" data-ng-change="_renderAdditionalFields(serviceInfo.record.storage_type)" data-ng-options="option.value as option.name for option in hcv.NoSQLOptions" data-ng-model="serviceInfo.record.storage_type" data-ng-required="true">' +
            '<option value="">-- Select Vendor --</option>' +
            '</select>' +
            '</div>'
        );


        // AWS

        $templateCache.put('_service-aws-access-key.html',
            '<div class="form-group">' +
            '<label>Access Key</label><df-simple-help data-options="dfSimpleHelp.awsAccessKey"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.access_key"/>' +
            '</div>'
        );


        $templateCache.put('_service-aws-secret-key.html',
            '<div class="form-group">' +
            '<label>Secret Key</label><df-simple-help data-options="dfSimpleHelp.awsSecretKey"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.secret_key"/>' +
            '</div>'
        );

        $templateCache.put('_service-aws-region.html',
            '<div class="form-group">' +
            '<label>Region</label><df-simple-help data-options="dfSimpleHelp.awsRegion"></df-simple-help>' +
            '<select class="form-control" data-ng-options="region.value as region.name for region in hcv.awsRegions" data-ng-model="_storageType.region"></select>' +
            '</div>'
        );


        // Azure

        $templateCache.put('_service-azure-acct-name.html',
            '<div class="form-group">' +
            '<label>Account Name</label><df-simple-help data-options="dfSimpleHelp.azureAcctName"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.account_name"/>' +
            '</div>'
        );

        $templateCache.put('_service-azure-acct-key.html',
            '<div class="form-group">' +
            '<label>Account Key</label><df-simple-help data-options="dfSimpleHelp.azureAcctKey"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.account_key"/>' +
            '</div>'
        );

        // Need to do something about the partition key here.
        // Camelcase here but nowhere else for one prop?
        $templateCache.put('_service-azure-partition-key.html',
            '<div class="form-group">' +
            '<label>Default Partition Key</label><df-simple-help data-options="dfSimpleHelp.azureDefaultPartitionKey"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.PartitionKey"/>' +
            '</div>'
        );


        // Couch DB

        $templateCache.put('_service-couch-dsn.html',
            '<div class="form-group">' +
            '<label>Connection String</label><df-simple-help data-options="dfSimpleHelp.connectionString"></df-simple-help>' +
            '<input data-ng-model="_storageType.dsn" type="text" class="form-control"/>' +
            '</div>'
        );

        $templateCache.put('_service-couch-user-name.html',
            '<div class="form-group">' +
            '<label>Username</label><df-simple-help data-options="dfSimpleHelp.userName"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.user" type="text"/>' +
            '</div>'
        );

        $templateCache.put('_service-couch-password.html',
            '<div class="form-group">' +
            '<label>Password</label><df-simple-help data-options="dfSimpleHelp.password"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.pwd" type="password"/>' +
            '</div>'
        );


        // Mongo DB

        $templateCache.put('_service-mongo-dsn.html',
            '<div class="form-group">' +
            '<label>Connection String</label><df-simple-help data-options="dfSimpleHelp.connectionString"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.dsn" type="text"/>' +
            '</div>'
        );

        $templateCache.put('_service-mongo-database.html',
            '<div class="form-group">' +
            '<label>Database Name</label><df-simple-help data-options="dfSimpleHelp.databaseName"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.db" type="text"/>' +
            '</div>'
        );

        $templateCache.put('_service-mongo-user-name.html',
            '<div class="form-group">' +
            '<label>Username</label><df-simple-help data-options="dfSimpleHelp.userName"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.user" type="text"/>' +
            '</div>'
        );

        $templateCache.put('_service-mongo-password.html',
            '<div class="form-group">' +
            '<label>Password</label><df-simple-help data-options="dfSimpleHelp.password"></df-simple-help>' +
            '<input class="form-control" data-ng-model="_storageType.pwd" type="password"/>' +
            '</div>'
        );


        $templateCache.put('_service-mongo-options-ssl.html',

            '<div class="form-group">' +
            '<div class="checkbox">' +
            '<label>' +
            '<input data-ng-model="_storageType.options_ctrl" type="checkbox"/>' +
            'Connect with SSL (PHP driver and MongoDB server must support SSL)' +
            '</label>' +
            '</div>' +
            '</div>'
        );


        // Storage Services

        $templateCache.put('_service-storage-type.html',
            '<div class="form-group">' +
            '<label>Storage Type</label><df-simple-help data-options="dfSimpleHelp.storageType"></df-simple-help>' +
            '<select class="form-control" data-ng-change="_renderAdditionalFields(serviceInfo.record.storage_type)" data-ng-options="option.value as option.name for option in hcv.remoteOptions" data-ng-model="serviceInfo.record.storage_type" type="text">' +
            '<option value="">-- Select Storage Type --</option>' +
            '</select>' +

            '</div>'
        );


        // Rackspace
        $templateCache.put('_service-rs-user-name.html',
            '<div class="form-group">' +
            '<label>Username</label><df-simple-help data-options="dfSimpleHelp.userName"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.username"/>' +
            '</div>'
        );

        $templateCache.put('_service-rs-api-key.html',
            '<div class="form-group">' +
            '<label>API Key</label><df-simple-help data-options="dfSimpleHelp.rsApiKey"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.api_key"/>' +
            '</div>'
        );

        $templateCache.put('_service-rs-tenet-name.html',
            '<div class="form-group">' +
            '<label>Tenant Name</label><df-simple-help data-options="dfSimpleHelp.rsTenantName"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.tenant_name"/>' +
            '</div>'
        );

        $templateCache.put('_service-rs-region.html',
            '<div class="form-group">' +
            '<label>Region</label><df-simple-help data-options="dfSimpleHelp.rsTenantRegion"></df-simple-help>' +
            '<select class="form-control" data-ng-change="_renderRegionUrl(_storageType.region, hcv.rackspaceRegions)" data-ng-options="option.value as option.name for option in hcv.rackspaceRegions" data-ng-model="_storageType.region"></select>' +
            '</div>'
        );

        $templateCache.put('_service-rs-endpoint.html',
            '<div class="form-group">' +
            '<label>URL/Endpoint</label><df-simple-help data-options="dfSimpleHelp.rsEndpoint"></df-simple-help>' +
            '<input class="form-control" data-ng-disabled="!_storageType.region" type="text" data-ng-model="_storageType.url"/>' +
            '</div>'
        );


        // Openstack

        $templateCache.put('_service-os-user-name.html',
            '<div class="form-group">' +
            '<label>Username</label><df-simple-help data-options="dfSimpleHelp.userName"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.username"/>' +
            '</div>'
        );

        $templateCache.put('_service-os-password.html',
            '<div class="form-group">' +
            '<label>Password</label><df-simple-help data-options="dfSimpleHelp.osApiKey"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.password"/>' +
            '</div>'
        );

        $templateCache.put('_service-os-tenet-name.html',
            '<div class="form-group">' +
            '<label>Tenant Name</label><df-simple-help data-options="dfSimpleHelp.osTenantName"></df-simple-help>' +
            '<input class="form-control" type="text" data-ng-model="_storageType.tenant_name"/>' +
            '</div>'
        );

        $templateCache.put('_service-os-region.html',
            '<div class="form-group">' +
            '<label>Region</label><df-simple-help data-options="dfSimpleHelp.osRegion"></df-simple-help>' +
            '<input class="form-control" type="text" ng-model="_storageType.region"/>' +
            '</div>'
        );

        $templateCache.put('_service-os-endpoint.html',
            '<div class="form-group">' +
            '<label>URL/Endpoint</label><df-simple-help data-options="dfSimpleHelp.osEndpoint"></df-simple-help>' +
            '<input class="form-control" data-ng-disabled="!_storageType.region" type="text" data-ng-model="_storageType.url"/>' +
            '</div>'
        );


        // Push Service
        $templateCache.put('_service-push-type.html',
            '<div class="form-group">' +
            '<label>Push Notification Service Vendor</label><df-simple-help data-options="dfSimpleHelp.pushServiceVendor"></df-simple-help>' +
            '<select class="form-control" data-ng-change="_renderAdditionalFields(serviceInfo.record.storage_type)" data-ng-options="option.value as option.name for option in hcv.pushOptions" data-ng-model="serviceInfo.record.storage_type" type="text">' +
            '<option value="">-- Select Storage Type --</option>' +
            '</select>' +

            '</div>'
        );

    }]);
