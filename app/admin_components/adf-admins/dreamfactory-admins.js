/**
 * This file is part of DreamFactory (tm)
 *
 * http://github.com/dreamfactorysoftware/dreamfactory
 * Copyright 2012-2014 DreamFactory Software, Inc. <support@dreamfactory.com>
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

    .controller('AdminsCtrl', ['$scope', 'dfApplicationData', 'dfNotify',
        function($scope, dfApplicationData, dfNotify){

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

            // Set empty section options
            $scope.emptySectionOptions = {
                title: 'You have no Admins!',
                text: 'Click the button below to get started adding admins.  You can always create new admins by clicking the tab located in the section menu to the left.',
                buttonText: 'Create An Admin!',
                viewLink: $scope.links[1]
            };
        }])

    .directive('dfAdminDetails', ['MOD_ADMIN_ASSET_PATH', 'dfApplicationData', 'dfApplicationPrefs', 'dfNotify', 'dfObjectService', function(MOD_ADMIN_ASSET_PATH, dfApplicationData, dfApplicationPrefs, dfNotify, dfObjectService) {

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
                        user_lookup_by_user_id: []
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


                scope.admin = null;

                if (scope.newAdmin) {
                    scope.admin = new Admin();
                }

                scope.sendEmailOnCreate = false;


                // PUBLIC API
                scope.saveAdmin = function () {

                    if (scope.newAdmin) {

                        scope._saveAdmin();
                    }
                    else {
                        scope._updateAdmin();
                    }

                };

                scope.closeAdmin = function () {

                    scope._closeAdmin();
                }


                // PRIVATE API


                scope._saveAdminToServer = function (requestDataObj) {

                    return dfApplicationData.saveApiData('admin', requestDataObj).$promise;
                };

                scope._updateAdminToServer = function (requestDataObj) {

                    return dfApplicationData.updateApiData('admin', requestDataObj).$promise;
                };

                scope._resetAdminDetails = function() {

                    if (scope.newAdmin) {
                        scope.admin = new Admin();
                    }
                    else {

                        scope.adminData = null;
                    }
                };

                scope._prepareAdminData = function () {

                    scope._prepareLookupKeyData();

                }


                // COMPLEX IMPLEMENTATION
                scope._saveAdmin = function () {

                    // perform some checks on app data
                    scope._prepareAdminData();

                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'user_lookup_by_user_id',
                            send_invite: scope.sendEmailOnCreate
                        },
                        data: scope.admin.record
                    };


                    scope._saveAdminToServer(requestDataObj).then(
                        function(result) {

                            var messageOptions = {
                                module: 'Admins',
                                provider: 'dreamfactory',
                                type: 'success',
                                message: 'Admin saved successfully.'
                            }

                            dfNotify.success(messageOptions);

                            // This func comes from the SetAdminPassword directive
                            // which is stored in dfutility.
                            scope._resetUserPasswordForm();

                            scope.admin = new Admin();

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

                                // console.log('Admin save finally');
                            }
                        )
                };

                scope._updateAdmin = function () {

                    // perform some checks on app data
                    scope._prepareAdminData();

                    // instead of specifing params here maybe we should
                    // set dfApplicationData to pull from the prefs to set.
                    // For now we'll leave it here.
                    var requestDataObj = {

                        params: {
                            fields: '*',
                            related: 'user_lookup_by_user_id'
                        },
                        data: scope.admin.record
                    };


                    scope._updateAdminToServer(requestDataObj).then(
                        function (result) {

                            var messageOptions = {
                                module: 'Admins',
                                provider: 'dreamfactory',
                                type: 'success',
                                message: 'Admin updated successfully.'
                            }

                            dfNotify.success(messageOptions);

                            // This func comes from the SetAdminPassword directive
                            // which is stored in dfutility.
                            scope._resetUserPasswordForm();

                            scope.admin = new Admin(result);

                            if (dfApplicationPrefs.getPrefs().sections.admin.autoClose) {

                                scope.closeAdmin();
                            }

                            scope.lookupKeys = scope.lookupKeys.filter(function (key) {
                                return key.record.user_id !== null;
                            });

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

                            // console.log('Admin save finally');
                        }
                    )


                };

                scope._closeAdmin = function () {

                    // perform some checks on app data
                    scope._prepareAdminData();

                    if (!dfObjectService.compareObjectsAsJson(scope.admin.record, scope.admin.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return false;
                        }

                    }

                    scope._resetAdminDetails();
                };


                // WATCHERS

                var watchAdminData = scope.$watch('adminData', function (newValue, oldValue) {

                    if (!newValue) return false;

                    scope.admin = new Admin(newValue);

                });


                // MESSAGES

                scope.$on('$destroy', function(e) {

                    watchAdminData();
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
                }
            }
        }
    }])

    .directive('dfConfirmAdmin', ['INSTANCE_URL', 'MOD_ADMIN_ASSET_PATH', '$http', 'SystemConfigDataService', 'dfNotify', function(INSTANCE_URL, MOD_ADMIN_ASSET_PATH, $http, SystemConfigDataService, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_ADMIN_ASSET_PATH + 'views/df-input-confirm-admin.html',
            link: function(scope, elem, attrs) {


                scope.inviteAdminOnCreate = false;

                scope.systemConfig = SystemConfigDataService.getSystemConfig();

                scope.invite = function() {

                    scope._invite(scope.admin.record.id);
                };

                scope._sendInvite = function (adminId) {

                    return  $http({
                        url: INSTANCE_URL + '/api/v2/system/admin',
                        method: 'PATCH',
                        params: {
                            send_invite: true
                        },
                        data: {
                            id: adminId
                        }
                    })
                };

                scope._invite = function (adminId) {

                    scope._sendInvite(adminId).then(
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
                            }

                            dfNotify.error(messageOptions);

                        }
                    );
                };

                scope._callSendInvite = function (admin) {

                    if (scope.inviteAdminOnCreate) {
                        scope._invite(admin.id);
                    }
                };


                // @TODO: Send invite automatically

            }
        }
    }])

    .directive('dfAdminLookupKeys', ['MOD_ADMIN_ASSET_PATH', 'dfStringService', function(MOD_ADMIN_ASSET_PATH, dfStringService) {

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
                }

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
                        })
                    });

                }

                scope._prepareLookupKeyData = function () {

                    var tempArr = [];

                    angular.forEach(scope.lookupKeys, function (lk) {

                        tempArr.push(lk.record);
                    });

                    scope.admin.record.user_lookup_by_user_id = tempArr;
                };



                // COMPLEX IMPLEMENTATION
                scope._newKey = function () {

                    scope.lookupKeys.push(new LookupKey());

                };

                scope._removeKey = function (index) {
                    if (scope.lookupKeys[index].record.user_id !== undefined) 
                        scope.lookupKeys[index].record.user_id = null;
                    else 
                        scope.lookupKeys.splice(index, 1);
                };



                // WATCHERS AND INIT
                var watchAdmin = scope.$watch('admin', function (newValue, oldValue) {

                    if (!newValue) return;

                    if (newValue.record.hasOwnProperty('user_lookup_by_user_id') && newValue.record.user_lookup_by_user_id.length > 0) {

                        scope.lookupKeys = [];

                        angular.forEach(newValue.record.user_lookup_by_user_id, function (lookupKeyData) {

                            scope.lookupKeys.push(new LookupKey(lookupKeyData))

                        });
                    }
                });

                var watchSameKeys = scope.$watch('sameKeys', function (newValue, oldValue) {


                    if (newValue.length === 0) {

                        angular.forEach(scope.lookupKeys, function (lk) {

                            lk.__dfUI.unique = true;

                        })

                        return;
                    }


                    angular.forEach(scope.lookupKeys, function (lk) {

                        angular.forEach(newValue, function (_lk) {

                            if (lk.record.name === _lk.record.name) {
                                lk.__dfUI.unique = false;


                            }else {
                                lk.__dfUI.unique = true;
                            }
                        })
                    })
                })

                var watchLookupKeys = scope.$watchCollection('lookupKeys', function (newValue, oldValue) {

                    if (!newValue) return;

                    // we added or removed a key
                    // check if unique
                    scope._isUniqueKey();


                })


                // MESSAGES
                scope.$on('$destroy', function (e) {
                    watchAdmin();
                    watchSameKeys();
                });

            }
        }
    }])

    .directive('dfManageAdmins', ['MOD_ADMIN_ASSET_PATH', 'dfApplicationData', 'dfApplicationPrefs', 'dfNotify', function (MOD_ADMIN_ASSET_PATH, dfApplicationData, dfApplicationPrefs, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_ADMIN_ASSET_PATH + 'views/df-manage-admins.html',
            link: function (scope, elem, attrs) {


                var ManagedAdmin = function (adminData) {

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: adminData
                    }
                };

                // For file upload on import admins;
                // there is a scope issue where the fileUpload directive
                // accesses import admins parent scope.  It's not as bad as it sounds
                scope.uploadFile = null;

                scope.currentViewMode = dfApplicationPrefs.getPrefs().sections.admin.manageViewMode;

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
                        label: 'Confirmed',
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


                // PRIVATE API

                scope._deleteFromServer = function (requestDataObj) {

                    return dfApplicationData.deleteApiData('admin', requestDataObj).$promise;
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


                    scope._deleteFromServer(requestDataObj).then(
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

                scope._setSelected = function (admin) {


                    var i = 0;

                    while (i < scope.selectedAdmins.length) {

                        if (admin.record.id === scope.selectedAdmins[i]) {

                            admin.__dfUI.selected = false;
                            scope.selectedAdmins.splice(i, 1);
                            return;
                        }

                        i++
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


                    scope._deleteFromServer(requestDataObj).then(

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
                            function() {

                                // console.log('Delete Admins Finally');
                            }
                        )
                };



                // WATCHERS

                var watchAdmins = scope.$watch('admins', function (newValue, oldValue) {

                    if (newValue == null) {

                        var _admins = [];

                        angular.forEach(dfApplicationData.getApiData('admin'), function (admin) {

                            _admins.push(new ManagedAdmin(admin));
                        });

                        scope.admins = _admins;
                        return;
                    }

                });

                var watchApiData = scope.$watchCollection(function() {

                    return dfApplicationData.getApiData('admin');

                }, function (newValue, oldValue) {

                    var _admins = [];

                    angular.forEach(dfApplicationData.getApiData('admin'), function (admin) {

                        _admins.push(new ManagedAdmin(admin));
                    });

                    scope.admins = _admins;
                    return;

                });


                // MESSAGES

                scope.$on('toolbar:paginate:admin:update', function (e) {

                    var _admins = [];

                    angular.forEach(dfApplicationData.getApiData('admin'), function (admin) {

                        var _admin = new ManagedAdmin(admin);

                        var i = 0;

                        while (i < scope.selectedAdmins.length) {

                            if (scope.selectedAdmins[i] === _admin.record.id) {

                                _admin.__dfUI.selected = true;
                                break;
                            }

                            i++
                        }

                        _admins.push(_admin);
                    });

                    scope.admins = _admins;
                });

                scope.$on('$destroy', function(e) {
                    watchAdmins();
                    scope.$broadcast('toolbar:paginate:admin:reset');
                })

            }
        }
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
                        url: INSTANCE_URL + '/api/v2/system/admin',
                        headers: {
                            "Content-Type" : scope.importType === 'csv' ? 'text/csv' : 'application/' + scope.importType
                        },
                        params: {},
                        data: fileObj
                    })
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

                    if (!newValue) return false;

                    newValue = scope.uploadFile;

                    if (!scope._checkFileType(newValue)) {

                        scope.uploadFile = null;


                        var messageOptions = {
                            module: 'Api Error',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: 'Acceptable file formats are csv, json, and xml.'
                        }

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
                            }
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
                            }

                            dfNotify.error(messageOptions);

                            scope.$broadcast('toolbar:paginate:admin:reset');
                        }

                    ).finally(

                        function() {



                        },
                        function () {



                        }
                    )
                });
            }
        }
    }])

    .directive('dfExportAdmins', ['MOD_ADMIN_ASSET_PATH', 'INSTANCE_URL', '$cookies', '$http', '$window', function (MOD_ADMIN_ASSET_PATH, INSTANCE_URL, $cookies, $http, $window) {

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
                    })
                };

                scope._exportAdmins = function (fileFormatStr) {

                    if (fileFormatStr === 'csv' || fileFormatStr === 'json' || fileFormatStr === 'xml' ) {

                        scope.fileFormatStr = fileFormatStr;

                        var params = 'file=admin.' + scope.fileFormatStr +'&session_token='+$cookies.PHPSESSID;


                        // Jason's method to make it work.  He doesn't check for bad response.
                        // I'll look into angularJS's $location to fix this.
                        $window.location.href= INSTANCE_URL + '/api/v2/system/admin?' + params;
                    }
                }
            }
        }
    }])

	// allows admin to set password with verify functionality
	.directive('dfSetAdminPassword', ['MOD_ADMIN_ASSET_PATH', '$compile', 'dfStringService', function(MOD_ADMIN_ASSET_PATH, $compile, dfStringService) {

				   return {
					   restrict: 'E',
					   scope: false,
					   templateUrl: MOD_ADMIN_ASSET_PATH + 'views/df-input-manual-password.html',
					   link: function(scope, elem, attrs) {

						   scope.verifyPassword = '';

						   scope.updatePassword = false;
						   scope.setPassword = false;
						   scope.identical = true;

						   // Test if our entered passwords are identical
						   scope._verifyPassword = function (password) {

							   // did we pass a password to check against
							   // if not...assume the existence of a user object with a password prop
							   // this is terrible.  Do it better later.
							   password = password || scope.admin.record.password;

							   scope.identical = dfStringService.areIdentical(password, scope.verifyPassword);
						   };

						   scope._resetUserPasswordForm = function () {

							   scope.verifyPassword = '';
							   scope.setPassword = false;
						   }


						   // WATCHERS AND INIT
						   var watchSetPassword = scope.$watch('setPassword', function (newValue, oldValue) {

							   if (!newValue) return false;
							   var html = '';

							   if (!scope.updatePassword) {
								   html +=  '<div class="form-group" data-ng-class="{\'has-error\' : identical === false}">' +
											'<input type="password" id="password" name="password" placeholder="Enter Password" data-ng-model="admin.record.password" class="form-control" data-ng-required="true" data-ng-keyup="_verifyPassword()" >' +
											'</div>' +
											'<div class="form-group" data-ng-class="{\'has-error\' : identical === false}">' +
											'<input type="password" id="verify-password" name="verify-password" placeholder="Verify Password" data-ng-model="verifyPassword" class="form-control" data-ng-required="true" data-ng-keyup="_verifyPassword()" >' +
											'</div>';
							   }
							   else {

								   html += '<div class="form-group">' +
										   '<input type="password" id="old-password" class="form-control" data-ng-model="password.old_password" placeholder="Enter Old Password" />' +
										   '</div>';

								   html +=  '<div class="form-group" data-ng-class="{\'has-error\' : identical === false}">' +
											'<input type="password" id="password" name="password" placeholder="Enter Password" data-ng-model="password.new_password" class="form-control" data-ng-required="true" data-ng-keyup="_verifyPassword(password.new_password)" >' +
											'</div>' +
											'<div class="form-group" data-ng-class="{\'has-error\' : identical === false}">' +
											'<input type="password" id="verify-password" name="verify-password" placeholder="Verify Password" data-ng-model="verifyPassword" class="form-control" data-ng-required="true" data-ng-keyup="_verifyPassword(password.new_password)" >' +
											'</div>';

							   }


							   var el = $compile(html)(scope);

							   angular.element('#set-password').append(el);
						   });


						   // MESSAGES
						   // Listen for userForm clear message
						   scope.$on('reset:user:form', function (e) {
							   scope._resetUserPasswordForm();
						   });

						   scope.$on('$destroy', function (e) {

							   watchSetPassword();
						   });
					   }
				   }
			   }])



