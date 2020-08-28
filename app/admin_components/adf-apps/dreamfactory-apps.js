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
                        checkUser:['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }])

    .run([function () {

    }])

    .controller('AppsCtrl', ['$rootScope', '$scope', 'dfApplicationData', 'dfNotify', '$location', function ($rootScope, $scope, dfApplicationData, dfNotify, $location) {


        // Set Title in parent
        $scope.$parent.title = 'Apps';
        $scope.$parent.titleIcon = 'desktop';

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
            }
        ];

        // Set empty section options
        $scope.emptySectionOptions = {
            title: 'You have no Apps!',
            text: 'Click the button below to get started building your first application. You can always create new applications by clicking the tab located in the section menu to the left.',
            buttonText: 'Create An App!',
            viewLink: $scope.links[1],
            active: false
        };

        $scope.$on('$destroy', function (e) {

            // dump data if not on page 1
            $scope.$broadcast('toolbar:paginate:app:destroy');
        });

        // load data

        $scope.apiData = null;

        $scope.loadTabData = function(init) {

            $scope.dataLoading = true;

            var apis = ['app', 'role', 'service'];

            dfApplicationData.getApiData(apis).then(
                function (response) {
                    var newApiData = {};
                    apis.forEach(function(value, index) {
                        newApiData[value] = response[index].resource ? response[index].resource : response[index];
                        if (value === 'service') {
                            newApiData[value] = newApiData[value].filter(function (obj) {
                                return ['local_file', 'aws_s3', 'azure_blob', 'rackspace_cloud_files', 'openstack_object_storage', 'ftp_file', 'sftp_file', 'gridfs'].indexOf(obj.type) >= 0;
                            });
                        }
                    });
                    $scope.apiData = newApiData;
                    if (init) {
                        $scope.$broadcast('toolbar:paginate:app:load');
                    }
                },
                function (error) {
                    var msg = 'There was an error loading data for the Apps tab. Please try refreshing your browser and logging in again.';
                    if (error && error.error && (error.error.code === 401 || error.error.code === 403)) {
                        msg = 'To use the Apps tab your role must allow GET access to system/app, system/role, and system/service. To create, update, or delete apps you need POST, PUT, DELETE access to /system/app and/or /system/app/*.';
                        $location.url('/home');
                    }
                    var messageOptions = {
                        module: 'Apps',
                        provider: 'dreamfactory',
                        type: 'error',
                        message: msg
                    };
                    dfNotify.error(messageOptions);
                }
            ).finally(function () {
                $scope.dataLoading = false;
            });
        };

        $scope.loadTabData(true);
    }])

    .directive('dfAppDetails', ['MOD_APPS_ASSET_PATH', 'dfServerInfoService', 'dfApplicationData', 'dfNotify', 'dfObjectService', function (MOD_APPS_ASSET_PATH, dfServerInfoService, dfApplicationData, dfNotify, dfObjectService) {

        return {

            restrict: 'E',
            scope: {
                appData: '=?',
                newApp: '=?',
                apiData: '=?'
            },
            templateUrl: MOD_APPS_ASSET_PATH + 'views/df-app-details.html',
            link: function (scope, elem, attrs) {

                var getLocalFileStorageServiceId = function () {

                    var localFileSvc = scope.apiData.service.filter(function(obj) {
                        return obj.type === 'local_file';
                    });

                    return (localFileSvc && localFileSvc.length > 0)? localFileSvc[0].id : null;
                };

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
                    };
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

                scope.cancelEditor = function () {

                    if (!dfObjectService.compareObjectsAsJson(scope.app.record, scope.app.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return;
                        }
                    }

                    scope.closeEditor();
                };


                // PRIVATE API
                scope._prepareAppData = function (record) {

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

                scope.closeEditor = function () {

                    // same object as currentEditApp used in ng-show
                    scope.appData = null;

                    scope.app = new App();

                    // force to manage view
                    scope.$emit('sidebar-nav:view:reset');
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
                    dfApplicationData.saveApiData('app', requestDataObj).$promise.then(

                        function (result) {

                            // notify success
                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: scope.app.record.name + ' saved successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.closeEditor();
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

                        }
                    );
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
                    dfApplicationData.updateApiData('app', requestDataObj).$promise.then(

                        function (result) {

                            // notify success
                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: scope.app.record.name + ' updated successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.closeEditor();
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

                        }
                    );
                };

                // WATCHERS
                
                // this is simply to get the name of the selected storage service for use in updating app URL in UI
                var watchAppStorageService = scope.$watch('app.record.storage_service_id', function (newValue, oldValue) {

                    if (scope.app && scope.app.record && scope.apiData.service) {
                        scope.selectedStorageService = scope.apiData.service.filter(function (item) {
                            return item.id == scope.app.record.storage_service_id;
                        })[0];
                    }
                });

                // this fires when a record is selected for editing
                // appData is passed in to the directive as data-app-data
                var watchAppData = scope.$watch('appData', function (newValue, oldValue) {

                    if (newValue) {
                        scope.app = new App(newValue);
                    }
                });

                // MESSAGES

                scope.$on('$destroy', function (e) {

                    // Destroy watchers
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
                };
            }
        };
    }])

    .directive('dfManageApps', ['$rootScope', 'MOD_APPS_ASSET_PATH', 'dfApplicationData', 'dfNotify', '$window', function ($rootScope, MOD_APPS_ASSET_PATH, dfApplicationData, dfNotify, $window) {

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
                    };
                };

                scope.apps = null;

                scope.currentEditApp = null;

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
                        name: 'role_by_role_id',
                        label: 'Role',
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

                // COMPLEX IMPLEMENTATION

                scope._launchApp = function (app) {

                    $window.open(app.record.launch_url);
                };

                scope._editApp = function (app) {

                    scope.currentEditApp = app;
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

                    dfApplicationData.deleteApiData('app', requestDataObj).$promise.then(

                        function (result) {

                            // notify success
                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'App successfully deleted.'
                            };

                            dfNotify.success(messageOptions);

                            // tell pagination code to update
                            // if last record on page was deleted it will go to previous page if any
                            // it will send us an update message when complete so we can rebuild the list
                            scope.$broadcast('toolbar:paginate:app:delete');
                        },

                        function (reject) {

                            // notify success
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

                        }
                    );
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

                        i++;
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

                    dfApplicationData.deleteApiData('app', requestDataObj).$promise.then(

                        function (result) {

                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Apps deleted successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.selectedApps = [];

                            // possible multi-delete, tell pagination code to reset to page 1
                            // it will send us an update message when complete so we can rebuild the list
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

                        }
                    );
                };

                // WATCHERS

                // this fires when the API data changes
                // apiData is passed in to the details directive as data-api-data
                var watchApiData = scope.$watchCollection('apiData.app', function (newValue, oldValue) {

                    var _apps = [];

                    if (newValue) {
                        angular.forEach(newValue, function (app) {
                            _apps.push(new ManagedApp(app));
                        });
                        scope.emptySectionOptions.active = (newValue.length === 0);
                    }

                    scope.apps = _apps;
                });

                // MESSAGES

                // broadcast by pagination code when new data is available
                scope.$on('toolbar:paginate:app:update', function (e) {

                    scope.loadTabData();
                });

                scope.$on('$destroy', function (e) {

                    // Destroy watchers
                    watchApiData();
                });
            }
        };
    }])

    .directive('dfAppLoading', [function() {
      return {
        restrict: 'E',
          template: "<div class='col-lg-12' ng-if='dataLoading'><span style='display: block; width: 100%; text-align: center; color: #A0A0A0; font-size: 50px; margin-top: 100px'><i class='fa fa-refresh fa-spin'></i></div>"
      };
    }])

    .directive('dfImportApp', ['MOD_APPS_ASSET_PATH', '$http', 'dfApplicationData', 'dfNotify', function (MOD_APPS_ASSET_PATH, $http, dfApplicationData, dfNotify) {

        return {

            restrict: 'E',
            scope: {
                apiData: '=?'
            },
            templateUrl: MOD_APPS_ASSET_PATH + 'views/df-import-app.html',
            link: function (scope, elem, attrs) {

                scope.containers = [];

                scope.appPath = null;
                scope.storageService = '';
                scope.storageContainer = '';
                scope.field = angular.element('#upload');
                scope.uploadFile = null;

                scope.sampleAppsFirstColumn = [
                    {
                        name: 'Address Book for Android',
                        description: '',
                        package_url: 'https://raw.github.com/dreamfactorysoftware/android-sdk/master/package/add_android.dfpkg',
                        repo_url: 'https://github.com/dreamfactorysoftware/android-sdk'
                    },
                    {
                        name: 'Address Book for iOS Objective-C',
                        description: '',
                        package_url: 'https://raw.github.com/dreamfactorysoftware/ios-sdk/master/example-ios/package/add_ios.dfpkg',
                        repo_url: 'https://github.com/dreamfactorysoftware/ios-sdk'
                    },
                    {
                        name: 'Address Book for iOS Swift',
                        description: '',
                        package_url: 'https://raw.github.com/dreamfactorysoftware/ios-swift-sdk/master/SampleAppSwift/package/add_ios_swift.dfpkg',
                        repo_url: 'https://github.com/dreamfactorysoftware/ios-swift-sdk'
                    },
                    {
                        name: 'Address Book for JavaScript',
                        description: '',
                        package_url: 'https://raw.github.com/dreamfactorysoftware/javascript-sdk/master/add_javascript.dfpkg',
                        repo_url: 'https://github.com/dreamfactorysoftware/javascript-sdk'
                    },
                    {
                        name: 'Address Book for AngularJS',
                        description: '',
                        package_url: 'https://raw.github.com/dreamfactorysoftware/angular-sdk/master/add_angular.dfpkg',
                        repo_url: 'https://github.com/dreamfactorysoftware/angular-sdk'
                    }
                ];

                scope.sampleAppsSecondColumn = [
                    {
                        name: 'Address Book for Angular 2',
                        description: '',
                        package_url: 'https://raw.github.com/dreamfactorysoftware/angular2-sdk/master/add_angular2.dfpkg',
                        repo_url: 'https://github.com/dreamfactorysoftware/angular2-sdk'
                    },
                    {
                        name: 'Address Book for Ionic',
                        description: '',
                        package_url: 'https://raw.github.com/dreamfactorysoftware/ionic-sdk/master/package/add_ionic.dfpkg',
                        repo_url: 'https://github.com/dreamfactorysoftware/ionic-sdk'
                    },
                    {
                        name: 'Address Book for Titanium',
                        description: '',
                        package_url: 'https://raw.github.com/dreamfactorysoftware/titanium-sdk/master/add_titanium.dfpkg',
                        repo_url: 'https://github.com/dreamfactorysoftware/titanium-sdk'
                    },
                    {
                        name: 'Address Book for ReactJS',
                        description: '',
                        package_url: 'https://github.com/dreamfactorysoftware/df-react-example-application/raw/master/df-react-example-application.dfpkg',
                        repo_url: 'https://github.com/dreamfactorysoftware/df-react-example-application'
                    },
                    {
                        name: 'Address Book for .NET',
                        description: '',
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
                        };
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
                };


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
                        };
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
                        requestDataObj = fd;
                    }

                    scope._importAppToServer(requestDataObj).then(

                        function (result) {

                            var messageOptions = {
                                module: 'Apps',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'App successfully imported.'
                            };

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
                    ).finally(
                        function (success) {

                            scope._resetImportApp();

                            $http.defaults.transformRequest = function (d, headers) {

                                if (angular.isObject(d)) {
                                    return angular.toJson(d);
                                }
                            };
                        }
                    );
                };

                // WATCHERS

                var watchUploadFile = scope.$watch('uploadFile', function (n, o) {

                    if (!n) {
                        return;
                    }

                    scope.appPath = n.name;
                });

                // MESSAGES

                scope.$on('$destroy', function (e) {

                    // Destroy watchers
                    watchUploadFile();
                });

                // HELP

                scope.dfHelp = {
                    applicationName: {
                        title: 'Application Name',
                        text: 'This is some help text that will be displayed in the help window'
                    }
                };
            }
        };
    }]);