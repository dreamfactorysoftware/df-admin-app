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
                text: 'To create a DreamFactory package export file, follow these instructions. <br/>' +
                    '<ul>' +
                    '<li>Select the data type from the list.</li>' +
                    '<li>Choose what you\'d like to export from the selected type.</li>' +
                    '<li>Press Add to Package.</li>' +
                    '<li>Repeat the steps above until all you want to include in the package have been added. The selected package content is shown in the table.</li>' +
                    '<li>Select where to export the package to, and a folder name.</li>' +
                    '<li>Press Export to export the package to the selected location.</li>' +
                    '</ul>'
            }
        }

    }])
    .directive('dfViewContent', ['MOD_PACKAGE_MANAGER_ASSET_PATH', 'dfApplicationData', function (MOD_PACKAGE_MANAGER_ASSET_PATH, dfApplicationData) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_PACKAGE_MANAGER_ASSET_PATH + 'views/df-view-content.html',
            link: function (scope, elem, attrs) {

            }
        }
    }])
    .directive('dfSelectContent', ['MOD_PACKAGE_MANAGER_ASSET_PATH', 'dfApplicationData', function (MOD_PACKAGE_MANAGER_ASSET_PATH, dfApplicationData) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_PACKAGE_MANAGER_ASSET_PATH + 'views/df-select-content.html',
            link: function (scope, elem, attrs) {

                scope.selectAll = false;
                scope.selectType = '';
                scope.selectName = '';
                scope.selectedNameLabel = '';
                scope.selectedNameType = '';
                scope.selectedNameData = [];
                scope.tableData = [];
                scope.rawPackageData = {};
                scope.types = [];

                var TableData = function(tableData) {

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: tableData
                    }
                };

                scope.init = function() {
                    scope.rawPackageData = angular.copy(dfApplicationData.getApiData('package'));

                    angular.forEach(scope.rawPackageData, function (manifestValue, manifestKey) {  
                        if (typeof manifestValue === 'object') {
                            if (manifestKey === 'service') {
                                angular.forEach(manifestValue, function (subManifestValue, subManifestKey) { 
                                    var _type = subManifestKey.charAt(0).toUpperCase() + subManifestKey.substring(1);
                                    scope.types.push(_type);
                                });
                            }
                            else {
                                var _serviceTypes = angular.copy(dfApplicationData.getApiData('service_type'));
                                var _services = angular.copy(dfApplicationData.getApiData('service')); 

                                var _service = _services.filter(function( obj ) {
                                                    return obj.name == manifestKey;
                                                });

                                angular.forEach(_service, function (value, key) { 
                                    var type = _serviceTypes.filter(function( obj ) {
                                                    return obj.name == value.type;
                                                });
                                    if (scope.types.indexOf(type[0].label) == -1) {
                                        scope.types.push(type[0].label);
                                    }
                                });
                            }
                        }
                    });
                }

                scope.init();

                scope.addToPackage = function() {
                    var searchSelected = scope.selectedNameData.map(function(d) { return d['__dfUI']['selected']; });                    

                    if ((searchSelected.indexOf(true) > -1) && 
                        (scope.selectedType !== undefined) && 
                        (scope.selectedName !== undefined)) {

                        var _type = scope.selectedType.charAt(0).toUpperCase() + scope.selectedType.substring(1);
                        var _name = scope.selectedName.charAt(0).toUpperCase() + scope.selectedName.substring(1);

                        var descr = [];

                        angular.forEach(scope.selectedNameData, function (value, key) {
                            if (scope.selectedNameData[key]['__dfUI']['selected'] == true) {
                                descr.push(scope.selectedNameData[key]['record']['display_label']);
                            }
                        });

                        scope.tableData.push({
                            type: scope.selectedType,
                            name: scope.selectedName,
                            data: scope.selectedNameData,
                            descr: descr.join(',')
                        })

                        scope.names = [];
                        scope.selectedType = '';
                        scope.selectedName = '';
                        scope.selectedNameLabel = '';
                        scope.selectedNameData = [];
                        scope.selectAll = false;

                    }
                    else {
                        alert('Nothing is selected');
                    }
                }

                scope.removeRow = function(row) {
                    scope.tableData.splice(row, 1)
                }

                var watchSelectedType = scope.$watch('selectedType', function (newValue, oldValue) {

                    if (!newValue) return;

                    var _names = [];

                    if (newValue === 'System') {
                        angular.forEach(scope.rawPackageData['service']['system'], function (manifestValue, manifestKey) {
                            _names.push(manifestKey);
                        });
                    }
                    else {
                        var _serviceTypes = angular.copy(dfApplicationData.getApiData('service_type'));
                        var _services = angular.copy(dfApplicationData.getApiData('service')); 

                        var _service = _serviceTypes.filter(function( obj ) {
                                            return obj.label == newValue;
                                        });

                        var cvb = _services.filter(function( obj ) {
                                            return obj.type == _service[0].name;
                                        });

                        angular.forEach(cvb, function (value, key) { 
                            _names.push(value.name);
                        });
                    }
                    
                    scope.names = _names;
                });

                var watchSelectedName = scope.$watch('selectedName', function (newValue, oldValue) {

                    if (!newValue) return;

                    scope.selectedNameLabel = 'Select Item(s) to Export';

                    var apiName = '';

                    if (scope.selectedType === 'System') {
                        switch (newValue) {
                            case 'user':
                                apiName = 'email';
                                break;
                            case 'admin':
                                apiName = 'email';
                                break;
                            case 'cors':
                                apiName = 'origin';
                                break;
                            default:
                                apiName = 'name';
                        }

                        scope.selectedNameData = '';

                        var dataArray = angular.copy(dfApplicationData.getApiData(newValue));

                        var nameData = [];

                        angular.forEach(dataArray, function (value, key) {
                            dataArray[key]['display_label'] = dataArray[key][apiName];
                            nameData.push(new TableData(dataArray[key]))
                        });

                        scope.selectedNameData = nameData;
                        scope.selectedNameType = '';
                    }
                    else {
                        var _serviceTypes = angular.copy(dfApplicationData.getApiData('service_type'));

                        var _service = _serviceTypes.filter(function( obj ) {
                                            return obj.label == scope.selectedType;
                                        });

                        var _type = _service[0].group;

                        dfApplicationData.getServiceComponents(newValue).then(function (results) {

                            if (_type == 'Database') {
                                var _tableNames = [];
                                var prefix = '_schema/';
                                angular.forEach(results, function (table) {
                                    if (table.indexOf(prefix) === 0) {
                                        var name = table.slice(prefix.length);
                                        if (name != '' &&
                                            name.indexOf('*', name.length - 1) === -1) {
                                            name = name.slice(0, -1);
                                            _tableNames.push(new TableData({name: name, display_label: name}));
                                        }
                                    }
                                });

                                scope.selectedNameData = _tableNames;
                            }

                            if (_type == 'File') {
                                var _tableNames = [];

                                angular.forEach(results, function (value, key) {
                                if (value.indexOf('/') > 0) {
                                    var segments = value.split('/');
                                    var _exists = _tableNames.filter(function( obj ) {
                                                        return obj.record.folder == segments[0];
                                                    });

                                    if(_exists.length == 0) {
                                        _tableNames.push(new TableData({folder: segments[0], display_label: segments[0]}));
                                    }
                                }
                            });
                            scope.selectedNameData = _tableNames;

                            }
                        });
                    }                
                });
                
                scope.$on('$destroy', function (e) {
                    watchSelectedType();
                    watchSelectedName();
                });

                scope.$watch('selectAll', function(newValue, oldValue) {
                    if(!scope.selectedNameData) return;
                    scope.selectedNameData.forEach(function(service) {
                        service.__dfUI.selected = newValue;
                    });
                });
            }
        }
    }])
    .directive('dfSelectFolder', ['MOD_PACKAGE_MANAGER_ASSET_PATH', 'dfApplicationData', function (MOD_PACKAGE_MANAGER_ASSET_PATH, dfApplicationData) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_PACKAGE_MANAGER_ASSET_PATH + 'views/df-select-folder.html',
            link: function (scope, elem, attrs) {

            }
        }
    }])
    .directive('dfExportPackage', ['INSTANCE_URL', 'ADMIN_API_KEY', 'UserDataService', 'dfApplicationData', 'dfSystemData', '$http', '$window', function (INSTANCE_URL, ADMIN_API_KEY, UserDataService, dfApplicationData, dfSystemData, $http, $window) {

        return {

            restrict: 'A',
            scope: false,
            replace: true,
            link: function (scope, elem, attrs) {

                scope.selectedFolder = '';
                scope.subFolderName = '';

                var payload = {};

                scope.folderInit = function() {
                    var _serviceTypes = angular.copy(dfApplicationData.getApiData('service_type'));

                    var _service = _serviceTypes.filter(function( obj ) {
                                        return obj.group == 'File';
                                    });

                    var searchTypes = _service.map(function(d) { return d['name']; });                    
                    var _services = angular.copy(dfApplicationData.getApiData('service')); 
                    var _folderNames = [];

                    angular.forEach(_services, function (value, key) {
                        if (searchTypes.indexOf(value.type) > -1) {
                            _folderNames.push(value.name);
                        }
                    });

                    scope.folders = _folderNames
                    console.log(_folderNames)
                    scope.selectedFolder = 'files';
                }

                scope.folderInit();
                    
                // PUBLIC API
                scope.exportPackage = function() {

                    if ((scope.subFolderName !== '') && (scope.tableData.length)) {

                        payload = {
                            storage: {
                                name:"files",
                                folder: scope.subFolderName
                            },
                            service: {
                                system: {

                                }
                            }
                        }

                        var tableData = scope.tableData;

                        angular.forEach(tableData, function (value, key) {
                            var ids = [];

                            if (tableData[key]['type'] === 'System') {
                                ids = tableData[key]['data'].map(function(d) { return d['record']['id']; });
                                
                                //var innerObj = {};
                                //innerObj[tableData[key]['name']] = ids;

                                //var usersObj = {system: innerObj};
                                payload['service']['system'][tableData[key]['name']] = ids;
                            }
                            else {
                                
                            }
                        });

                        scope._exportPackage();
                    }
                    else {
                        alert('Make sure package content is selected, and a package folder is entered');
                    }
                };

                // COMPLEX IMPLEMENTATION
                scope._exportPackage = function () {

                    $http({
                        method: 'POST',
                        url: INSTANCE_URL + '/api/v2/system/package',
                        data: payload
                        /*
                        headers: {
                            'X-DreamFactory-API-Key': ADMIN_API_KEY
                            'X-DreamFactory-Session-Token': undefined
                        }
                        */
                    }).then(function successCallback(response) {
                        scope.tableData = [];
                        alert('The package has been exported')
                    }, function errorCallback(response) {
                        alert('An error occurred. Please check selections and export folder')
                    });
                }

            }
        }
    }])


