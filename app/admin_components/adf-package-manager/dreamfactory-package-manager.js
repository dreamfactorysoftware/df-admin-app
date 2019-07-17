angular.module('dfPackageManager', ['ngRoute', 'dfUtility', 'ngclipboard'])
    .constant('MOD_PACKAGE_MANAGER_ROUTER_PATH', '/package-manager')
    .constant('MOD_PACKAGE_MANAGER_ASSET_PATH', 'admin_components/adf-package-manager/')
    .config(['$routeProvider', 'MOD_PACKAGE_MANAGER_ROUTER_PATH', 'MOD_PACKAGE_MANAGER_ASSET_PATH',
        function ($routeProvider, MOD_PACKAGE_MANAGER_ROUTER_PATH, MOD_PACKAGE_MANAGER_ASSET_PATH) {
            $routeProvider
                .when(MOD_PACKAGE_MANAGER_ROUTER_PATH, {
                    templateUrl: MOD_PACKAGE_MANAGER_ASSET_PATH + 'views/main.html',
                    controller: 'PackageCtrl',
                    resolve: {
                        checkUser:['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }])

    .run([function () {

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
                };

                this.addPane = function(pane) {
                    if (panes.length == 0) {
                        $scope.select(pane);
                    }
                    panes.push(pane);
                };
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
    .controller('PackageCtrl', ['$scope', '$rootScope', 'dfApplicationData', 'dfNotify', '$location', function($scope, $rootScope, dfApplicationData, dfNotify, $location) {

        $scope.$parent.title = 'Packages';
        $scope.$parent.titleIcon = 'plus-square';

        // load data

        $scope.apiData = null;

        $scope.loadTabData = function() {

            $scope.dataLoading = true;

            // these are required
            var primaryApis = ['service_list', 'service_type_list', 'environment', 'package'];

            // this one is optional, needed if we want to automatically add an app's storage service when the app is added
            // the storage service must be in service_list, meaning user has access to it, for this to work
            var secondaryApis = ['app'];

            var errorFunc = function (error) {
                var msg = 'There was an error loading data for the Packages tab. Please try refreshing your browser and logging in again.';
                if (error && error.error && (error.error.code === 401 || error.error.code === 403)) {
                    msg = 'To use the Packages tab your role must allow GET and POST access to system/package.';
                    $location.url('/home');
                }
                var messageOptions = {
                    module: 'Packages',
                    provider: 'dreamfactory',
                    type: 'error',
                    message: msg
                };
                dfNotify.error(messageOptions);
                $scope.dataLoading = false;
            };

            // first get system data to decide whether to load other data
            dfApplicationData.getApiData(['system']).then(
                function (response) {
                    angular.forEach(response[0].resource, function (value) {
                        if (value.name === 'event_script') {
                            $scope.eventScriptEnabled = true;
                        }
                    });
                    // force refresh to always load from server
                    dfApplicationData.getApiData(primaryApis, true).then(
                        function (response) {
                            var newApiData = {};
                            primaryApis.forEach(function(value, index) {
                                newApiData[value] = response[index].resource ? response[index].resource : response[index];
                            });
                            // force refresh to always load from server
                            dfApplicationData.getApiData(secondaryApis, true).then(
                                function (response) {
                                    secondaryApis.forEach(function(value, index) {
                                        newApiData[value] = response[index].resource ? response[index].resource : response[index];
                                    });
                                },
                                function (error) {
                                    newApiData.app = [];
                                }
                            ).finally(function () {
                                // all done
                                $scope.apiData = newApiData;
                                $scope.dataLoading = false;
                            });
                        },
                        errorFunc
                    );
                },
                // error getting system data
                errorFunc
            ).finally(function () {
                $scope.dataLoading = false;
            });
        };

        $scope.loadTabData();

        $scope.dfLargeHelp = {

            packageManager: {
                title: 'Packages Overview',
                text: 'Import and export users, apps, files, database schemas and more.'
            },
            packageExport: {
                title: '',
                text: '<b>To create a DreamFactory package export file, follow these instructions.</b><br/>' +
                '<ul>' +
                '<li>Use the UI below to build a list of items to export.</li>' +
                '<li>You should enter a password if you\'d like exported user passwords and service credentials to be encrypted. This password will be required if you decide to import this package file later.</li>' +
                '<li>Select a file service to store the exported zip file. Folder name is optional.</li>' +
                '<li>Click the Export button to save the zip file to the file storage location you selected.</li>' +
                '</ul>'
            }
        };
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
    .directive('dfImportPackage', ['MOD_PACKAGE_MANAGER_ASSET_PATH', 'INSTANCE_URL', 'UserDataService', 'dfApplicationData', 'dfNotify', '$timeout', '$http', function (MOD_PACKAGE_MANAGER_ASSET_PATH, INSTANCE_URL, UserDataService, dfApplicationData, dfNotify, $timeout, $http) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_PACKAGE_MANAGER_ASSET_PATH + 'views/df-import-package.html',
            link: function (scope, elem, attrs) {
                scope.packageImportPassword = '';
                scope.overwrite = false;
                scope.fileSelector = angular.element('#fileSelect');
                scope.fileImportPath = null;
                scope.uploadFile = null;

                scope.browseFileSystem = function () {

                    scope.fileSelector.trigger('click');
                };

                scope.importPackageFile = function() {
                    var file = scope.file;
                    if(file === undefined){
                        file = scope.fileImportPath;
                    }

                    if (file) {

                        var currentUser = UserDataService.getCurrentUser();

                        // unset content type, it'll get set later

                        $http({
                            method: 'POST',
                            url: INSTANCE_URL.url + '/system/package?password=' + scope.packageImportPassword + '&overwrite=' + scope.overwrite,
                            headers: {
                                'X-DreamFactory-Session-Token': currentUser.session_token,
                                'Content-Type': undefined
                            },
                            data: {
                                files: file,
                                import_url: file
                            },
                            transformRequest: function (data) {

                                var formData = new FormData();

                                angular.forEach(data, function (value, key) {
                                    formData.append(key, value);
                                });

                                return formData;
                            }
                        }).then(function (result) {

                            if (result && result.data) {

                                if (result.data.success === true) {

                                    var messageOptions = {
                                        module: 'Packages',
                                        provider: 'dreamfactory',
                                        type: 'success',
                                        message: 'Package was imported successfully.'
                                    };

                                    dfNotify.success(messageOptions);

                                    scope.importClear();

                                    scope.loadTabData();
                                } else {

                                    var notice = '';

                                    angular.forEach(result.data.log.notice, function (value, key) {
                                        notice += '* ' + value + '\n';
                                    });

                                    var msg = 'Package import failed.\n\n' +
                                        'Reason:\n' +
                                        notice;

                                    $timeout(function () {
                                        alert(msg);
                                    });
                                }
                            }
                        }, function (reject) {

                            var messageOptions = {
                                module: 'Packages',
                                provider: 'dreamfactory',
                                type: 'error',
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                        });

                        scope.packageImportPassword = '';
                    }
                    else {
                        var messageOptions = {
                            module: 'Packages',
                            provider: 'dreamfactory',
                            type: 'error',
                            message: 'No package file selected.'
                        };

                        dfNotify.error(messageOptions);
                    }
                };

                scope.importClear = function() {

                    if (scope.file) {
                        delete scope.file;
                    }
                    angular.element("input[type='file']").val(null);
                    scope.packageImportPassword = '';
                    scope.fileImportPath = null;
                };

                // WATCHERS

                var watchUploadFile = scope.$watch('uploadFile', function (n, o) {

                    if (!n) return;

                    scope.fileImportPath = n.name;
                });

                // MESSAGES

                scope.$on('$destroy', function (e) {

                    // Destroy watchers
                    watchUploadFile();
                });
            }
        };
    }])
    .directive('dfViewContent', ['MOD_PACKAGE_MANAGER_ASSET_PATH', function (MOD_PACKAGE_MANAGER_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_PACKAGE_MANAGER_ASSET_PATH + 'views/df-view-content.html',
            link: function (scope, elem, attrs) {

            }
        };
    }])
    .directive('dfSelectContent', ['$http', '$timeout', 'MOD_PACKAGE_MANAGER_ASSET_PATH', 'dfApplicationData', 'dfNotify', function ($http, $timeout, MOD_PACKAGE_MANAGER_ASSET_PATH, dfApplicationData, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_PACKAGE_MANAGER_ASSET_PATH + 'views/df-select-content.html',
            link: function (scope, elem, attrs) {

                scope.initVars = function () {
                    scope.types = [];
                    scope.selectedType = null;
                    scope.names = [];
                    scope.selectedName = null;
                    scope.selectedNameData = [];
                    scope.tableData = [];
                    scope.search = {};
                };

                scope.resetVars = function () {
                    scope.selectedType = null;
                    scope.selectedName = null;
                    scope.selectedNameData = [];
                    scope.tableData = [];
                    scope.search = {};
                };

                scope.initVars();

                var tempFilterText = null;
                var filterTextTimeout;

                var TableData = function (tableData) {

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: tableData
                    };
                };

                scope.init = function () {

                    scope.initVars();

                    var env = scope.apiData.environment;
                    scope.enablePassword = env['platform']['secured_package_export'];

                    var _serviceTypes = scope.apiData.service_type_list;
                    var _services = scope.apiData.service_list;

                    // Build a unique list of service_types that covers all services in the manifest.
                    // This is what gets displayed in the Type menu. When you select a type it'll get
                    // all the services from the manifest with that type and put them in the Name menu.
                    angular.forEach(scope.apiData.package['service'], function (manifestValue, manifestKey) {

                        // get the service whose name matches service from manifest
                        var _service = _services.filter(function (obj) {
                            return obj.name === manifestKey;
                        });

                        // get the service type whose name matches the type of the service
                        var type = _serviceTypes.filter(function (obj) {
                            return obj.name == _service[0].type;
                        });

                        var _typeObj = {
                            name: type[0].name,
                            label: type[0].label,
                            group: type[0].group
                        };

                        if (_typeObj.group === 'Database') {
                            _typeObj.label += ' Schema';
                        }

                        // check to see if service type is already in list
                        var _typeExists = scope.types.filter(function (obj) {
                            return obj.name == _typeObj.name;
                        });

                        // if not in list then add it
                        if (_typeExists.length === 0) {
                            scope.types.push(_typeObj);
                        }
                    });
                };

                scope.anySelected = function () {

                    var selected;

                    selected = scope.selectedNameData.map(function (d) {
                        return d['__dfUI']['selected'];
                    });
                    return (selected.indexOf(true) >= 0);
                };

                scope.getAllNames = function () {

                    return scope.selectedNameData.map(function (d) {
                        return d['record']['display_label'];
                    });
                };

                scope.getSelectedNames = function () {

                    var selected;

                    selected = [];
                    angular.forEach(scope.selectedNameData, function (value) {

                        if (value['__dfUI']['selected'] === true) {
                            selected.push(value['record']['display_label']);
                        }
                    });
                    return selected;
                };

                scope.removeRow = function(row) {

                    scope.tableData.splice(row, 1);
                };

                scope.addToPackage = function (selectAll) {

                    // if already selected all then just check for missing app files

                    var selectAllExists = false;

                    angular.forEach(scope.tableData, function (value) {

                        if (value.type.name === scope.selectedType.name && value.name === scope.selectedName) {

                            if (value.selectAll === true) {
                                selectAllExists = true;
                            }
                        }
                    });

                    if (selectAllExists) {
                        // if no missing file service was added then show message
                        if (!scope.addAppFiles(scope.getAllNames())) {
                            var messageOptions = {
                                module: 'Packages',
                                provider: 'dreamfactory',
                                type: 'error',
                                message: 'You have already selected all items for ' + scope.selectedType.label + ' / ' + scope.selectedName + '.'
                            };
                            dfNotify.error(messageOptions);
                            return;
                        }
                    }

                    if (selectAll === true) {

                        // remove any existing entries with matching name and type

                        var tableRemoveArray = [];

                        angular.forEach(scope.tableData, function (value, index) {

                            if (value.name === scope.selectedName && value.type.name === scope.selectedType.name) {

                                tableRemoveArray.push(index);
                            }
                        });

                        tableRemoveArray.reverse();

                        angular.forEach(tableRemoveArray, function (value) {

                            scope.removeRow(value);
                        });

                        // add entry for All

                        var allNames = scope.getAllNames();

                        scope.tableData.push({
                            type: scope.selectedType,
                            name: scope.selectedName,
                            selectAll: true,
                            selected: allNames,
                            descr: 'All'
                        });

                        // add missing file services if any
                        if (scope.selectedType.name === 'system' && scope.selectedName === 'app') {
                            scope.addAppFiles(allNames);
                        }
                    } else {

                        // if entry is not there then add it

                        var newSelected = scope.getSelectedNames();

                        angular.forEach(newSelected, function (sel) {

                            var matches = scope.tableData.filter(function (obj) {
                                return obj.type.name === scope.selectedType.name &&
                                    obj.name === scope.selectedName &&
                                    obj.selected[0] === sel;
                            });

                            if (matches.length === 0) {
                                scope.tableData.push({
                                    type: scope.selectedType,
                                    name: scope.selectedName,
                                    selectAll: false,
                                    selected: [sel],
                                    descr: sel
                                });
                            }

                            // Add missing file service if any. This should be done even if app was already in list because user
                            // might have manually deleted the file storage entry and now wants to add it back.
                            if (scope.selectedType.name === 'system' && scope.selectedName === 'app') {
                                scope.addAppFiles([sel]);
                            }
                        });
                    }

                    // uncheck all rows
                    angular.forEach(scope.selectedNameData, function (value) {

                        value['__dfUI']['selected'] = false;
                    });

                    console.log('tableData', scope.tableData);
                };

                scope.addAppFiles = function (appNames) {

                    var retVal = false, apps = scope.apiData.app;
                    var matches, services, serviceId, serviceName, container;

                    // for each app in list add storage service to tableData if
                    // storage_service_id is set and entry not already in tableData
                    angular.forEach(appNames, function (value) {
                        // get app record
                        matches = apps.filter(function (obj) {
                            return obj.name === value;
                        });
                        if (matches.length === 1) {
                            // get storage service id and container name from app record
                            serviceId = matches[0].storage_service_id;
                            container = matches[0].storage_container + '/';
                            // get storage service record
                            services = scope.apiData.service_list;
                            matches = services.filter(function (obj) {
                                return obj.id === serviceId;
                            });
                            if (matches.length === 1) {
                                // build table entry
                                var type = {
                                    group: 'File',
                                    label: matches[0].label,
                                    name: matches[0].type
                                };
                                serviceName = matches[0].name;
                                // check to see if already there
                                var matches = scope.tableData.filter(function (obj) {
                                    return obj.type.name === type.name &&
                                        obj.name === serviceName &&
                                        obj.selected.indexOf(container) >= 0;
                                });
                                // if not there add it
                                if (matches.length === 0) {
                                    retVal = true;
                                    scope.tableData.push({
                                        type: type,
                                        name: serviceName,
                                        selectAll: false,
                                        selected: [container],
                                        descr: container
                                    });
                                }
                            }
                        }
                    });
                    return retVal;
                };

                scope.loadTable = function (newValue, filter) {

                    var nameData = [], values = [], record;

                    if (newValue && newValue.indexOf('[unavailable]') !== -1) {
                        alert('You have selected a service that is currently unavailable/unreachable. ' +
                            'Please check DreamFactory log or client console for error details.')
                        newValue = newValue.replace(" [unavailable]", "");
                    }

                    switch (scope.selectedType.group) {
                        case 'System':
                            values = scope.apiData.package['service']['system'][newValue];
                            break;
                        case 'Database':
                            values = scope.apiData.package['service'][newValue]['_schema'];
                            break;
                        case 'File':
                            // folders only
                            values = scope.apiData.package['service'][newValue].filter(function (obj) {
                                return obj.indexOf('/') > 0;
                            });
                            break;
                    }
                    angular.forEach(values, function (value) {

                        if (scope.selectedType.group === 'System' && (scope.selectedName === 'admin' || scope.selectedName === 'user')) {
                            record = {
                                'display_label': value.email,
                                'first_name': value.first_name,
                                'last_name': value.last_name
                            };
                        } else {
                            record = {'display_label': value};
                        }
                        if (!filter || value.indexOf(filter) >= 0) {
                            nameData.push(new TableData(record));
                        }
                    });
                    scope.selectedNameData = nameData;
                };

                scope.$watch('search.text', function (newValue, oldValue) {

                    if (newValue === null || newValue === undefined) {
                        return;
                    }

                    if (filterTextTimeout) $timeout.cancel(filterTextTimeout);

                    tempFilterText = newValue;

                    filterTextTimeout = $timeout(function () {
                        scope.loadTable(scope.selectedName, tempFilterText);
                    }, 500);
                }, true);

                scope.$watch('selectedType', function (newValue) {

                    var _type, _name, _names = [], _services, _service;

                    scope.names = [];
                    scope.selectedName = null;
                    scope.selectedNameData = [];

                    if (!newValue || !newValue.name) {
                        return;
                    }

                    // get the name of the selected service type
                    _type = newValue.name;

                    // for system show system resources, for other service types show services

                    if (_type === 'system') {

                        angular.forEach(scope.apiData.package['service']['system'], function (manifestValue, manifestKey) {
                            _names.push(manifestKey);
                        });

                    } else {

                        // find all services in manifest with matching service type

                        _services = scope.apiData.service_list;

                        angular.forEach(scope.apiData.package['service'], function (manifestValue, manifestKey) {

                            // get the service whose name matches service from manifest
                            _service = _services.filter(function (obj) {
                                return obj.name === manifestKey;
                            });

                            // if service type matches selected type then add the service
                            if (_service[0].type === _type) {
                                _name = _service[0].name;
                                if (manifestValue.reachable === false) {
                                    _name += ' [unavailable]';
                                }
                                _names.push(_name);
                            }
                        });
                    }

                    scope.names = _names;
                });

                scope.$watch('selectedName', function (newValue) {

                    if (!newValue) return;

                    scope.loadTable(newValue, null);
                });

                scope.$watchCollection('apiData', function (newValue) {

                    if (newValue) {
                        scope.init();
                    }
                });
            }
        };
    }])
    .directive('dfSelectFolder', ['MOD_PACKAGE_MANAGER_ASSET_PATH', function (MOD_PACKAGE_MANAGER_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_PACKAGE_MANAGER_ASSET_PATH + 'views/df-select-folder.html',
            link: function (scope, elem, attrs) {

            }
        };
    }])
    .directive('dfExportPackage', ['INSTANCE_URL', 'INSTANCE_API_PREFIX', 'APP_API_KEY', 'dfNotify', '$http', '$window', '$timeout', 'UserDataService', function (INSTANCE_URL, INSTANCE_API_PREFIX, APP_API_KEY, dfNotify, $http, $window, $timeout, UserDataService) {

        return {

            restrict: 'A',
            scope: false,
            replace: true,
            link: function (scope, elem, attrs) {

                scope.availableFileServices = null;
                scope.selectedFileService = null;
                scope.folderName = '';
                scope.fileName = '';
                scope.packagePassword = '';
                scope.showFilePath = false;
                scope.publicFilePath = 'N/A';
                scope.publicPathNote = '';

                var exportPath = '';
                var payload = {};

                scope.folderInit = function () {

                    var _services = scope.apiData.service_list;
                    var _serviceTypes = scope.apiData.service_type_list;

                    var _fileTypes = _serviceTypes.filter(function (obj) {
                        return obj.group === 'File';
                    });

                    var _searchTypes = _fileTypes.map(function (type) {
                        return type['name'];
                    });
                    var _fileServices = [];
                    angular.forEach(_services, function (value) {
                        if (_searchTypes.indexOf(value.type) > -1) {
                            _fileServices.push(value);
                        }
                    });

                    scope.selectedFileService = null;
                    scope.availableFileServices = _fileServices;
                };

                scope.exportPackage = function () {

                    var name, type, group, selected;

                    if (scope.tableData.length === 0) {

                        var messageOptions = {
                            module: 'Packages',
                            provider: 'dreamfactory',
                            type: 'error',
                            message: 'No package content is selected.'
                        };

                        dfNotify.error(messageOptions);
                    } else if (!scope.selectedFileService) {

                        var messageOptions = {
                            module: 'Packages',
                            provider: 'dreamfactory',
                            type: 'error',
                            message: 'No file service is selected.'
                        };

                        dfNotify.error(messageOptions);
                    } else {

                        payload = {
                            secured: (scope.packagePassword.length > 0),
                            password: scope.packagePassword,
                            storage: {
                                name: scope.selectedFileService.name,
                                folder: scope.folderName,
                                filename: scope.fileName
                            },
                            service: {}
                        };

                        var tableData = scope.tableData;

                        angular.forEach(tableData, function (value) {

                            selected = value.selected;
                            type = value.type.name;     // system, mysql, local_file
                            name = value.name;          // role, mydb, myfiles
                            group = value.type.group;   // System, Database, File
                            switch (group) {
                                case 'System':
                                    if (payload.service[type] === undefined) {
                                        payload.service[type] = {};
                                    }
                                    if (payload.service[type][name] === undefined) {
                                        payload.service[type][name] = [];
                                    }
                                    payload.service[type][name] = payload.service[type][name].concat(selected);
                                    break;
                                case 'Database':
                                    if (payload.service[name] === undefined) {
                                        payload.service[name] = {};
                                    }
                                    if (payload.service[name]['_schema'] === undefined) {
                                        payload.service[name]['_schema'] = [];
                                    }
                                    payload.service[name]['_schema'] = payload.service[name]['_schema'].concat(selected);
                                    break;
                                case 'File':
                                    if (payload.service[name] === undefined) {
                                        payload.service[name] = [];
                                    }
                                    payload.service[name] = payload.service[name].concat(selected);
                                    break;
                            }
                        });

                        console.log('manifest', payload);

                        $http({
                            method: 'POST',
                            url: INSTANCE_URL.url + '/system/package',
                            data: payload
                        }).then(function successCallback(response) {
                            exportPath = response.data.path;
                            var path = response.data.path;
                            path = path.replace(INSTANCE_API_PREFIX, '');
                            scope.publicFilePath = path;
                            scope.showFilePath = true;

                            var msg = 'The package has been exported. Click the Download button to download the file.\n\n' +
                                'The path to the exported package is: \n' +
                                path + '\n';

                            if (response.data.is_public === false) {
                                var subFolder = (scope.folderName === '') ? '__EXPORTS' : scope.folderName;
                                var pathNote = '\nTo make your exported file publicly accessible/downloadable, ' +
                                    'edit your "' + scope.selectedFileService.label + '" service configuration to ' +
                                    'add "' + subFolder + '" under "Public Path".';
                                msg += pathNote;
                                scope.publicPathNote = pathNote;
                            }

                            $timeout(function () {
                                alert(msg);
                            });

                        }, function errorCallback(response) {

                            var msg = 'An error occurred!\n\n' +
                                'Reason:\n' +
                                response.data.error.message + '\n';

                            $timeout(function () {
                                alert(msg);
                            });
                        });
                    }
                };

                scope.exportDownload = function()
                {
                    if (exportPath !== '') {
                        var params = "?api_key=" + APP_API_KEY;
                        var currentUser = UserDataService.getCurrentUser();
                        if (currentUser && currentUser.session_token) {
                            params += "&session_token=" + currentUser.session_token;
                        }
                        window.location.href = exportPath + params;
                    }
                };

                scope.exportClear = function() {

                    scope.resetVars();

                    exportPath = '';
                    scope.folderName = '';
                    scope.fileName = '';
                    scope.packagePassword = '';
                    scope.showFilePath = false;
                    scope.publicFilePath = 'N/A';
                    scope.publicPathNote = '';
                };

                scope.$watchCollection('apiData', function(newValue) {

                    if (newValue) {
                        scope.folderInit();
                    }
                });
            }
        }
    }])

    .directive('dfPackageLoading', [function() {
        return {
            restrict: 'E',
            template: "<div class='col-lg-12' ng-if='dataLoading'><span style='display: block; width: 100%; text-align: center; color: #A0A0A0; font-size: 50px; margin-top: 100px'><i class='fa fa-refresh fa-spin'></i></div>"
        };
    }]);
