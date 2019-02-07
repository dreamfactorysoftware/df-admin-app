/**
 * This file is part of DreamFactory (tm)
 *
 * http://github.com/dreamfactorysoftware/dreamfactory
 * Copyright 2012-2017 DreamFactory Software, Inc. <dspsupport@dreamfactory.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';


angular.module('dfAdmins', ['ngRoute', 'dfUtility', 'dfApplication', 'dfHelp'])
    .constant('MOD_ADMIN_ROUTER_PATH', '/admins')
    .constant('MOD_ADMIN_ASSET_PATH', 'admin_components/adf-admins/')
    .config(['$routeProvider', 'MOD_ADMIN_ROUTER_PATH', 'MOD_ADMIN_ASSET_PATH',
        function ($routeProvider, MOD_ADMIN_ROUTER_PATH, MOD_ADMIN_ASSET_PATH) {
            $routeProvider
                .when(MOD_ADMIN_ROUTER_PATH, {
                    templateUrl: MOD_ADMIN_ASSET_PATH + 'views/main.html',
                    controller: 'AdminsCtrl',
                    resolve: {
                        checkAdmin:['checkAdminService', function (checkAdminService) {
                            return checkAdminService.checkAdmin();
                        }],
                        checkUser:['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }])

    .run([function () {

    }])

    .controller('AdminsCtrl', ['$rootScope', '$scope', 'dfApplicationData', 'dfNotify', '$location',
        function($rootScope, $scope, dfApplicationData, dfNotify, $location) {

            $scope.$parent.title = 'Admins';

            // Set module links
            $scope.links = [
                {
                    name: 'manage-admins',
                    label: 'Manage',
                    path: 'manage-admins'
                },
                {
                    name: 'create-admin',
                    label: 'Create',
                    path: 'create-admin'
                }
            ];

            // Set empty search result message
            $scope.emptySearchResult = {
                title: 'You have no Admins that match your search criteria!',
                text: ''
            };

            // load data

            $scope.apiData = null;

            $scope.loadTabData = function () {

                $scope.dataLoading = true;

                var apis = ['admin'];

                dfApplicationData.getApiData(apis).then(
                    function (response) {
                        var newApiData = {};
                        apis.forEach(function (value, index) {
                            newApiData[value] = response[index].resource ? response[index].resource : response[index];
                        });
                        $scope.apiData = newApiData;
                    },
                    function (error) {
                        var msg = 'To use the Admins tab your role must allow GET access to system/admin/*. To create, update, or delete admins you need POST, PUT, DELETE access to /system/admin/*.';

                        if (error && error.error && (error.error.code === 401 || error.error.code === 403)) {
                            $location.url('/home');
                        }

                        var messageOptions = {
                            module: 'Admins',
                            provider: 'dreamfactory',
                            type: 'error',
                            message: msg
                        };
                        dfNotify.error(messageOptions);
                    }
                ).finally(
                    function () {
                        $scope.dataLoading = false;
                    }
                );
            };

            $scope.loadTabData();
        }])

    .directive('dfAdminDetails', ['INSTANCE_URL', 'MOD_ADMIN_ASSET_PATH', 'dfApplicationData', 'dfNotify', 'dfObjectService', '$http', '$cookies', 'UserDataService', '$cookieStore', 'SystemConfigDataService', function (INSTANCE_URL, MOD_ADMIN_ASSET_PATH, dfApplicationData, dfNotify, dfObjectService, $http, $cookies, UserDataService, $cookieStore, SystemConfigDataService) {

        return {

            restrict: 'E',
            scope: {
                adminData: '=?',
                newAdmin: '=?'
            },
            templateUrl: MOD_ADMIN_ASSET_PATH + 'views/df-admin-details.html',
            link: function (scope, elem, attrs) {

                var Admin = function  (adminData) {

                    var _admin = {
                        name: null,
                        first_name: null,
                        last_name: null,
                        email: null,
                        phone: null,
                        confirmed: false,
                        is_active: true,
                        user_source: 0,
                        user_data: [],
                        password: null,
                        lookup_by_user_id: []
                    };

                    adminData = adminData || _admin;

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: angular.copy(adminData),
                        recordCopy: angular.copy(adminData)
                    }
                };

                scope.loginAttribute = 'email';
                var systemConfig = SystemConfigDataService.getSystemConfig();
                if (systemConfig && systemConfig.authentication && systemConfig.authentication.hasOwnProperty('login_attribute')) {
                    scope.loginAttribute = systemConfig.authentication.login_attribute;
                }

                scope.admin = null;

                if (scope.newAdmin) {
                    scope.admin = new Admin();
                }

                scope.sendEmailOnCreate = false;

                scope._validateData = function () {

                    if (scope.newAdmin) {
                        if (!scope.setPassword && !scope.sendEmailOnCreate) {
                            dfNotify.error({
                                module: 'Users',
                                type: 'error',
                                message: 'Please select email invite or set password.'
                            });
                            return false;
                        }
                        if (scope.setPassword && scope.sendEmailOnCreate) {
                            dfNotify.error({
                                module: 'Users',
                                type: 'error',
                                message: 'Please select email invite or set password, but not both.'
                            });
                            return false;
                        }
                    }
                    if (scope.setPassword && scope.password.new_password !== scope.password.verify_password) {
                        dfNotify.error({
                            module: 'Admins',
                            type: 'error',
                            message: 'Passwords do not match.'
                        });
                        return false;
                    }
                    return true;
                };

                // PUBLIC API

                scope.saveAdmin = function () {

                    if (!scope._validateData()) {
                        return;
                    }

                    if (scope.newAdmin) {
                        scope._saveAdmin();
                    }
                    else {
                        scope._updateAdmin();
                    }
                };

                scope.cancelEditor = function () {

                    // merge data from UI into current edit record
                    scope._prepareAdminData();

                    // then compare to original edit record
                    if (!dfObjectService.compareObjectsAsJson(scope.admin.record, scope.admin.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return;
                        }
                    }

                    scope.closeEditor();
                };


                // PRIVATE API

                scope.closeEditor = function() {

                    // same object as currentEditAdmin used in ng-show
                    scope.adminData = null;

                    scope.admin = new Admin();
                    scope.lookupKeys = [];

                    // This func comes from the dfSetUserPassword directive
                    // which is stored in dfutility.
                    scope._resetUserPasswordForm();

                    // force to manage view
                    scope.$emit('sidebar-nav:view:reset');
                };

                scope._prepareAdminData = function () {

                    scope._preparePasswordData();
                    scope._prepareLookupKeyData();
                };

                // COMPLEX IMPLEMENTATION

                scope._saveAdmin = function () {

                    // merge data from UI into current edit record
                    scope._prepareAdminData();

                    if (!scope.isAllTabsSelected) scope.admin.record.access_by_tabs = scope.accessByTabs;
                    else scope.admin.record.access_by_tabs = null;

                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'lookup_by_user_id',
                            send_invite: scope.sendEmailOnCreate
                        },
                        data: scope.admin.record
                    };

                    dfApplicationData.saveApiData('admin', requestDataObj).$promise.then(

                        function(result) {

                            var messageOptions = {
                                module: 'Admins',
                                provider: 'dreamfactory',
                                type: 'success',
                                message: 'Admin saved successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.closeEditor();
                        },
                        function (reject) {

                            var messageOptions = {
                                module: 'Api Error',
                                provider: 'dreamfactory',
                                type: 'error',
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function() {

                        }
                    );
                };

                scope._updateAdmin = function () {

                    // merge data from UI into current edit record
                    scope._prepareAdminData();

                    // instead of specifing params here maybe we should
                    // set dfApplicationData to pull from the prefs to set.
                    // For now we'll leave it here.
                    var requestDataObj = {

                        params: {
                            fields: '*',
                            related: 'lookup_by_user_id'
                        },
                        data: scope.admin.record
                    };

                    dfApplicationData.updateApiData('admin', requestDataObj).$promise.then(

                        function (result) {

                            // update token if email was changed
                            if (result.session_token) {
                                var existingUser = UserDataService.getCurrentUser();
                                existingUser.session_token = result.session_token;
                                UserDataService.setCurrentUser(existingUser);
                            }

                            var messageOptions = {
                                module: 'Admins',
                                provider: 'dreamfactory',
                                type: 'success',
                                message: 'Admin updated successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.closeEditor();
                        },
                        function (reject) {

                            var messageOptions = {
                                module: 'Api Error',
                                provider: 'dreamfactory',
                                type: 'error',
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function() {

                        }
                    );
                };

                // WATCHERS

                // this fires when a record is selected for editing
                // adminData is passed in to the directive as data-admin-data
                var watchAdminData = scope.$watch('adminData', function (newValue, oldValue) {

                    if (newValue) {
                        scope.admin = new Admin(newValue);

                        // get admin session data where role_id is
                        $http.get(INSTANCE_URL.url + '/system/admin/' + scope.admin.record.id + '/session?related=user_to_app_to_role_by_user_id').then(
                            // success method
                            function (result) {
                                if(result.data.user_to_app_to_role_by_user_id.length > 0) {
                                    scope.adminRoleId = result.data.user_to_app_to_role_by_user_id[0].role_id;
                                }
                            },
                            // failure method
                            function (result){
                                scope.adminRoleId = null;
                                console.error(result);
                            }
                        );
                    }
                });

                var watchPassword = scope.$watch('setPassword', function (newValue) {

                    if (newValue) {

                        scope.password = {
                            new_password: '',
                            verify_password: ''
                        };
                    }
                    else {
                        scope.password = null;
                        scope.identical = true;
                    }
                });

                // MESSAGES

                scope.$on('$destroy', function(e) {

                    watchAdminData();
                    watchPassword();
                });

                // HELP

                scope.dfHelp = {
                    adminConfirmation: {
                        title: "Admin Confirmation Info",
                        text: 'Is the admin confirmed? You can send an invite to unconfirmed admins.'
                    },
                    adminLookupKeys: {
                        title: 'Admin Lookup Keys Info',
                        text: 'The DreamFactory administrator can create any number of "key value" pairs attached to a admin. ' +
                            'The key values are automatically substituted on the server. For example, key names can ' +
                            'be used in the username and password fields required to hook up a SQL or NoSQL database. ' +
                            'They can also be used in Email Templates or as parameters for external REST services. ' +
                            'Any Lookup Key can be marked as private, and in this case the key value is securely ' +
                            'encrypted on the server and is no longer accessible through the platform interface. ' +
                            'Lookup keys for service configuration and credentials must be made private.'
                    }
                };
            }
        };
    }])

    .directive('dfConfirmAdmin', ['INSTANCE_URL', 'MOD_ADMIN_ASSET_PATH', '$http', 'SystemConfigDataService', 'dfNotify', function(INSTANCE_URL, MOD_ADMIN_ASSET_PATH, $http, SystemConfigDataService, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_ADMIN_ASSET_PATH + 'views/df-input-confirm-admin.html',
            link: function(scope, elem, attrs) {


                scope.sendEmailOnCreate = false;

                scope.invite = function() {

                    $http({
                        url: INSTANCE_URL.url + '/system/admin/' + scope.admin.record.id,
                        method: 'PATCH',
                        params: {
                            send_invite: true
                        }
                    }).then(
                        function(result) {

                            var messageOptions = {

                                module: 'Admins',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Admin invite has been sent.'
                            };

                            dfNotify.success(messageOptions);
                        },
                        function (reject) {

                            var messageOptions = {
                                module: 'Admins',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject.data
                            };

                            dfNotify.error(messageOptions);
                        }
                    );
                };
            }
        };
    }])

    .directive('dfAccessByTabs', ['INSTANCE_URL', 'MOD_ADMIN_ASSET_PATH', function (INSTANCE_URL, MOD_ADMIN_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_ADMIN_ASSET_PATH + 'views/df-access-by-tabs.html',
            link: function (scope, elem, attrs) {
                scope.tabs = [
                    {name: 'apps', title: "Apps", checked: true},
                    {name: 'admins', title: "Admins", checked: true},
                    {name: 'user', title: "User", checked: true},
                    {name: 'services', title: "Services", checked: true},
                    {name: 'apidocs', title: "API Docs", checked: true},
                    {name: 'schema', title: "Schema", checked: true},
                    {name: 'data', title: "Data", checked: true},
                    {name: 'files', title: "Files", checked: true},
                    {name: 'scripts', title: "Scripts", checked: true},
                    {name: 'config', title: "Config", checked: true},
                    {name: 'packages', title: "Packages", checked: true},
                    {name: 'limits', title: "Limits", checked: true}
                ];
                scope.accessByTabs = [
                    'apps',
                    'admins',
                    'user',
                    'services',
                    'apidocs',
                    'schema',
                    'data',
                    'files',
                    'scripts',
                    'config',
                    'packages',
                    'limits'
                ];
                scope.isAllTabsSelected = scope.accessByTabs.length === scope.tabs.length;

                scope.selectTab = function (tab) {
                    if (tab.checked) {
                        if (!scope.accessByTabs.includes(tab.name)) {
                            scope.accessByTabs.push(tab.name);
                        }
                    } else {
                        var toDel = scope.accessByTabs.indexOf(tab.name);
                        scope.accessByTabs.splice(toDel, 1);
                    }
                    scope.isAllTabsSelected = scope.accessByTabs.length === scope.tabs.length;
                };

                scope.selectAllTabs = function (isSelected) {
                    var arr = [];
                    scope.isAllTabsSelected = isSelected;
                    if (scope.isAllTabsSelected) {
                        scope.tabs.forEach(function (tab) {
                            tab.checked = true;
                            arr.push(tab.name)
                        });
                        scope.accessByTabs = arr;
                    } else {
                        scope.tabs.forEach(function (tab) {
                            tab.checked = false;
                        });
                        scope.accessByTabs = [];
                    }
                };
            }
        };
    }])

    .directive('dfAdminLookupKeys', ['MOD_ADMIN_ASSET_PATH', function (MOD_ADMIN_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_ADMIN_ASSET_PATH + 'views/df-input-lookup-keys.html',
            link: function(scope, elem, attrs) {

                var LookupKey = function (lookupKeyData) {

                    var _new = {
                        name: "",
                        value: "",
                        private: false,
                        allow_admin_update: false
                    };

                    return {
                        __dfUI: {
                            unique: true
                        },
                        record: angular.copy(lookupKeyData || _new),
                        recordCopy: angular.copy(lookupKeyData || _new)
                    };
                };

                scope.lookupKeys = [];

                scope.sameKeys = [];


                // PUBLIC API

                scope.newKey = function () {

                    scope._newKey();
                };

                scope.removeKey = function(index) {

                    scope._removeKey(index);
                };


                // PRIVATE API

                scope._isUniqueKey = function () {

                    scope.sameKeys = [];

                    angular.forEach(scope.lookupKeys, function(value, index) {
                        angular.forEach(scope.lookupKeys, function (_value, _index) {

                            if (index === _index) return;

                            if (value.record.name === _value.record.name) {
                                scope.sameKeys.push(value);
                            }
                        });
                    });
                };

                scope._preparePasswordData = function () {

                    if (scope.setPassword) {
                        // set password in user record
                        scope.admin.record.password = scope.password.new_password;
                    } else {
                        // delete password from user record
                        if (scope.admin.record.password) {
                            delete scope.admin.record.password;
                        }
                    }
                };

                scope._prepareLookupKeyData = function () {

                    var tempArr = [];

                    angular.forEach(scope.lookupKeys, function (lk) {

                        tempArr.push(lk.record);
                    });

                    scope.admin.record.lookup_by_user_id = tempArr;
                };


                // COMPLEX IMPLEMENTATION

                scope._newKey = function () {

                    scope.lookupKeys.push(new LookupKey());
                };

                scope._removeKey = function (index) {
                    if (scope.lookupKeys[index].record.user_id !== undefined) {
                        scope.lookupKeys[index].record.user_id = null;
                    }
                    else {
                        scope.lookupKeys.splice(index, 1);
                    }
                };

                // WATCHERS AND INIT

                var watchAdmin = scope.$watch('admin', function (newValue, oldValue) {

                    if (!newValue) {
                        return;
                    }

                    if (newValue.record.hasOwnProperty('lookup_by_user_id') && newValue.record.lookup_by_user_id.length > 0) {

                        scope.lookupKeys = [];

                        angular.forEach(newValue.record.lookup_by_user_id, function (lookupKeyData) {

                            scope.lookupKeys.push(new LookupKey(lookupKeyData))
                        });
                    }
                    else {
                        scope.lookupKeys = [];
                    }
                });

                var watchSameKeys = scope.$watch('sameKeys', function (newValue, oldValue) {

                    if (newValue.length === 0) {

                        angular.forEach(scope.lookupKeys, function (lk) {

                            lk.__dfUI.unique = true;
                        });

                        return;
                    }

                    angular.forEach(scope.lookupKeys, function (lk) {

                        angular.forEach(newValue, function (_lk) {

                            if (lk.record.name === _lk.record.name) {
                                lk.__dfUI.unique = false;
                            } else {
                                lk.__dfUI.unique = true;
                            }
                        });
                    });
                });

                var watchLookupKeys = scope.$watchCollection('lookupKeys', function (newValue, oldValue) {

                    if (!newValue) {
                        return;
                    }

                    // we added or removed a key
                    // check if unique
                    scope._isUniqueKey();
                });


                // MESSAGES
                scope.$on('$destroy', function (e) {
                    watchAdmin();
                    watchSameKeys();
                });
            }
        };
    }])

    .directive('dfManageAdmins', ['$rootScope', 'MOD_ADMIN_ASSET_PATH', 'dfApplicationData', 'dfNotify', '$location', function ($rootScope, MOD_ADMIN_ASSET_PATH, dfApplicationData, dfNotify, $location) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_ADMIN_ASSET_PATH + 'views/df-manage-admins.html',
            link: function (scope, elem, attrs) {


                var ManagedAdmin = function (adminData) {
                    if(adminData) {
                        adminData.confirm_msg = 'N/A';
                        if(adminData.confirmed === true){
                            adminData.confirm_msg = 'Confirmed';
                        } else if (adminData.confirmed === false){
                            adminData.confirm_msg = 'Pending';
                        }

                        if (adminData.expired === true){
                            adminData.confirm_msg = 'Expired';
                        }
                    }
                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: adminData
                    };
                };

                // For file upload on import admins;
                // there is a scope issue where the fileUpload directive
                // accesses import admins parent scope.  It's not as bad as it sounds
                scope.uploadFile = null;

                scope.admins = null;

                scope.currentEditAdmin = null;

                scope.fields = [
                    {
                        name: 'id',
                        label: 'ID',
                        active: true
                    },
                    {
                        name: 'email',
                        label: 'Email',
                        active: true
                    },
                    {
                        name: 'name',
                        label: 'Display Name',
                        active: true
                    },
                    {
                        name: 'first_name',
                        label: 'First Name',
                        active: true
                    },
                    {
                        name: 'last_name',
                        label: 'Last Name',
                        active: true
                    },
                    {
                        name: 'is_active',
                        label: 'Active',
                        active: true
                    },
                    {
                        name: 'confirmed',
                        label: 'Registration',
                        active: true
                    }
                ];

                scope.order = {
                    orderBy: 'id',
                    orderByReverse: false
                };

                scope.selectedAdmins = [];


                // PUBLIC API

                scope.editAdmin = function (admin) {

                    scope._editAdmin(admin);
                };

                scope.deleteAdmin = function (admin) {

                    if (dfNotify.confirm("Delete " + admin.record.name + "?")) {
                        scope._deleteAdmin(admin);
                    }
                };

                scope.deleteSelectedAdmins = function () {

                    if (dfNotify.confirm("Delete selected admins?")) {
                        scope._deleteSelectedAdmins();
                    }
                };

                scope.orderOnSelect = function (fieldObj) {

                    scope._orderOnSelect(fieldObj);
                };

                scope.setSelected = function (admin) {

                    scope._setSelected(admin);
                };

                // COMPLEX IMPLEMENTATION

                scope._editAdmin = function (admin) {

                    scope.currentEditAdmin = admin;
                };

                scope._deleteAdmin = function(admin) {

                    var requestDataObj = {
                        params: {
                            id: admin.record.id
                        }
                    };

                    dfApplicationData.deleteApiData('admin', requestDataObj).$promise.then(

                        function(result) {

                            // notify success
                            var messageOptions = {
                                module: 'Admins',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Admin successfully deleted.'
                            };

                            dfNotify.success(messageOptions);

                            // Was this admin previously selected before
                            // we decided to remove them individually
                            if (admin.__dfUI.selected) {

                                // This will remove the admin from the selected
                                // admin array
                                scope.setSelected(admin);
                            }

                            scope.$broadcast('toolbar:paginate:admin:delete');
                        },

                        function(reject) {

                            var messageOptions = {
                                module: 'Api Error',
                                provider: 'dreamfactory',
                                type: 'error',
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function() {

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

                scope._setSelected = function (admin) {

                    var i = 0;

                    while (i < scope.selectedAdmins.length) {

                        if (admin.record.id === scope.selectedAdmins[i]) {

                            admin.__dfUI.selected = false;
                            scope.selectedAdmins.splice(i, 1);
                            return;
                        }

                        i++;
                    }

                    admin.__dfUI.selected = true;
                    scope.selectedAdmins.push(admin.record.id);
                };

                scope._deleteSelectedAdmins = function () {

                    var requestDataObj = {
                        params: {
                            ids: scope.selectedAdmins.join(','),
                            rollback: true
                        }
                    };

                    dfApplicationData.deleteApiData('admin', requestDataObj).$promise.then(

                        function(result) {

                            var messageOptions = {
                                module: 'Admins',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Admins deleted successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.selectedAdmins = [];

                            scope.$broadcast('toolbar:paginate:admin:reset');
                        },

                        function(reject) {

                            var messageOptions = {
                                module: 'Api Error',
                                provider: 'dreamfactory',
                                type: 'error',
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
                var watchApiData = scope.$watchCollection(function() {

                    return dfApplicationData.getApiDataFromCache('admin');

                }, function (newValue, oldValue) {

                    var _admins = [];

                    if (newValue) {
                        angular.forEach(newValue, function (admin) {
                            _admins.push(new ManagedAdmin(admin));
                        });
                    }

                    scope.admins = _admins;
                });

                // MESSAGES

                scope.$on('$destroy', function (e) {

                    // Destroy watchers
                    watchApiData();
                    // when filter is changed the controller is reloaded and we get destroy event
                    // the reset event tells pagination engine to update based on filter
                    scope.$broadcast('toolbar:paginate:admin:reset');
                });
            }
        };
    }])

    .directive('dfAdminLoading', [function() {
      return {
        restrict: 'E',
        template: "<div class='col-lg-12' ng-if='dataLoading'><span style='display: block; width: 100%; text-align: center; color: #A0A0A0; font-size: 50px; margin-top: 100px'><i class='fa fa-refresh fa-spin'></i></div>"
      };
    }])

    .directive('dfImportAdmins', ['MOD_ADMIN_ASSET_PATH', 'INSTANCE_URL', '$http', 'dfTableEventService', 'dfNotify', function (MOD_ADMIN_ASSET_PATH, INSTANCE_URL, $http, dfTableEventService, dfNotify) {

        return {
            restrict: 'A',
            scope: false,
            replace: true,
            link: function (scope, elem, attrs) {

                scope.importType = null;
                scope.field = angular.element('#upload');

                scope.importAdmins = function () {
                    scope._importAdmins();
                };

                scope._importAdmins = function () {

                    scope.field.trigger('click');
                };

                scope._uploadFile = function (fileObj) {

                    return $http({
                        method: 'POST',
                        url: INSTANCE_URL.url + '/system/admin',
                        headers: {
                            "Content-Type" : scope.importType === 'csv' ? 'text/csv' : 'application/' + scope.importType
                        },
                        params: {},
                        data: fileObj
                    });
                };

                scope._checkFileType = function (fileObj) {

                    var extension = fileObj.name.split('.');

                    extension = extension[extension.length -1];

                    var value = false;

                    switch(extension) {

                        case 'csv':
                        case 'json':
                        case 'xml':
                            scope.importType = extension;
                            value = true;
                            break;

                        default:
                            value = false;
                    }

                    return value;
                };

                scope.$watch('uploadFile', function (newValue, oldValue) {

                    if (!newValue) {
                        return false;
                    }

                    newValue = scope.uploadFile;

                    if (!scope._checkFileType(newValue)) {

                        scope.uploadFile = null;

                        var messageOptions = {
                            module: 'Api Error',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: 'Acceptable file formats are csv, json, and xml.'
                        };

                        dfNotify.error(messageOptions);

                        return false;
                    }

                    scope._uploadFile(newValue).then(

                        function (result) {

                            scope.importType = null;
                            scope.uploadFile = null;

                            $('#upload').val('');

                            var messageOptions = {
                                module: 'Admins',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Admins imported successfully.'
                            };
                            dfNotify.success(messageOptions);

                            scope.$broadcast('toolbar:paginate:admin:reset');
                        },
                        function (reject) {

                            scope.importType = null;
                            scope.uploadFile = null;

                            $('#upload').val('');

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);

                            scope.$broadcast('toolbar:paginate:admin:reset');
                        }
                    );
                });
            }
        };
    }])

    .directive('dfExportAdmins', ['MOD_ADMIN_ASSET_PATH', 'INSTANCE_URL', 'UserDataService', '$http', '$window', 'APP_API_KEY', function (MOD_ADMIN_ASSET_PATH, INSTANCE_URL, UserDataService, $http, $window, APP_API_KEY) {

        return {

            restrict: 'A',
            scope: false,
            replace: true,
            link: function (scope, elem, attrs) {

                scope.fileFormatStr = null;

                scope.exportAdmins = function(fileFormatStr) {
                    scope._exportAdmins(fileFormatStr);
                };

                scope._getFile = function (urlStr) {

                    return $http({
                        method: 'GET',
                        url: urlStr
                    });
                };

                scope._exportAdmins = function (fileFormatStr) {

                    if (fileFormatStr === 'csv' || fileFormatStr === 'json' || fileFormatStr === 'xml' ) {

                        scope.fileFormatStr = fileFormatStr;

                        var params = 'file=admin.' + scope.fileFormatStr + '&api_key=' + APP_API_KEY;
                        var currentUser = UserDataService.getCurrentUser();
                        if (currentUser && currentUser.session_token) {
                            params += '&session_token=' + currentUser.session_token;
                        }

                        // Jason's method to make it work.  He doesn't check for bad response.
                        // I'll look into angularJS's $location to fix this.
                        $window.location.href= INSTANCE_URL.url + '/system/admin?' + params;
                    }
                };
            }
        };
    }]);
