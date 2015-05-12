angular.module('dfPackageManager', ['ngRoute', 'dfUtility'])
    .constant('MOD_PACKAGE_MANAGER_ROUTER_PATH', '/package-manager')
    .constant('MOD_PACKAGE_MANAGER_ASSET_PATH', 'admin_components/adf-package-manager/')
    .config(['$routeProvider', 'MOD_PACKAGE_MANAGER_ROUTER_PATH', 'MOD_PACKAGE_MANAGER_ASSET_PATH',
        function ($routeProvider, MOD_PACKAGE_MANAGER_ROUTER_PATH, MOD_PACKAGE_MANAGER_ASSET_PATH) {
            $routeProvider
                .when(MOD_PACKAGE_MANAGER_ROUTER_PATH, {
                    templateUrl: MOD_PACKAGE_MANAGER_ASSET_PATH + 'views/main.html',
                    controller: 'PackageCtrl',
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
    .run(['DSP_URL', '$templateCache', function (DSP_URL, $templateCache) {


    }])
    .controller('PackageCtrl', ['$scope', 'DSP_URL', 'dfApplicationData', function($scope, DSP_URL, dfApplicationData) {



        $scope.$parent.title = 'Packages';

        // Set module links
        $scope.links = [

            {
                name: 'manage-packages',
                label: 'Manage',
                path: 'manage-packages'
            }
        ];


        $scope.dfLargeHelp = {

            packageManager: {
                title: 'Packages Overview',
                text: 'To create a DreamFactory package file for your app, follow these instructions. <br/>' +
                    '<ul>' +
                    '<li>Select the app from the list.</li>' +
                    '<li>Choose the database schema you\'d like to export.</li>' +
                    '<li>Choose which services you\'d like to export.</li>' +
                    '<li>Press Export to be prompted to save your new .dfpkg file.</li>' +
                    '</ul>'
            }
        }

    }])
    .directive('dfSelectApp', ['MOD_PACKAGE_MANAGER_ASSET_PATH', 'DSP_URL', '$http', 'dfApplicationData', 'dfNotify', function (MOD_PACKAGE_MANAGER_ASSET_PATH, DSP_URL, $http, dfApplicationData, dfNotify) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_PACKAGE_MANAGER_ASSET_PATH + 'views/df-select-app.html',
            link: function (scope, elem, attrs) {


                scope.apps = angular.copy(dfApplicationData.getApiData('app'));

                scope.selectedApp = '';
                scope.includeAppFiles = false;

                var watchSelectedApp = scope.$watch('selectedApp', function (newValue, oldValue) {

                    if (!newValue) return;

                    if (!oldValue && newValue || (oldValue.hasOwnProperty('id') && (oldValue.id !== newValue.id))) {

                        $http({
                            method: 'GET',
                            url: DSP_URL + '/api/v2/system/app/' + newValue.id,
                            params: {
                                fields: '*',
                                related: 'app_service_relations'
                            }
                        }).then(
                            function(result) {

                                var i = 0;

                                while (i < scope.apps.length) {

                                    if (scope.apps[i].id === result.data.id) {

                                        scope.apps[i] = result.data;
                                        scope.selectedApp = scope.apps[i];
                                        return;
                                    }

                                    i++

                                }

                            }, function (reject) {

                                var messageOptions = {
                                    module: 'Api Error',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    message: reject
                                };

                                dfNotify.error(messageOptions);

                            });
                    }
                });



                scope.$on('$destroy', function (e) {
                    watchSelectedApp();

                })
            }
        }
    }])
    .directive('dfSelectSchema', ['MOD_PACKAGE_MANAGER_ASSET_PATH', 'dfApplicationData', function (MOD_PACKAGE_MANAGER_ASSET_PATH, dfApplicationData) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_PACKAGE_MANAGER_ASSET_PATH + 'views/df-select-schema.html',
            link: function (scope, elem, attrs) {

                var DBTable = function(dbTableData) {

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: dbTableData
                    }
                };

                scope.databases = null;
                scope.includeSchema = false;


                scope.prepareSchemaData = function () {

                    var schemas = [];
                    var tempSchema = {};

                    angular.forEach(scope.databases, function (schema) {

                        tempSchema = {
                            component: [],
                            service_id: schema.service_id
                        };

                        angular.forEach(schema.tables, function (comp) {

                            if (comp.__dfUI.selected) {
                                tempSchema.component.push(comp.record);
                            }
                        });

                        if (tempSchema.component.length)
                            schemas.push(tempSchema);

                    });

                    if (!schemas.length) {
                        scope.includeSchema = false;
                        return;
                    }

                    scope.includeSchema = true;
                    return schemas;
                };


                var watchDatabase = scope.$watch('databases', function(newValue, oldValue) {

                    if (newValue == null) {

                        var _dbservices = dfApplicationData.getApiData('service', {type: 'Local SQL DB'});
                        var _dbservicesRemote = dfApplicationData.getApiData('service', {type: 'Remote SQL DB'});

                        _dbservices = _dbservices.concat(_dbservicesRemote);

                        var _databases = [];

                        angular.forEach(_dbservices, function (service) {

                            var _tableNames = [];
                            angular.forEach(service.components, function (table) {

                                if (table.indexOf('_schema') !== 0 && table !== '*' && table !== "" && Array.isArray(service.components)) {
                                    _tableNames.push(new DBTable(table));
                                }
                            });
                            _databases.push({name: service.name, tables: _tableNames, service_id: service.id});
                            scope.databases = _databases;
                        });
                    }
                });

                var watchSelectedAppToSchema = scope.$watch('selectedApp', function (newValue, oldValue) {

                    if (!newValue || !newValue.hasOwnProperty('app_service_relations')) {

                        angular.forEach(scope.databases, function(database) {
                            angular.forEach(database.table, function(table) {
                                table.__dfUI.selected = false;
                            });
                        });

                        return;
                    };


                    angular.forEach(newValue.app_service_relations, function (relation) {

                        if (!relation.hasOwnProperty('component') || !relation.component) return;

                        angular.forEach(relation.component, function(component) {

                            var i = 0;

                            while(i < scope.databases.length) {

                                if (scope.databases[i].record === component) {

                                    scope.databases[i].__dfUI.selected = true;
                                    scope.includeSchema = true;
                                    return;
                                }

                                i++
                            }

                        })

                    })
                });

                scope.$on('$destroy', function () {

                    watchDatabase();
                    watchSelectedAppToSchema();

                });
            }
        }
    }])
    .directive('dfSelectServices', ['MOD_PACKAGE_MANAGER_ASSET_PATH', 'dfApplicationData', function (MOD_PACKAGE_MANAGER_ASSET_PATH, dfApplicationData) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_PACKAGE_MANAGER_ASSET_PATH + 'views/df-select-services.html',
            link: function (scope, elem, attrs) {

                var Service = function(serviceData) {

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: serviceData
                    }
                };

                scope.services = null;
                scope.includeServices = false;

                scope.prepareServicesData = function () {

                    var tempServicesArr = [];

                    angular.forEach(scope.services, function (service) {

                        if (service.__dfUI.selected) {

                            var _new = {
                                service_id: service.record.id,
                                api_name: service.record.api_name
                            }

                            tempServicesArr.push(_new);
                        }
                    });

                    if (!tempServicesArr.length) {
                        scope.includeServices = false;
                        return;
                    }

                    scope.includeServices = true;
                    return tempServicesArr;
                };

                var watchServices = scope.$watch('services', function(newValue, oldValue) {

                    if (newValue == null) {

                        var _services = [];

                        angular.forEach(dfApplicationData.getApiData('service'), function (serviceData) {


                            switch(serviceData.name) {

                                case 'All':
                                case 'Database':
                                case 'Schema':
                                case 'Local Portal Service':
                                case 'Local File Storage':
                                    break;

                                default:

                                    _services.push(new Service(serviceData));

                            }

                        });

                        scope.services = _services;
                    }
                });

                var watchSelectedAppToService = scope.$watch('selectedApp', function (newValue, oldValue) {

                    if (!newValue || !newValue.hasOwnProperty('app_service_relations')) {

                        angular.forEach(scope.services, function(service) {

                            service.__dfUI.selected = false;
                        });

                        return;
                    };


                    angular.forEach(newValue.app_service_relations, function (relation) {

                        var i = 0;

                        while(i < scope.services.length) {

                            if (scope.services[i].record.id === relation.service_id) {

                                scope.services[i].__dfUI.selected = true;
                                scope.includeServices = true;
                                return;
                            }

                            i++

                        }

                    })
                });

                scope.$on('$destroy', function () {

                    watchServices();
                    watchSelectedAppToService();

                });

            }
        }
    }])
    .directive('dfExportPackage', ['DSP_URL', '$window', '$http', 'dfNotify', function (DSP_URL, $window, $http, dfNotify) {

        return {

            restrict: 'A',
            scope: false,
            replace: true,
            link: function (scope, elem, attrs) {


                // PUBLIC API
                scope.exportPackage = function() {

                    scope._exportPackage();
                };


                // PRIVATE API
                scope._updateAppsToService = function (requestDataObj) {

                    return $http({
                        method: "PUT",
                        url: DSP_URL + '/api/v2/system/app/' + scope.selectedApp.id,
                        params: requestDataObj.params,
                        data: requestDataObj.data
                    })
                };


                // COMPLEX IMPLEMENTATION
                scope._exportPackage = function () {

                    var _schema = scope.prepareSchemaData(),
                        _services = scope.prepareServicesData(),
                        _serviceRelations = [];

                    if (scope.includeSchema) {

                        _serviceRelations = _serviceRelations.concat(_schema)

                    }

                    if (scope.includeServices) {

                        _serviceRelations = _serviceRelations.concat(_services);
                    }

                    scope.selectedApp['app_service_relations'] = _serviceRelations;

                    var requestDataObj = {

                        params: {
                            fields: '*',
                            related: 'app_service_relations'
                        },
                        data: scope.selectedApp
                    }


                    scope._updateAppsToService(requestDataObj).then(
                        function(result) {

                            var exportUrl = DSP_URL + '/api/v2/system/app/' + scope.selectedApp.id + '?app_name=admin&pkg=true';


                            if (scope.includeAppFiles) {
                                exportUrl += '&include_files=true';
                            }

                            if (scope.includeSchema) {

                                exportUrl += '&include_schema=true';
                            }

                            if (scope.includeServices) {

                                exportUrl += '&include_services=true';
                            }

                            $window.location.href = exportUrl;

                        },
                        function(reject) {

                            var messageOptions = {
                                module: 'Packages',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject.data.error[0].message
                            };

                            dfNotify.error(messageOptions);

                        }
                    );
                }
            }
        }
    }])


