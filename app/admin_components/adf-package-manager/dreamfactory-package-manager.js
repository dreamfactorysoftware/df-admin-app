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
    .run(['INSTANCE_URL', '$templateCache', function (INSTANCE_URL, $templateCache) {


    }])
    .controller('PackageCtrl', ['$scope', 'INSTANCE_URL', 'dfApplicationData', function($scope, INSTANCE_URL, dfApplicationData) {



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
    .directive('dfSelectApp', ['MOD_PACKAGE_MANAGER_ASSET_PATH', 'INSTANCE_URL', '$http', 'dfApplicationData', 'dfNotify', function (MOD_PACKAGE_MANAGER_ASSET_PATH, INSTANCE_URL, $http, dfApplicationData, dfNotify) {


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
                            url: INSTANCE_URL + '/api/v2/system/app/' + newValue.id,
                            params: {
                                fields: '*'
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

                scope.prepareSchemaData = function () {

                    var result = {};

                    angular.forEach(scope.databases, function (schema) {

                        result[schema.name] = [];

                        angular.forEach(schema.tables, function (comp) {

                            if (comp.__dfUI.selected) {
                                result[schema.name].push(comp.record);
                            }
                        });

                        if (result[schema.name].length === 0) {
                            delete result[schema.name];
                        }
                    });

                    return JSON.stringify(result);
                };

                var watchDatabase = scope.$watch('databases', function(newValue, oldValue) {

                    if (newValue == null) {

                        var _dbservices = dfApplicationData.getApiData('service', {type: 'sql_db'});
                        scope.databases = [];

                        angular.forEach(_dbservices, function (service) {

                            dfApplicationData.getServiceComponents(service.name).then(function (results) {
                                var _tableNames = [];
                                var prefix = '_schema/';
                                angular.forEach(results, function (table) {
                                    if (table.indexOf(prefix) === 0) {
                                        var name = table.slice(prefix.length);
                                        if (name != '' &&
                                            name != '*' &&
                                            Array.isArray(service.components)) {

                                            _tableNames.push(new DBTable(name));
                                        }
                                    }
                                });

                                scope.databases.push({name: service.name, tables: _tableNames, service_id: service.id})                            
                            });

                        });
                    }
                });

                var watchSelectedAppToSchema = scope.$watch('selectedApp', function (newValue, oldValue) {

                    if (!newValue) {
                        angular.forEach(scope.databases, function(database) {
                            angular.forEach(database.tables, function(table) {
                                table.__dfUI.selected = false;
                            });
                        });
                    }
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

                scope.prepareServicesData = function () {

                    var result = [];

                    angular.forEach(scope.services, function (service) {

                        if (service.__dfUI.selected) {

                            result.push(service.record.name);
                        }
                    });

                    return result.join(',');
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

                    if (!newValue) {

                        angular.forEach(scope.services, function(service) {

                            service.__dfUI.selected = false;
                        });
                    }
                });

                scope.$on('$destroy', function () {

                    watchServices();
                    watchSelectedAppToService();

                });

            }
        }
    }])
    .directive('dfExportPackage', ['INSTANCE_URL', 'ADMIN_API_KEY', 'UserDataService', '$window', function (INSTANCE_URL, ADMIN_API_KEY, UserDataService, $window) {

        return {

            restrict: 'A',
            scope: false,
            replace: true,
            link: function (scope, elem, attrs) {


                // PUBLIC API
                scope.exportPackage = function() {

                    scope._exportPackage();
                };

                // COMPLEX IMPLEMENTATION
                scope._exportPackage = function () {

                    var exportUrl = INSTANCE_URL + '/api/v2/system/app/' + scope.selectedApp.id + '?pkg=true' +
                        '&api_key=' + ADMIN_API_KEY +
                        '&session_token=' + UserDataService.getCurrentUser().session_token +
                        '&include_files=' + scope.includeAppFiles +
                        '&service=' + scope.prepareServicesData() +
                        '&schema=' + scope.prepareSchemaData();
;
                    $window.location.href = exportUrl;
                }
            }
        }
    }])


