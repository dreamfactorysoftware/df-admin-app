'use strict';


angular.module('dfUsers', ['ngRoute', 'dfUtility', 'dfApplication', 'dfHelp'])
    .constant('MOD_USER_ROUTER_PATH', '/users')
    .constant('MOD_USER_ASSET_PATH', 'admin_components/adf-users/')
    .config(['$routeProvider', 'MOD_USER_ROUTER_PATH', 'MOD_USER_ASSET_PATH',
        function ($routeProvider, MOD_USER_ROUTER_PATH, MOD_USER_ASSET_PATH) {
            $routeProvider
                .when(MOD_USER_ROUTER_PATH, {
                    templateUrl: MOD_USER_ASSET_PATH + 'views/main.html',
                    controller: 'UsersCtrl',
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

    .controller('UsersCtrl', ['$scope', 'dfApplicationData', 'dfNotify',
        function($scope, dfApplicationData, dfNotify){

            $scope.$parent.title = 'Users';

            // Set module links
            $scope.links = [
                {
                    name: 'manage-users',
                    label: 'Manage',
                    path: 'manage-users'
                },
                {
                    name: 'create-user',
                    label: 'Create',
                    path: 'create-user'
                }

            ];

            // Set empty section options
            $scope.emptySectionOptions = {
                title: 'You have no Users!',
                text: 'Click the button below to get started adding users.  You can always create new users by clicking the tab located in the section menu to the left.',
                buttonText: 'Create A User!',
                viewLink: $scope.links[1]
            };
        }])

    .directive('dfUserDetails', ['MOD_USER_ASSET_PATH', 'dfApplicationData', 'dfApplicationPrefs', 'dfNotify', 'dfObjectService', function(MOD_USER_ASSET_PATH, dfApplicationData, dfApplicationPrefs, dfNotify, dfObjectService) {

        return {

            restrict: 'E',
            scope: {
                userData: '=?',
                newUser: '=?'
            },
            templateUrl: MOD_USER_ASSET_PATH + 'views/df-user-details.html',
            link: function (scope, elem, attrs) {


                var User = function  (userData) {

                    var _user = {
                        name: null,
                        first_name: null,
                        last_name: null,
                        email: null,
                        phone: null,
                        confirmed: false,
                        is_active: true,
                        default_app_id: null,
                        user_source: 0,
                        user_data: [],
                        password: null,
                        user_lookup_by_user_id: [],
                        user_to_app_to_role_by_user_id: []
                    };

                    userData = userData || _user;

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: angular.copy(userData),
                        recordCopy: angular.copy(userData)
                    }
                };


                scope.user = null;
                scope.roles = dfApplicationData.getApiData('role');
                scope.apps = dfApplicationData.getApiData('app');

                if (scope.newUser) {
                    scope.user = new User();
                }

                scope.sendEmailOnCreate = false;


                // PUBLIC API
                scope.saveUser = function () {

                    if (scope.newUser) {

                        scope._saveUser();
                    }
                    else {
                        scope._updateUser();
                    }

                };

                scope.closeUser = function () {

                    scope._closeUser();
                }


                // PRIVATE API


                scope._saveUserToServer = function (requestDataObj) {

                    return dfApplicationData.saveApiData('user', requestDataObj).$promise;
                };

                scope._updateUserToServer = function (requestDataObj) {

                    return dfApplicationData.updateApiData('user', requestDataObj).$promise;
                };

                scope._resetUserDetails = function() {

                    if (scope.newUser) {
                        scope.user = new User();
                    }
                    else {

                        scope.userData = null;
                    }
                };

                scope._prepareUserData = function () {

                    scope._prepareLookupKeyData();

                }


                // COMPLEX IMPLEMENTATION
                scope._saveUser = function () {

                    // perform some checks on app data
                    scope._prepareUserData();

                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'user_to_app_to_role_by_user_id,user_lookup_by_user_id',
                            send_invite: scope.sendEmailOnCreate
                        },
                        data: scope.user.record
                    };


                    scope._saveUserToServer(requestDataObj).then(
                        function(result) {

                            var messageOptions = {
                                module: 'Users',
                                provider: 'dreamfactory',
                                type: 'success',
                                message: 'User saved successfully.'
                            }

                            dfNotify.success(messageOptions);

                            // This func comes from the SetUserPassword directive
                            // which is stored in dfutility.
                            scope._resetUserPasswordForm();

                            scope.user = new User();

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

                                // console.log('User save finally');
                            }
                        )
                };

                scope._updateUser = function () {

                    // perform some checks on app data
                    scope._prepareUserData();

                    // instead of specifing params here maybe we should
                    // set dfApplicationData to pull from the prefs to set.
                    // For now we'll leave it here.
                    var requestDataObj = {

                        params: {
                            fields: '*',
                            related: 'user_to_app_to_role_by_user_id,user_lookup_by_user_id'
                        },
                        data: scope.user.record
                    };


                    scope._updateUserToServer(requestDataObj).then(
                        function (result) {

                            var messageOptions = {
                                module: 'Users',
                                provider: 'dreamfactory',
                                type: 'success',
                                message: 'User updated successfully.'
                            }

                            dfNotify.success(messageOptions);

                            // This func comes from the SetUserPassword directive
                            // which is stored in dfutility.
                            scope._resetUserPasswordForm();

                            scope.user = new User(result);

                            if (dfApplicationPrefs.getPrefs().sections.user.autoClose) {

                                scope.closeUser();
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

                            // console.log('User save finally');
                        }
                    )


                };

                scope._closeUser = function () {

                    // perform some checks on app data
                    scope._prepareUserData();

                    if (!dfObjectService.compareObjectsAsJson(scope.user.record, scope.user.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return false;
                        }

                    }

                    scope._resetUserDetails();
                };


                // WATCHERS

                var watchUserData = scope.$watch('userData', function (newValue, oldValue) {

                    if (!newValue) return false;

                    scope.user = new User(newValue);

                });


                // MESSAGES

                scope.$on('$destroy', function(e) {

                    watchUserData();
                });



                // HELP

                scope.dfHelp = {
                    userRole: {
                        title: 'User Role Info',
                        text: 'Roles provide a way to grant or deny access to specific applications and services ' +
                            'on a per-user basis. Each user who is not a system admin must be assigned a role. ' +
                            'Go to the Roles tab to create and manage roles.'
                    },
                    userConfirmation: {
                        title: "User Confirmation Info",
                        text: 'Is the user confirmed? You can send an invite to unconfirmed users.'
                    },
                    userLookupKeys: {
                        title: 'User Lookup Keys Info',
                        text: 'The DreamFactory administrator can create any number of "key value" pairs attached to a user. ' +
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

    .directive('dfConfirmUser', ['INSTANCE_URL', 'MOD_USER_ASSET_PATH', '$http', 'SystemConfigDataService', 'dfNotify', function(INSTANCE_URL, MOD_USER_ASSET_PATH, $http, SystemConfigDataService, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_USER_ASSET_PATH + 'views/df-input-confirm-user.html',
            link: function(scope, elem, attrs) {


                scope.inviteUserOnCreate = false;

                scope.systemConfig = SystemConfigDataService.getSystemConfig();

                scope.invite = function() {

                    scope._invite(scope.user.record.id);
                };

                scope._sendInvite = function (userId) {

                    return  $http({
                        url: INSTANCE_URL + '/api/v2/system/user/'+userId,
                        method: 'PATCH',
                        params: {
                            send_invite: true
                        }
                    })
                };

                scope._invite = function (userId) {

                    scope._sendInvite(userId).then(
                        function(result) {

                            var messageOptions = {

                                module: 'Users',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'User invite has been sent.'
                            };

                            dfNotify.success(messageOptions);


                        },
                        function (reject) {

                            var messageOptions = {
                                module: 'Users',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject.data.error.message
                            }

                            dfNotify.error(messageOptions);

                        }
                    );
                };

                scope._callSendInvite = function (user) {

                    if (scope.inviteUserOnCreate) {
                        scope._invite(user.id);
                    }
                };


                // @TODO: Send invite automatically

            }
        }
    }])

    .directive('dfUserRoles', ['MOD_USER_ASSET_PATH', function(MOD_USER_ASSET_PATH) {
        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_USER_ASSET_PATH + 'views/df-user-roles.html',
            link: function (scope, elem, attrs) {

                scope.roleToAppMap = {};

                scope.$watch('user', function () {
                    if (!scope.user) return;

                    scope.user.record.user_to_app_to_role_by_user_id.forEach(function (item) {
                        scope.roleToAppMap[item.app_id] = item.role_id;
                    });
                });

                scope.selectRole = function () {
                    Object.keys(scope.roleToAppMap).forEach(function (item) {
                        if (scope.roleToAppMap[item]) {
                            scope._updateRoleApp(item, scope.roleToAppMap[item]);
                        } else {
                            scope._removeRoleApp(item, scope.roleToAppMap[item])
                        }
                    });
                };

                scope._removeRoleApp = function (appId) {
                    scope.user.record.user_to_app_to_role_by_user_id = scope.user.record.user_to_app_to_role_by_user_id.filter(function (item) {
                        return item.app_id != appId;
                    });
                };

                scope._updateRoleApp = function (appId, roleId) {
                    var existing = scope.user.record.user_to_app_to_role_by_user_id.filter(function (item) {
                        return item.app_id == appId && item.role_id == roleId;
                    })[0];

                    if (existing) {
                        existing.app_id = appId;
                        existing.role_id = roleId;
                    } else {
                        scope.user.record.user_to_app_to_role_by_user_id.push({
                            app_id: appId,
                            role_id: roleId,
                            user_id: scope.user.record.id
                        });
                    }
                };
            }
        };
    }])

    .directive('dfUserLookupKeys', ['MOD_USER_ASSET_PATH', 'dfStringService', function(MOD_USER_ASSET_PATH, dfStringService) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_USER_ASSET_PATH + 'views/df-input-lookup-keys.html',
            link: function(scope, elem, attrs) {


                var LookupKey = function (lookupKeyData) {

                    var _new = {
                        name: "",
                        value: "",
                        private: false,
                        allow_user_update: false
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

                    scope.user.record.user_lookup_by_user_id = tempArr;
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
                var watchUser = scope.$watch('user', function (newValue, oldValue) {

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
                    watchUser();
                    watchSameKeys();
                });

            }
        }
    }])

    .directive('dfManageUsers', ['MOD_USER_ASSET_PATH', 'dfApplicationData', 'dfApplicationPrefs', 'dfNotify', function (MOD_USER_ASSET_PATH, dfApplicationData, dfApplicationPrefs, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_USER_ASSET_PATH + 'views/df-manage-users.html',
            link: function (scope, elem, attrs) {


                var ManagedUser = function (userData) {

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: userData
                    }
                };

                // For file upload on import users;
                // there is a scope issue where the fileUpload directive
                // accesses import users parent scope.  It's not as bad as it sounds
                scope.uploadFile = {
                    path: ''
                };

                scope.currentViewMode = dfApplicationPrefs.getPrefs().sections.user.manageViewMode;

                scope.users = null;

                scope.currentEditUser = null;

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

                scope.selectedUsers = [];

                scope.roles = dfApplicationData.getApiData('role');



                // PUBLIC API

                scope.editUser = function (user) {

                    scope._editUser(user);
                };

                scope.deleteUser = function (user) {

                    if (dfNotify.confirm("Delete " + user.record.name + "?")) {
                        scope._deleteUser(user);
                    }
                };

                scope.deleteSelectedUsers = function () {

                    if (dfNotify.confirm("Delete selected users?")) {
                        scope._deleteSelectedUsers();
                    }
                };

                scope.orderOnSelect = function (fieldObj) {

                    scope._orderOnSelect(fieldObj);
                };

                scope.setSelected = function (user) {

                    scope._setSelected(user);
                };


                // PRIVATE API

                scope._deleteFromServer = function (requestDataObj) {

                    return dfApplicationData.deleteApiData('user', requestDataObj).$promise;
                };

                scope._getUserRoleName = function (roleId) {

                    for (var i = 0; i < scope.roles.length; i++) {

                        if (roleId === scope.roles[i].id) {
                            return scope.roles[i].name;
                        }
                    }
                }



                // COMPLEX IMPLEMENTATION

                scope._editUser = function (user) {

                    scope.currentEditUser = user;
                };

                scope._deleteUser = function(user) {


                    var requestDataObj = {
                        params: {
                            id: user.record.id
                        }
                    };


                    scope._deleteFromServer(requestDataObj).then(
                        function(result) {

                            // notify success
                            var messageOptions = {
                                module: 'Users',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'User successfully deleted.'
                            };

                            dfNotify.success(messageOptions);

                            // Was this user previously selected before
                            // we decided to remove them individually
                            if (user.__dfUI.selected) {

                                // This will remove the user from the selected
                                // user array
                                scope.setSelected(user);

                            }

                            scope.$broadcast('toolbar:paginate:user:delete');
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

                scope._setSelected = function (user) {


                    var i = 0;

                    while (i < scope.selectedUsers.length) {

                        if (user.record.id === scope.selectedUsers[i]) {

                            user.__dfUI.selected = false;
                            scope.selectedUsers.splice(i, 1);
                            return;
                        }

                        i++
                    }

                    user.__dfUI.selected = true;
                    scope.selectedUsers.push(user.record.id);

                };

                scope._deleteSelectedUsers = function () {

                    var requestDataObj = {
                        params: {
                            ids: scope.selectedUsers.join(','),
                            rollback: true
                        }
                    };


                    scope._deleteFromServer(requestDataObj).then(

                        function(result) {

                            var messageOptions = {
                                module: 'Users',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Users deleted successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.selectedUsers = [];


                            scope.$broadcast('toolbar:paginate:user:reset');
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

                                // console.log('Delete Users Finally');
                            }
                        )
                };



                // WATCHERS

                var watchUsers = scope.$watch('users', function (newValue, oldValue) {

                    if (newValue == null) {

                        var _users = [];

                        angular.forEach(dfApplicationData.getApiData('user'), function (user) {

                            _users.push(new ManagedUser(user));
                        });

                        scope.users = _users;
                        return;
                    }

                });

                var watchApiData = scope.$watchCollection(function() {

                    return dfApplicationData.getApiData('user');

                }, function (newValue, oldValue) {

                    var _users = [];

                    angular.forEach(dfApplicationData.getApiData('user'), function (user) {

                        _users.push(new ManagedUser(user));
                    });

                    scope.users = _users;
                    return;

                });


                // MESSAGES

                scope.$on('toolbar:paginate:user:update', function (e) {

                    var _users = [];

                    angular.forEach(dfApplicationData.getApiData('user'), function (user) {

                        var _user = new ManagedUser(user);

                        var i = 0;

                        while (i < scope.selectedUsers.length) {

                            if (scope.selectedUsers[i] === _user.record.id) {

                                _user.__dfUI.selected = true;
                                break;
                            }

                            i++
                        }

                        _users.push(_user);
                    });

                    scope.users = _users;
                });

                scope.$on('$destroy', function(e) {
                    watchUsers();
                    scope.$broadcast('toolbar:paginate:user:reset');
                })

            }
        }
    }])

    .directive('dfImportUsers', ['MOD_USER_ASSET_PATH', 'INSTANCE_URL', '$http', 'dfTableEventService', 'dfNotify', function (MOD_USER_ASSET_PATH, INSTANCE_URL, $http, dfTableEventService, dfNotify) {

        return {
            restrict: 'A',
            scope: false,
            replace: true,
            link: function (scope, elem, attrs) {


                scope.importType = null;
                scope.field = angular.element('#upload');

                scope.importUsers = function () {
                    scope._importUsers();
                };

                scope._importUsers = function () {

                    scope.field.trigger('click');
                };

                scope._uploadFile = function (fileObj) {

                    return $http({
                        method: 'POST',
                        url: INSTANCE_URL + '/api/v2/system/user',
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

                scope.$watch('uploadFile.path', function (newValue, oldValue) {

                    if (!newValue) return false;

                    newValue = scope.uploadFile.path;

                    if (!scope._checkFileType(newValue)) {

                        scope.uploadFile.path = '';


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
                            scope.uploadFile.path = '';

                            $('#upload').val('');

                            var messageOptions = {
                                module: 'Users',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Users imported successfully.'
                            }
                            dfNotify.success(messageOptions);


                            scope.$broadcast('toolbar:paginate:user:reset');

                        },
                        function (reject) {

                            scope.importType = null;
                            scope.uploadFile.path = '';

                            $('#upload').val('');

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            }

                            dfNotify.error(messageOptions);

                            scope.$broadcast('toolbar:paginate:user:reset');
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

    .directive('dfExportUsers', ['MOD_USER_ASSET_PATH', 'INSTANCE_URL', '$cookies', '$http', '$window', function (MOD_USER_ASSET_PATH, INSTANCE_URL, $cookies, $http, $window) {

        return {

            restrict: 'A',
            scope: false,
            replace: true,
            link: function (scope, elem, attrs) {


                scope.fileFormatStr = null;

                scope.exportUsers = function(fileFormatStr) {
                    scope._exportUsers(fileFormatStr);
                };


                scope._getFile = function (urlStr) {

                    return $http({
                        method: 'GET',
                        url: urlStr
                    })
                };

                scope._exportUsers = function (fileFormatStr) {

                    if (fileFormatStr === 'csv' || fileFormatStr === 'json' || fileFormatStr === 'xml' ) {

                        scope.fileFormatStr = fileFormatStr;

                        var params = 'file=user.' + scope.fileFormatStr +'&session_token='+$cookies.PHPSESSID;


                        // Jason's method to make it work.  He doesn't check for bad response.
                        // I'll look into angularJS's $location to fix this.
                        $window.location.href= INSTANCE_URL + '/api/v2/system/user?' + params;
                    }
                }
            }
        }
    }])


