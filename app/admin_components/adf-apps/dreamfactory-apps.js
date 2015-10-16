'use strict';

angular.module('dfApps', ['ngRoute', 'dfUtility', 'dfApplication', 'dfHelp', 'dfTable'])

    .constant('MOD_APPS_ROUTER_PATH', '/apps')

    .constant('MOD_APPS_ASSET_PATH', 'admin_components/adf-apps/')

    .config(['$routeProvider', 'MOD_APPS_ROUTER_PATH', 'MOD_APPS_ASSET_PATH',
        function ($routeProvider, MOD_APPS_ROUTER_PATH, MOD_APPS_ASSET_PATH) {
            $routeProvider
                .when(MOD_APPS_ROUTER_PATH, {
                    templateUrl: MOD_APPS_ASSET_PATH + 'views/main.html',
                    controller: 'AppsCtrl',
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

    .controller('AppsCtrl', ['$scope', function ($scope) {


        // Set Title in parent
        $scope.$parent.title = 'Apps';

        // Set module links
        $scope.links = [
            {
                name: 'manage-apps',
                label: 'Manage',
                path: 'manage-apps'
            },
            {
                name: 'create-app',
                label: 'Create',
                path: 'create-app'
            },
            {
                name: 'import-app',
                label: 'Import',
                path: 'import-app'
            },
            {
                name: 'app-groups',
                label: 'Groups',
                path: 'app-groups'
            }
        ];

        // Set empty section options
        $scope.emptySectionOptions = {
            title: 'You have no Apps!',
            text: 'Click the button below to get started building your first application.  You can always create new applications by clicking the tab located in the section menu to the left.',
            buttonText: 'Create An App!',
            viewLink: $scope.links[1]
        };


        $scope.$on('$destroy', function (e) {

        });
    }])

    .directive('dfAppDetails', ['MOD_APPS_ASSET_PATH', 'INSTANCE_URL', 'UserDataService', '$location', 'dfServerInfoService', 'dfApplicationData', 'dfApplicationPrefs', 'dfNotify', '$http', 'dfObjectService', function (MOD_APPS_ASSET_PATH, INSTANCE_URL, UserDataService, $location, dfServerInfoService, dfApplicationData, dfApplicationPrefs, dfNotify, $http, dfObjectService) {

        return {

            restrict: 'E',
            scope: {
                appData: '=?',
                newApp: '=?'
            },
            templateUrl: MOD_APPS_ASSET_PATH + 'views/df-app-details.html',
            link: function (scope, elem, attrs) {

                var getLocalFileStorageServiceId = function () {

                    var a = dfApplicationData.getApiData('service', {type: 'local_file'});

                    return a && a.length ? a[0].id : null;
                }

                // Need to refactor into factory.
                var App = function (appData) {

                    var _app = {
                        name: '',
                        description: '',
                        type: 0,
                        storage_service_id: getLocalFileStorageServiceId(),
                        storage_container: 'applications',
                        path: '',
                        url: '',
                        role_id: null
                    };

                    appData = appData || _app;

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: angular.copy(appData),
                        recordCopy: angular.copy(appData)
                    }
                };

                scope.currentServer = dfServerInfoService.currentServer();

                scope.app = null;

                // Radio button options
                scope.locations = [
                    {
                        label: 'No Storage Required - remote device, client, or desktop.',
                        value: '0'
                    },
                    {
                        label: 'On a provisioned file storage service.',
                        value: '1'
                    },
                    {
                        label: 'On this web server.',
                        value: '3'
                    },
                    {
                        label: 'On a remote URL.',
                        value: '2'
                    }
                ];

                // Other data
                scope.roles = dfApplicationData.getApiData('role');
                scope.selectedRoleId = null;
                scope.storageServices = dfApplicationData.getApiData('service',
                    {type: 'local_file,aws_s3,azure_blob,rackspace_cloud_files,openstack_object_storage'});
                scope.storageContainers = [];

                if (scope.newApp) {
                    scope.app = new App();
                }

                // PUBLIC API
                scope.saveApp = function () {

                    if (scope.newApp) {

                        scope._saveApp();
                    }
                    else {
                        scope._updateApp();
                    }

                };

                scope.closeApp = function () {

                    scope._closeApp();
                }


                // PRIVATE API
                scope._prepareAppData = function (record) {


                    // Assign role to app
                    scope._assignRoleToApp();

                    var _app = angular.copy(record);

                    // prepare data to be sent to server, delete N/A fields
                    switch (parseInt(_app.record.type)) {

                        case 0: // no storage

                            delete _app.record.storage_service_id;
                            delete _app.record.storage_container;
                            delete _app.record.path;
                            delete _app.record.url;
                            break;

                        case 1: // storage service

                            delete _app.record.url;
                            break;

                        case 2: // url

                            delete _app.record.storage_service_id;
                            delete _app.record.storage_container;
                            delete _app.record.path;
                            break;

                        case 3: // path

                            delete _app.record.storage_service_id;
                            delete _app.record.storage_container;
                            delete _app.record.url;
                            break;
                    }

                    return _app.record;

                };

                scope._saveAppToServer = function (requestDataObj) {

                    return dfApplicationData.saveApiData('app', requestDataObj).$promise;
                };

                scope._updateAppToServer = function (requestDataObj) {

                    return dfApplicationData.updateApiData('app', requestDataObj).$promise;
                };

                scope._assignRoleToApp = function () {

                    scope.app.record.role_id = null;

                    // Loop through roles
                    angular.forEach(scope.roles, function (role) {

                        if (scope.selectedRoleId) {

                            // Is this the selected role
                            if (role.id === scope.selectedRoleId) {

                                // yes.  Assign
                                scope.app.record.role_id = role.id;
                            }
                        }
                    })
                };

                scope._resetAppDetails = function () {

                    if (scope.newApp) {
                        scope.app = new App();
                    }
                    else {

                        scope.appData = null;
                    }

                    scope.selectedRoleId = null;
                };

                // COMPLEX IMPLEMENTATION
                scope._saveApp = function () {

                    // Create our request obj
                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'role_by_role_id'
                        },
                        data: scope._prepareAppData(scope.app)
                    };

                    // send to the server
                    scope._saveAppToServer(requestDataObj).then(
                        function (result) {

                            // notify success
                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: scope.app.record.name + ' saved successfully.'
                            };

                            dfNotify.success(messageOptions);

                            // clean form
                            scope._resetAppDetails();

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

                            // console.log('Save App Finally')
                        }
                    )
                };

                scope._updateApp = function () {

                    // Create our request obj
                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'role_by_role_id'
                        },
                        data: scope._prepareAppData(scope.app)
                    };

                    // send to the server
                    scope._updateAppToServer(requestDataObj).then(
                        function (result) {

                            // notify success
                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: scope.app.record.name + ' updated successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.app = new App(result.resource);


                            // clean form
                            // reset app
                            if (dfApplicationPrefs.getPrefs().sections.app.autoClose) {
                                scope._resetAppDetails();
                            }

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

                            // console.log('Save App Finally')
                        }
                    )
                };

                scope._closeApp = function () {


                    if (!dfObjectService.compareObjectsAsJson(scope.app.record, scope.app.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return false;
                        }
                    }


                    scope._resetAppDetails();
                };

                scope.changeStorageService = function () {
                    if (scope.app && scope.app.record) {
                        scope.selectedStorageService = scope.storageServices.filter(function (item) {
                            return item.id == scope.app.record.storage_service_id;
                        })[0];
                    }
                    
                };

                // WATCHERS

                var watchAppStorageService = scope.$watch('app.record.storage_service_id', function (newValue, oldValue) {

                    // No new value....return
                    scope.changeStorageService();
                    if (!newValue) return false;

                    var i = 0;

                    scope.storageContainers = [];
                    while (i < scope.storageServices.length) {

                        if (scope.storageServices[i].id === newValue) {

                            dfApplicationData.getServiceComponents(scope.storageServices[i].name).then(function (result) {
                                angular.forEach(result, function (component) {

                                    if (component !== '' && component !== '*') {

                                        scope.storageContainers.push(component)
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
                            });
                        }

                        i++
                    }
                });

                var watchAppData = scope.$watch('appData', function (newValue, oldValue) {

                    if (!newValue) return false;

                    scope.app = new App(newValue);

                    angular.forEach(scope.roles, function (roleObj) {

                        if (roleObj.id === scope.app.record.role_id) {

                            scope.selectedRoleId = roleObj.id;
                        }
                    });
                });

                // MESSAGES
                scope.$on('$destroy', function (e) {

                    watchAppStorageService();
                    watchAppData();
                });


                // HELP

                scope.dfHelp = {
                    applicationName: {
                        title: 'Application API Key',
                        text: 'This API KEY is unique per application and must be included with each API request as a query ' +
                        'param (api_key=yourapikey) or a header (X-DreamFactory-API-Key: yourapikey).'
                    },
                    name: {
                        title: "Display Name",
                        text: 'The display name or label for your app, seen by users of the app in the LaunchPad UI.'
                    },
                    description: {
                        title: "Description",
                        text: 'The app description, seen by users of the app in the LaunchPad UI.'
                    },
                    appLocation: {
                        title: "App Location",
                        text: 'Select File Storage if you want to store your app code on your DreamFactory instance ' +
                        'or some other remote file storage. Select Native for native apps or running the app ' +
                        'from code on your local machine (CORS required). Select URL to specify a URL for your app.'
                    },
                    storageService: {
                        title: "Storage Service",
                        text: 'Where to store the files for your app.'
                    },
                    storageContainer: {
                        title: "Storage Folder",
                        text: 'The folder on the selected storage service.'
                    },
                    defaultPath: {
                        title: "Default Path",
                        text: 'The is the file to load when your app is run. Default is index.html.'
                    },
                    remoteUrl: {
                        title: "Remote Url",
                        text: 'Applications can consist of only a URL. ' +
                        'This could be an app on some other server or a web site URL.'
                    },
                    assignRole: {
                        title: "Assign a Default Role",
                        text: 'Unauthenticated or guest users of the app will have this role.'
                    }
                }
            }
        }
    }])

    .directive('dfManageApps', ['MOD_APPS_ASSET_PATH', 'dfApplicationData', 'dfApplicationPrefs', 'dfReplaceParams', 'dfNotify', '$window', function (MOD_APPS_ASSET_PATH, dfApplicationData, dfApplicationPrefs, dfReplaceParams, dfNotify, $window) {

        return {

            restrict: 'E',
            scope: false,
            templateUrl: MOD_APPS_ASSET_PATH + 'views/df-manage-apps.html',
            link: function (scope, elem, attrs) {


                var ManagedApp = function (appData) {

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: appData
                    }
                };


                scope.currentViewMode = dfApplicationPrefs.getPrefs().sections.app.manageViewMode;

                scope.apps = null;

                scope.currentEditApp = null;

                scope.fields = [
                    {
                        name: 'id',
                        label: 'Id',
                        active: true
                    },
                    {
                        name: 'name',
                        label: 'Name',
                        active: true
                    },
                    {
                        name: 'api_key',
                        label: 'API Key',
                        active: true
                    },
                    {
                        name: 'description',
                        label: 'Description',
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

                scope.selectedApps = [];

                scope.removeFilesOnDelete = false;


                // PUBLIC API
                scope.launchApp = function (app) {

                    scope._launchApp(app);
                };

                scope.editApp = function (app) {

                    scope._editApp(app);
                };

                scope.exportApp = function (app) {

                    scope._exportApp(app);
                };

                scope.deleteApp = function (app) {

                    // Confirm we want to delete app
                    if (dfNotify.confirm("Delete " + app.record.name + "?")) {

                        // Is this app a web app and do we have access to the file storage?
                        if (!app.record.native && app.record.storage_service_id != null) {

                            // It is.  Do we want to delete the files as well?
                            scope.removeFilesOnDelete = dfNotify.confirm('Delete application files? Pressing cancel will retain the files in storage.');
                        }
                        scope._deleteApp(app);
                    }
                };

                scope.orderOnSelect = function (fieldObj) {

                    scope._orderOnSelect(fieldObj);
                };

                scope.setSelected = function (app) {

                    scope._setSelected(app);
                };

                scope.deleteSelectedApps = function () {

                    if (dfNotify.confirm("Delete selected apps?")) {
                        scope.removeFilesOnDelete = dfNotify.confirm('Delete application files?');
                        scope._deleteSelectedApps();
                    }
                };


                // PRIVATE API
                scope._deleteFromServer = function (requestDataObj) {

                    return dfApplicationData.deleteApiData('app', requestDataObj).$promise;
                };


                // COMPLEX IMPLEMENTATION
                scope._launchApp = function (app) {

                    $window.open(dfReplaceParams(app.record.launch_url, app.record.name));
                };

                scope._editApp = function (app) {

                    scope.currentEditApp = app;
                };

                scope._exportApp = function (app) {


                };

                scope._deleteApp = function (app) {

                    var requestDataObj = {
                        params: {
                            delete_storage: scope.removeFilesOnDelete,
                            related: 'role_by_role_id',
                            fields: '*'
                        },
                        data: app.record
                    };


                    scope._deleteFromServer(requestDataObj).then(
                        function (result) {

                            // notify success
                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'App successfully deleted.'
                            };

                            dfNotify.success(messageOptions);

                        },

                        function (reject) {

                            // notify success
                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.success(messageOptions);

                        }
                    ).finally(
                        function () {

                            // console.log('Delete App Finally')
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

                scope._setSelected = function (app) {

                    var i = 0;

                    while (i < scope.selectedApps.length) {

                        if (app.record.id === scope.selectedApps[i]) {

                            app.__dfUI.selected = false;
                            scope.selectedApps.splice(i, 1);
                            return;
                        }

                        i++
                    }

                    app.__dfUI.selected = true;
                    scope.selectedApps.push(app.record.id);

                };

                scope._deleteSelectedApps = function () {

                    var requestDataObj = {
                        params: {
                            ids: scope.selectedApps.join(','),
                            fields: '*',
                            rollback: true,
                            delete_storage: scope.removeFilesOnDelete
                        }
                    };


                    scope._deleteFromServer(requestDataObj).then(
                        function (result) {

                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Apps deleted successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.selectedApps = [];

                            scope.$broadcast('toolbar:paginate:app:reset');
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

                            // console.log('Delete Apps Finally');
                        }
                    )
                };


                // WATCHERS
                var watchApps = scope.$watchCollection('apps', function (newValue, oldValue) {

                    if (newValue == null) {

                        var _app = [];

                        angular.forEach(dfApplicationData.getApiData('app'), function (app) {

                            if (!app.hasOwnProperty('roles') && (app.hasOwnProperty('import_url') && app.import_url != null)) {
                                app.roles = [];
                            }


                            _app.push(new ManagedApp(app));
                        });

                        scope.apps = _app;

                        return;
                    }
                });

                var watchApiData = scope.$watchCollection(function () {

                    return dfApplicationData.getApiData('app');

                }, function (newValue, oldValue) {

                    var _app = [];

                    angular.forEach(dfApplicationData.getApiData('app'), function (app) {

                        _app.push(new ManagedApp(app));
                    });

                    scope.apps = _app;
                    return;


                });


                // MESSAGES

                scope.$on('toolbar:paginate:app:update', function (e) {

                    var _apps = [];

                    angular.forEach(dfApplicationData.getApiData('app'), function (app) {


                        var _app = new ManagedApp(app);

                        var i = 0;

                        while (i < scope.selectedApps.length) {

                            if (scope.selectedApps[i] === _app.record.id) {

                                _app.__dfUI.selected = true;
                                break;
                            }

                            i++
                        }

                        _apps.push(_app);
                    });

                    scope.apps = _apps;
                });

                scope.$on('$destroy', function (e) {

                    // Destroy watchers
                    watchApps();
                    watchApiData();
                });
            }
        }
    }])

    .directive('dfImportApp', ['MOD_APPS_ASSET_PATH', '$http', 'dfApplicationData', 'dfNotify', function (MOD_APPS_ASSET_PATH, $http, dfApplicationData, dfNotify) {

        return {

            restrict: 'E',
            scope: {},
            templateUrl: MOD_APPS_ASSET_PATH + 'views/df-import-app.html',
            link: function (scope, elem, attrs) {


                scope.services = dfApplicationData.getApiData('service', {type: 'local_file,aws_s3,azure_blob'});
                scope.containers = [];

                scope.appPath = null;
                scope.storageService = '';
                scope.storageContainer = '';
                scope.field = angular.element('#upload');
                scope.uploadFile = null;

                scope.sampleApps = [
                    {
                        name: 'Address Book for Android',
                        description: 'An address book app for Android showing user registration, user login, and CRUD.',
                        package_url: 'https://raw.github.com/dreamfactorysoftware/android-sdk/master/package/add_android.dfpkg',
                        repo_url: 'https://github.com/dreamfactorysoftware/android-sdk'
                    },
                    {
                        name: 'Address Book for iOS',
                        description: 'An address book app for iOS showing user registration, user login, and CRUD.',
                        package_url: 'https://raw.github.com/dreamfactorysoftware/ios-sdk/master/example-ios/package/add_ios.dfpkg',
                        repo_url: 'https://github.com/dreamfactorysoftware/ios-sdk'
                    },
                    {
                        name: 'Address Book for AngularJS',
                        description: 'An address book app for AngularJS showing user registration, user login, and CRUD.',
                        package_url: 'https://raw.github.com/dreamfactorysoftware/angular-sdk/master/add_angular.dfpkg',
                        repo_url: 'https://github.com/dreamfactorysoftware/angular-sdk'
                    },
                    {
                        name: 'Address Book for JavaScript',
                        description: 'An address book app for JavaScript showing user registration, user login, and CRUD.',
                        package_url: 'https://raw.github.com/dreamfactorysoftware/javascript-sdk/master/add_javascript.dfpkg',
                        repo_url: 'https://github.com/dreamfactorysoftware/javascript-sdk'
                    },
                    {
                        name: 'Address Book for Titanium',
                        description: 'An address book app for Titanium showing user registration, user login, and CRUD.',
                        package_url: 'https://raw.github.com/dreamfactorysoftware/titanium-sdk/master/add_titanium.dfpkg',
                        repo_url: 'https://github.com/dreamfactorysoftware/titanium-sdk'
                    },
                    {
                        name: 'Address Book for .NET',
                        description: 'An address book app for .NET showing user registration, user login, and CRUD.',
                        package_url: 'https://raw.github.com/dreamfactorysoftware/.net-sdk/master/DreamFactory.AddressBook/App_Package/add_dotnet.dfpkg',
                        repo_url: 'https://github.com/dreamfactorysoftware/.net-sdk'
                    }
                ];


                // PUBLIC API
                scope.submitApp = function () {

                    if (!scope.appPath) {
                        return false;
                    }

                    scope._submitApp();
                };

                scope.browseFileSystem = function () {

                    scope._resetImportApp();
                    scope.field.trigger('click');
                };

                scope.loadSampleApp = function (appObj) {

                    scope._loadSampleApp(appObj);
                };


                // PRIVATE API

                scope._isAppPathUrl = function (appPathStr) {

                    return appPathStr.substr(0, 7) === 'http://' || appPathStr.substr(0, 8) === 'https://';
                };

                scope._importAppToServer = function (requestDataObj) {

                    var _options = {
                        params: {},
                        data: requestDataObj,
                        dontWrapData: true
                    };

                    if (scope._isAppPathUrl(scope.appPath)) {
                        _options['headers'] = {
                            "Content-Type": 'application/json'
                        }
                    }
                    else {
                        _options['headers'] = {"Content-Type": undefined};
                        $http.defaults.transformRequest = angular.identity;
                    }

                    return dfApplicationData.saveApiData('app', _options).$promise;

                };

                scope._isDFPackage = function (appPathStr) {

                    return appPathStr.substr(appPathStr.lastIndexOf('.')) === '.dfpkg'
                };

                scope._resetImportApp = function () {

                    scope.appPath = null;
                    scope.storageService = '';
                    scope.storageContainer = '';
                    scope.uploadFile = null;
                    scope.field.val('');
                }


                // COMPLEX IMPLEMENTATION
                scope._loadSampleApp = function (appObj) {

                    scope.appPath = appObj.package_url;
                };

                scope._submitApp = function () {

                    var requestDataObj = {};

                    if (scope._isAppPathUrl(scope.appPath)) {

                        requestDataObj = {
                            import_url: scope.appPath,
                            storage_service_id: scope.storageService.id,
                            storage_container: scope.storageContainer
                        }
                    }
                    else {

                        var fd = new FormData();
                        var storageId = (scope.storageService && scope.storageService.id !== undefined)? scope.storageService.id : 0;
                        var storageContainer = scope.storageContainer;

                        fd.append('file', scope.uploadFile);
                        fd.append('storage_service_id', storageId);
                        fd.append('storage_container', storageContainer);

                        // fd.append("files", $('input[type=file]')[0].files[0]);
                        // fd.append("text", 'asdfasdsfasdfasdf');
                        requestDataObj = fd
                    }

                    scope._importAppToServer(requestDataObj).then(
                        function (result) {

                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'App successfully imported.'
                            }

                            dfNotify.success(messageOptions);

                        },
                        function (reject) {


                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            }

                            dfNotify.error(messageOptions);


                        }
                    )
                        .finally(
                        function (success) {

                            scope._resetImportApp();

                            $http.defaults.transformRequest = function (d, headers) {

                                if (angular.isObject(d)) {
                                    return angular.toJson(d);
                                }
                            }
                        }
                    )
                };


                // WATCHERS
                var watchStorageService = scope.$watch('storageService', function (newValue, oldValue) {

                    // No new value....return
                    if (!newValue) return false;

                    dfApplicationData.getServiceComponents(newValue.name).then(function (components) {

                        scope.containers = [];

                        // loop through components.
                        angular.forEach(components, function (v, i) {

                            // We don't want '*' or empty string to be available
                            // as options
                            if (v !== '*' && v !== '') {
                                scope.containers.push(v);
                            }
                        });

                    });

                });

                var watchUploadFile = scope.$watch('uploadFile', function (n, o) {

                    if (!n) return;

                    scope.appPath = n.name;
                })


                // MESSAGES
                scope.$on('$destroy', function (e) {
                    watchStorageService();

                });

                // HELP


                scope.dfHelp = {
                    applicationName: {
                        title: 'Application Name',
                        text: 'This is some help text that will be displayed in the help window'
                    }
                }


            }
        }
    }])

    .directive('dfAppGroups', ['MOD_APPS_ASSET_PATH', 'dfApplicationData', 'dfNotify', function (MOD_APPS_ASSET_PATH, dfApplicationData, dfNotify) {

        // @TODO: Need to notify of unsaved app groups.  This may require additional functionality in the sidebar menu directive
        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_APPS_ASSET_PATH + 'views/df-app-groups.html',
            link: function (scope, elem, attrs) {

                var App = function (appData) {

                    return {

                        __dfUI: {
                            selected: false
                        },
                        record: appData
                    }
                }

                var AppGroup = function (appGroupData) {

                    function genTempId() {
                        return Math.floor(Math.random() * 100000)
                    }

                    var _new = {
                        id: null,
                        name: 'NEW APP GROUP',
                        app_to_app_group_by_group_id: []
                    };


                    appGroupData = appGroupData || _new;

                    return {
                        __dfUI: {
                            newAppGroup: appGroupData.id,
                            tempId: genTempId()
                        },
                        record: angular.copy(appGroupData),
                        recordCopy: angular.copy(appGroupData)
                    }
                };


                scope.appGroups = null;
                scope.apps = null;
                scope.selectedAppGroup = null;


                // PUBLIC API
                scope.addAppGroup = function () {

                    scope._addAppGroup();
                };

                scope.deleteAppGroup = function () {

                    scope._deleteAppGroup()
                };

                scope.saveAppGroup = function () {

                    var appGroup = scope.selectedAppGroup;

                    if (appGroup == null) {

                        var messageOptions = {
                            module: 'App Groups',
                            type: 'warn',
                            provider: 'dreamfactory',
                            message: 'No app group selected.'
                        };

                        dfNotify.warn(messageOptions);

                        angular.element('#select-app-group').focus();

                        return;
                    }

                    if (appGroup.record.id === null) {

                        if (appGroup.record.name === 'NEW APP GROUP') {

                            var messageOptions = {
                                module: 'App Groups',
                                type: 'warn',
                                provider: 'dreamfactory',
                                message: 'App Groups should have a unique name.  Please rename your app group to something other than the default \'new\' app group name.'
                            };

                            dfNotify.warn(messageOptions);

                            return;
                        }
                        scope._saveAppGroup(appGroup);
                    } else {

                        scope._updateAppGroup(appGroup);
                    }

                };


                // PRIVATE API
                scope._saveAppGroupToServer = function (requestDataObj) {

                    return dfApplicationData.saveApiData('app_group', requestDataObj).$promise;
                };

                scope._updateAppGroupToServer = function (requestDataObj) {

                    return dfApplicationData.updateApiData('app_group', requestDataObj).$promise;
                };

                scope._deleteAppGroupFromServer = function (requestDataObj) {

                    return dfApplicationData.deleteApiData('app_group', requestDataObj).$promise;
                };

                scope._updateAssignedApps = function (appGroup) {

                    var tempArr = [];

                    angular.forEach(scope.apps, function (managedApp) {

                        var alreadyAdded = false;

                        if(managedApp.__dfUI.selected ){
                            angular.forEach(appGroup.record.app_to_app_group_by_group_id, function(app_to_app_group) {
                                if (app_to_app_group.app_id == managedApp.record.id) {
                                    alreadyAdded = true;
                                }
                            });

                            if(!alreadyAdded){
                                tempArr.push({'app_id': managedApp.record.id});
                            }
                        } else {
                            var appGroupId = null;
                            angular.forEach(appGroup.record.app_to_app_group_by_group_id, function(app_to_app_group) {
                                if(app_to_app_group.app_id == managedApp.record.id){
                                    alreadyAdded = true;
                                    appGroupId = app_to_app_group.id
                                }
                            });

                            if(alreadyAdded){
                                tempArr.push({
                                    'group_id': null,
                                    'app_id': managedApp.record.id,
                                    'id': appGroupId
                                })
                            }
                        }
                    });
                    appGroup.record.app_to_app_group_by_group_id = tempArr;
                };

                scope._checkUnsavedAppGroups = function () {

                    var i = 0;

                    while (i < scope.apps.length) {

                        if (scope.apps[i].__dfUI.newAppGroup === null) {
                            return true;
                        }

                        i++
                    }

                    return false;
                }


                // COMPLEX IMPLEMENTATION
                scope._addAppGroup = function () {
                    scope.appGroups.push(new AppGroup());
                    scope.selectedAppGroup = scope.appGroups[scope.appGroups.length - 1];
                };

                scope._deleteAppGroup = function () {


                    // If this is a recently add/new appgroup that hasn't been saved yet.
                    if (scope.selectedAppGroup.__dfUI.newAppGroup === null) {

                        var i = 0;

                        while (i < scope.appGroups.length) {
                            if (scope.appGroups[i].__dfUI.tempId === scope.selectedAppGroup.__dfUI.tempId) {
                                scope.appGroups.splice(i, 1);
                                break;
                            }

                            i++
                        }

                        var messageOptions = {
                            module: 'App Groups',
                            type: 'success',
                            provider: 'dreamfactory',
                            message: 'App Group deleted successfully.'

                        };

                        dfNotify.success(messageOptions);

                        scope.selectedAppGroup = null;

                        return;
                    }


                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'app_to_app_group_by_group_id'
                        },
                        data: scope.selectedAppGroup.record
                    };


                    scope._deleteAppGroupFromServer(requestDataObj).then(
                        function (result) {

                            var messageOptions = {
                                module: 'App Groups',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'App Group deleted successfully.'
                            };

                            dfNotify.success(messageOptions);

                            // Find where this group is in the array of app groups and
                            // remove
                            var i = 0;

                            while (i < scope.appGroups.length) {

                                if (scope.appGroups[i].record.name === result.name) {

                                    scope.appGroups.splice(i, 1);
                                }

                                i++;
                            }

                            scope.selectedAppGroup = null;

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

                scope._saveAppGroup = function (appGroup) {

                    scope._updateAssignedApps(appGroup);

                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'app_to_app_group_by_group_id'
                        },
                        data: appGroup.record
                    };

                    scope._saveAppGroupToServer(requestDataObj).then(
                        function (result) {

                            var messageOptions = {
                                module: 'App Groups',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'App Group created successfully.'

                            };

                            dfNotify.success(messageOptions);

                            // Reinsert into the matrix.....HA!
                            // No Seriously
                            // Find where this group is in the array of app groups and
                            // replace with the new record sent back from server.
                            // also replace the selectedTemplate with the new record as well
                            var i = 0;

                            while (i < scope.appGroups.length) {
                                if (scope.appGroups[i].record.name === result.record[0].name) {

                                    var _newAppGroup = new AppGroup(result.record[0]);

                                    scope.appGroups[i] = _newAppGroup;
                                    scope.selectedAppGroup = _newAppGroup;
                                }

                                i++;
                            }
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

                scope._updateAppGroup = function (appGroup) {


                    scope._updateAssignedApps(appGroup);

                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'app_to_app_group_by_group_id'
                        },
                        data: appGroup.record
                    };


                    scope._updateAppGroupToServer(requestDataObj).then(
                        function (result) {

                            var messageOptions = {
                                module: 'App Groups',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'App Group updated successfully.'
                            };

                            dfNotify.success(messageOptions);

                            // Reinsert into the matrix.....HA!
                            // No Seriously
                            // Find where this group is in the array of app groups and
                            // replace with the new record sent back from server.
                            // also replace the selectedTemplate with the new record as well
                            var i = 0;

                            while (i < scope.appGroups.length) {
                                if (scope.appGroups[i].record.name === result.name) {

                                    var _newAppGroup = new AppGroup(result);

                                    scope.appGroups[i] = _newAppGroup;
                                    scope.selectedAppGroup = _newAppGroup;
                                }

                                i++;
                            }

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


                // WATCHERS
                var watchAppGroups = scope.$watch('appGroups', function (newValue, oldValue) {


                    if (newValue === null) {

                        scope.appGroups = [];

                        angular.forEach(dfApplicationData.getApiData('app_group'), function (appGroupData) {

                            scope.appGroups.push(new AppGroup(appGroupData))


                        });
                    }
                });

                var watchApps = scope.$watch('apps', function (newValue, oldValue) {

                    if (newValue === null) {

                        scope.apps = [];

                        angular.forEach(dfApplicationData.getApiData('app'), function (appData) {

                            scope.apps.push(new App(appData));
                        })
                    }
                });

                var watchSelectedAppGroup = scope.$watch('selectedAppGroup', function (newValue, oldValue) {

                    angular.forEach(scope.apps, function (appObj) {
                        appObj.__dfUI.selected = false;
                    });

                    if (!newValue) return;

                    if (newValue.record.app_to_app_group_by_group_id.length > 0) {
                        angular.forEach(scope.apps, function (managedApp) {
                            angular.forEach(newValue.record.app_to_app_group_by_group_id, function (app_to_app_group) {
                                if (managedApp.record.id === app_to_app_group.app_id) {
                                    managedApp.__dfUI.selected = true;
                                }
                            })
                        })
                    }
                });


                // HANDLE MESSAGES
                scope.$on('$destroy', function (e) {

                    watchAppGroups();
                    watchApps();
                    watchSelectedAppGroup();
                });


                scope.dfLargeHelp = {
                    appGroups: {
                        title: 'Groups Overview',
                        text: 'Applications can optionally be put into groups. The LaunchPad UI will group the available apps accordingly.'
                    }
                }

            }
        }
    }]);