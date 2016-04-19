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
    .directive('tabs', function() {
        return {
            restrict: 'E',
            transclude: true,
            scope: {},
            controller: [ "$scope", function($scope) {
                var panes = $scope.panes = [];
         
                $scope.select = function(pane) {
                    angular.forEach(panes, function(pane) {
                        pane.selected = false;
                    });
                    pane.selected = true;
                }
         
                this.addPane = function(pane) {
                    if (panes.length == 0) $scope.select(pane);
                        panes.push(pane);
                }
            }],
            template:
                '<div class="tabbable">' +
                    '<ul class="nav nav-tabs">' +
                        '<li ng-repeat="pane in panes" ng-class="{active:pane.selected}">'+
                            '<a href="" ng-click="select(pane)">{{pane.title}}</a>' +
                        '</li>' +
                    '</ul>' +
                '<div class="tab-content" ng-transclude></div>' +
            '</div>',
            replace: true
        };
    }).
    directive('pane', function() {
        return {
            require: '^tabs',
            restrict: 'E',
            transclude: true,
            scope: { title: '@' },
            link: function(scope, element, attrs, tabsCtrl) {
                tabsCtrl.addPane(scope);
            },
            template:
                '<div class="tab-pane" ng-class="{active: selected}" ng-transclude>' +
                '</div>',
            replace: true
        };
    })
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
                text: 'Import and export users, apps, files, database schemas and more.'
            },
            packageExport: {
                title: '',
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
    .directive('file', function () {
        return {
            scope: {
                file: '='
            },
            link: function (scope, el, attrs) {
                el.bind('change', function (event) {
                    var file = event.target.files[0];
                    scope.file = file ? file : undefined;
                    scope.$apply();
                });
            }
        };
    })
    .directive('dfImportPackage', ['MOD_PACKAGE_MANAGER_ASSET_PATH', 'INSTANCE_URL', 'UserDataService', 'dfApplicationData', 'dfNotify', '$http', function (MOD_PACKAGE_MANAGER_ASSET_PATH, INSTANCE_URL, UserDataService, dfApplicationData, dfNotify, $http) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_PACKAGE_MANAGER_ASSET_PATH + 'views/df-import-package.html',
            link: function (scope, elem, attrs) {
                scope.importPackageFile = function() {

                    scope.packagePassword = '';

                    if (scope.file !== undefined) {

                    var currentUser = UserDataService.getCurrentUser();

                    $http({
                        method: 'POST',
                        url: INSTANCE_URL + '/api/v2/system/package',
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'X-DreamFactory-Session-Token': currentUser.session_token
                        },
                        data: {
                            files: scope.file,
                            password: scope.packagePassword 
                        }, 
                        transformRequest: function (data, headersGetter) {
                            var formData = new FormData();

                            angular.forEach(data, function (value, key) {
                                formData.append(key, value);
                            });

                            var headers = headersGetter();
                            delete headers['Content-Type'];

                            return formData;
                        }
                    })
                    .success(function (data) {
                        var messageOptions = {
                            module: 'Package Manager',
                            provider: 'dreamfactory',
                            type: 'success',
                            message: 'Package was imported successfully.'
                        }

                        dfNotify.success(messageOptions);
                    })
                    .error(function (data, status) {
                        var messageOptions = {
                            module: 'Package Manager',
                            provider: 'dreamfactory',
                            type: 'error',
                            message: 'An error occurred.'
                        }

                        dfNotify.error(messageOptions);
                    });
                    }
                    else {
                        var messageOptions = {
                            module: 'Package Manager',
                            provider: 'dreamfactory',
                            type: 'error',
                            message: 'No package file selected.'
                        }

                        dfNotify.error(messageOptions);
                    }
                }
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
    .directive('dfSelectContent', ['MOD_PACKAGE_MANAGER_ASSET_PATH', 'dfApplicationData', 'dfNotify', function (MOD_PACKAGE_MANAGER_ASSET_PATH, dfApplicationData, dfNotify) {

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

                    angular.forEach(scope.rawPackageData['service'], function (manifestValue, manifestKey) { 
                        if (typeof manifestValue === 'object') {
                            
                            if (manifestKey === 'system') {
                                angular.forEach(manifestValue, function (subManifestValue, subManifestKey) { 
                                    var _typeExists = scope.types.filter(function( obj ) {
                                        return obj.name == 'system';
                                    });

                                    if (!_typeExists.length) {
                                        scope.types.push({name: 'system', label: 'System', group: 'System'});
                                    }
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

                                    var _typeObj = {
                                        name: type[0].name, 
                                        label: type[0].label, 
                                        group: type[0].group
                                    };

                                    var _typeExists = scope.types.filter(function( obj ) {
                                        return obj.name == _typeObj.name;
                                    });

                                    if (!_typeExists.length) {
                                        scope.types.push(_typeObj);
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

                        var _type = scope.selectedType.label;
                        var _name = scope.selectedName.charAt(0).toUpperCase() + scope.selectedName.substring(1);

                        var descr = [];
                        var toRemove= [];
                        var includeFiles = [];

                        angular.forEach(scope.selectedNameData, function (value, key) {
                            if (scope.selectedNameData[key]['__dfUI']['selected'] === true) {
                                descr.push(scope.selectedNameData[key]['record']['display_label']);
                                
                                if (scope.selectedNameData[key]['record'].hasOwnProperty('storage_service_id')) {
                                    includeFiles.push({
                                        storage_service_id: scope.selectedNameData[key]['record']['storage_service_id'], 
                                        storage_container: scope.selectedNameData[key]['record']['storage_container']
                                    })
                                }
                            }
                            else {
                                toRemove.push(key);
                            }
                        });

                        toRemove.reverse();
                        angular.forEach(toRemove, function (value, key) {
                            scope.selectedNameData.splice(value, 1);
                        });

                        scope.tableData.push({
                            type: scope.selectedType,
                            name: scope.selectedName,
                            data: scope.selectedNameData,
                            descr: descr.join(',')
                        })

                        if (scope.selectedName == 'app') {
                            scope.addAppFiles(includeFiles)
                        }

                        scope.names = [];
                        scope.selectedType = '';
                        scope.selectedName = '';
                        scope.selectedNameLabel = '';
                        scope.selectedNameData = [];
                        scope.selectAll = false;

                    }
                    else {
                        var messageOptions = {
                            module: 'Package Manager',
                            provider: 'dreamfactory',
                            type: 'error',
                            message: 'Nothing is selected for export.'
                        }

                        dfNotify.error(messageOptions);
                    }
                }

                scope.addAppFiles = function(fileObj) {

                    angular.forEach(fileObj, function (value, key) {
                        var _services = angular.copy(dfApplicationData.getApiData('service'));

                        var _service = _services.filter(function( obj ) {
                                    return obj.id == value.storage_service_id;
                                });

                        var _type = {
                            group: 'File',
                            label: _service[0].label,
                            name: _service[0].type
                        }

                        var _data = [{
                            __dfUI: {selected: true},
                            record: {
                                display_label: value.storage_container,
                                name: value.storage_container,
                                value: value.storage_container
                            }
                        }];

                        scope.tableData.push({
                            type: _type,
                            name: _service[0].name,
                            data: _data,
                            descr: value.storage_container
                        })
                    });
                }

                scope.removeRow = function(row) {
                    scope.tableData.splice(row, 1)
                }

                var watchSelectedType = scope.$watch('selectedType', function (newValue, oldValue) {

                    if (!newValue) return;

                    var _names = [];

                    if (newValue.label === 'System') {
                        angular.forEach(scope.rawPackageData['service']['system'], function (manifestValue, manifestKey) {
                            _names.push(manifestKey);
                        });
                    }
                    else {
                        var _serviceTypes = angular.copy(dfApplicationData.getApiData('service_type'));
                        var _services = angular.copy(dfApplicationData.getApiData('service')); 

                        var _service = _serviceTypes.filter(function( obj ) {
                            return obj.label == newValue.label;
                        });

                        var _availServices = _services.filter(function( obj ) {
                            return obj.type == _service[0].name;
                        });

                        angular.forEach(_availServices, function (value, key) { 
                            if (_names.indexOf(value.name) === -1) {
                                _names.push(value.name);                                
                            }
                        });
                    }
                    
                    scope.names = _names;
                });

                var watchSelectedName = scope.$watch('selectedName', function (newValue, oldValue) {

                    if (!newValue) return;

                    scope.selectedNameLabel = 'Select Item(s) to Export';

                    var apiName = '';

                    if (scope.selectedType.group === 'System') {
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
                            return obj.label == scope.selectedType.label;
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
                                            return obj.record.name == segments[0];
                                        });

                                        if(_exists.length == 0) {
                                            _tableNames.push(new TableData({name: segments[0], value: segments[0], display_label: segments[0]}));
                                        }
                                    }
                                });

                                scope.selectedNameData = _tableNames;
                            }

                            if (_type == 'other') {
                                var _tableNames = [];

                                angular.forEach(results, function (value, key) {
                                    if (value.indexOf('/') > 0) {
                                        var segments = value.split('/');
                                        var _exists = _tableNames.filter(function( obj ) {
                                            return obj.record.folder == segments[0];
                                        });

                                        if(_exists.length == 0) {
                                            _tableNames.push(new TableData({name: segments[0], value: segments[0], display_label: segments[0]}));
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
    .directive('dfExportPackage', ['INSTANCE_URL', 'ADMIN_API_KEY', 'UserDataService', 'dfApplicationData', 'dfSystemData', 'dfNotify', '$http', '$window', function (INSTANCE_URL, ADMIN_API_KEY, UserDataService, dfApplicationData, dfSystemData, dfNotify, $http, $window) {

        return {

            restrict: 'A',
            scope: false,
            replace: true,
            link: function (scope, elem, attrs) {

                scope.selectedFolder = '';
                scope.subFolderName = '';
                scope.secured = false;
                scope.packagePassword = '';

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

                    scope.selectedFolder = 'files';
                }

                scope.folderInit();
                    
                // PUBLIC API
                scope.exportPackage = function() {

                    if (scope.tableData.length) {

                        if (scope.packagePassword.length > 0) {
                            scope.secured = true;
                        }

                        payload = {
                            secured: scope.secured,
                            password: scope.packagePassword,
                            storage: {
                                name: scope.selectedFolder,
                                folder: scope.subFolderName
                            },
                            service: {
                                system: {

                                }
                            }
                        }

                        var tableData = scope.tableData;

                        angular.forEach(tableData, function (value, key) {
                            var selectedExports = [];

                            if (tableData[key]['type']['group'] === 'System') {
                                selectedExports = tableData[key]['data'].map(function(d) { return d['record']['id']; });
                                payload['service']['system'][tableData[key]['name']] = selectedExports;
                            }
                            else if (tableData[key]['type']['group'] === 'Database') {
                                selectedExports = tableData[key]['data'].map(function(d) { return d['record']['name']; });
                                payload['service'][tableData[key]['name']] = {'_schema': selectedExports};
                            }
                            else if (tableData[key]['type']['group'] === 'File') {
                                selectedExports = tableData[key]['data'].map(function(d) { return d['record']['value']; });
                                payload['service'][tableData[key]['name']] = selectedExports;
                            }
                            else {
                                selectedExports = tableData[key]['data'].map(function(d) { return d['record']['value']; });
                                payload['service'][tableData[key]['name']] = selectedExports;
                            }
                        });

                        scope._exportPackage();
                    }
                    else {
                        var messageOptions = {
                            module: 'Package Manager',
                            provider: 'dreamfactory',
                            type: 'error',
                            message: 'No package content is selected.'
                        }

                        dfNotify.error(messageOptions);
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
                        var messageOptions = {
                            module: 'Package Manager',
                            provider: 'dreamfactory',
                            type: 'success',
                            message: 'The package has been exported.'
                        }

                        dfNotify.success(messageOptions);
             
                    }, function errorCallback(response) {
                        var messageOptions = {
                            module: 'Package Manager',
                            provider: 'dreamfactory',
                            type: 'error',
                            message: 'An error occurred. Please check selections and export folder.'
                        }

                        dfNotify.error(messageOptions);
                    });
                }

                scope.exportClear = function() {
                    scope.tableData = [];
                    scope.subFolderName = '';
                }

            }
        }
    }])


