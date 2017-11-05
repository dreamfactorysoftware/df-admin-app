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
                        checkUser:['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }])

    .run([function () {

    }])
    
    .controller('UsersCtrl', ['$rootScope', '$scope', 'dfApplicationData', 'dfNotify', '$location',
        function($rootScope, $scope, dfApplicationData, dfNotify, $location){

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
                viewLink: $scope.links[1],
                active: false
            };

            // Set empty search result message
            $scope.emptySearchResult = {
                title: 'You have no Users that match your search criteria!',
                text: ''
            };

            // load data

            $scope.apiData = null;

            $scope.loadTabData = function() {

                $scope.dataLoading = true;

                var apis = ['user', 'role', 'app'];

                dfApplicationData.getApiData(apis).then(
                    function (response) {
                        var newApiData = {};
                        apis.forEach(function(value, index) {
                            newApiData[value] = response[index].resource ? response[index].resource : response[index];
                        });
                        $scope.apiData = newApiData;
                    },
                    function (error) {
                        var msg = 'There was an error loading data for the Users tab. Please try refreshing your browser and logging in again.';
                        if (error && error.error && (error.error.code === 401 || error.error.code === 403)) {
                            msg = 'To use the Users tab your role must allow GET access to system/user, system/role, and system/app. To create, update, or delete users you need POST, PUT, DELETE access to /system/user and/or /system/user/*.';
                            $location.url('/home');
                        }
                        var messageOptions = {
                            module: 'Users',
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
        }
    ])

    .directive('dfUserDetails', ['MOD_USER_ASSET_PATH', 'dfApplicationData', 'dfNotify', 'dfObjectService', 'INSTANCE_URL', '$http', '$cookies', 'UserDataService', '$cookieStore', '$rootScope', 'SystemConfigDataService', function(MOD_USER_ASSET_PATH, dfApplicationData, dfNotify, dfObjectService, INSTANCE_URL, $http, $cookies, UserDataService, $cookieStore, $rootScope, SystemConfigDataService) {

        return {

            restrict: 'E',
            scope: {
                userData: '=?',
                newUser: '=?',
                apiData: '=?'
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
                        lookup_by_user_id: [],
                        user_to_app_to_role_by_user_id: []
                    };

                    userData = userData || _user;

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: angular.copy(userData),
                        recordCopy: angular.copy(userData)
                    };
                };

                scope.loginAttribute = SystemConfigDataService.getSystemConfig().authentication.login_attribute;
                
                scope.user = null;

                if (scope.newUser) {
                    scope.user = new User();
                }

                scope.sendEmailOnCreate = false;

                scope._validateData = function () {

                    if (scope.newUser) {
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
                            module: 'Users',
                            type: 'error',
                            message: 'Passwords do not match.'
                        });
                        return false;
                    }
                    return true;
                };
                
                // PUBLIC API

                scope.saveUser = function () {

                    if (!scope._validateData()) {
                        return;
                    }

                    if (scope.newUser) {

                        scope._saveUser();
                    }
                    else {
                        scope._updateUser();
                    }
                };

                scope.cancelEditor = function () {

                    // merge data from UI into current edit record
                    scope._prepareUserData();

                    // then compare to original edit record
                    if (!dfObjectService.compareObjectsAsJson(scope.user.record, scope.user.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return;
                        }
                    }

                    scope.closeEditor();
                };


                // PRIVATE API

                scope.closeEditor = function() {

                    // same object as currentEditUser used in ng-show
                    scope.userData = null;

                    scope.user = new User();
                    scope.roleToAppMap = {};
                    scope.lookupKeys = [];

                    // This func comes from the dfSetUserPassword directive
                    // which is stored in dfutility.
                    scope._resetUserPasswordForm();

                    // force to manage view
                    scope.$emit('sidebar-nav:view:reset');
                };

                scope._prepareUserData = function () {

                    scope._preparePasswordData();
                    scope._prepareLookupKeyData();
                };
                
                // COMPLEX IMPLEMENTATION
                scope._saveUser = function () {

                    // merge data from UI into current edit record
                    scope._prepareUserData();

                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'user_to_app_to_role_by_user_id,lookup_by_user_id',
                            send_invite: scope.sendEmailOnCreate
                        },
                        data: scope.user.record
                    };

                    dfApplicationData.saveApiData('user', requestDataObj).$promise.then(

                        function(result) {

                            var messageOptions = {
                                module: 'Users',
                                provider: 'dreamfactory',
                                type: 'success',
                                message: 'User saved successfully.'
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

                scope._updateUser = function () {

                    // merge data from UI into current edit record
                    scope._prepareUserData();

                    // instead of specifing params here maybe we should
                    // set dfApplicationData to pull from the prefs to set.
                    // For now we'll leave it here.
                    var requestDataObj = {

                        params: {
                            fields: '*',
                            related: 'user_to_app_to_role_by_user_id,lookup_by_user_id'
                        },
                        data: scope.user.record
                    };

                    dfApplicationData.updateApiData('user', requestDataObj).$promise.then(

                        function (result) {

                            // update token if email was changed
                            if (result.session_token) {
                                var existingUser = UserDataService.getCurrentUser();
                                existingUser.session_token = result.session_token;
                                UserDataService.setCurrentUser(existingUser);
                            }

                            var messageOptions = {
                                module: 'Users',
                                provider: 'dreamfactory',
                                type: 'success',
                                message: 'User updated successfully.'
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
                // userData is passed in to the directive as data-user-data
                var watchUserData = scope.$watch('userData', function (newValue, oldValue) {

                    if (newValue) {
                        scope.user = new User(newValue);
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

                    watchUserData();
                    watchPassword();
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
                };
            }
        };
    }])

    .directive('dfConfirmUser', ['INSTANCE_URL', 'MOD_USER_ASSET_PATH', '$http', 'SystemConfigDataService', 'dfNotify', function(INSTANCE_URL, MOD_USER_ASSET_PATH, $http, SystemConfigDataService, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_USER_ASSET_PATH + 'views/df-input-confirm-user.html',
            link: function(scope, elem, attrs) {

                scope.sendEmailOnCreate = false;

                scope.systemConfig = SystemConfigDataService.getSystemConfig();

                scope.invite = function() {

                    $http({
                        url: INSTANCE_URL + '/api/v2/system/user/' + scope.user.record.id,
                        method: 'PATCH',
                        params: {
                            send_invite: true
                        }
                    }).then(
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
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                        }
                    );
                };
            }
        };
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
                    var existing = scope.user.record.user_to_app_to_role_by_user_id.filter(function (item) {
                        return item.app_id == appId;
                    })[0];

                    if (existing) {
                        existing.user_id = null;
                    }
                };

                scope._updateRoleApp = function (appId, roleId) {
                    var existing = scope.user.record.user_to_app_to_role_by_user_id.filter(function (item) {
                        return item.app_id == appId;
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

    .directive('dfUserLookupKeys', ['MOD_USER_ASSET_PATH', function(MOD_USER_ASSET_PATH) {

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

                            if (index === _index) {
                                return;
                            }

                            if (value.record.name === _value.record.name) {
                                scope.sameKeys.push(value);
                            }
                        });
                    });
                };

                scope._preparePasswordData = function () {

                    if (scope.setPassword) {
                        // set password in user record
                        scope.user.record.password = scope.password.new_password;
                    } else {
                        // delete password from user record
                        if (scope.user.record.password) {
                            delete scope.user.record.password;
                        }
                    }
                };

                scope._prepareLookupKeyData = function () {

                    var tempArr = [];

                    angular.forEach(scope.lookupKeys, function (lk) {

                        tempArr.push(lk.record);
                    });

                    scope.user.record.lookup_by_user_id = tempArr;
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

                var watchUser = scope.$watch('user', function (newValue, oldValue) {

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


                            }else {
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

                    watchUser();
                    watchSameKeys();
                    watchLookupKeys();
                });
            }
        };
    }])

    .directive('dfManageUsers', ['$rootScope', 'MOD_USER_ASSET_PATH', 'dfApplicationData', 'dfNotify', function ($rootScope, MOD_USER_ASSET_PATH, dfApplicationData, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_USER_ASSET_PATH + 'views/df-manage-users.html',
            link: function (scope, elem, attrs) {

                var ManagedUser = function (userData) {
                    if(userData) {
                        userData.confirm_msg = 'N/A';
                        if(userData.confirmed === true){
                            userData.confirm_msg = 'Confirmed';
                        } else if (userData.confirmed === false){
                            userData.confirm_msg = 'Pending';
                        }

                        if (userData.expired === true){
                            userData.confirm_msg = 'Expired';
                        }
                    }
                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: userData
                    };
                };

                // For file upload on import users;
                // there is a scope issue where the fileUpload directive
                // accesses import users parent scope.  It's not as bad as it sounds
                scope.uploadFile = {
                    path: ''
                };

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
                        label: 'Registration',
                        active: true
                    }
                ];

                scope.order = {
                    orderBy: 'id',
                    orderByReverse: false
                };

                scope.selectedUsers = [];


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

                    dfApplicationData.deleteApiData('user', requestDataObj).$promise.then(

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

                scope._setSelected = function (user) {

                    var i = 0;

                    while (i < scope.selectedUsers.length) {

                        if (user.record.id === scope.selectedUsers[i]) {

                            user.__dfUI.selected = false;
                            scope.selectedUsers.splice(i, 1);
                            return;
                        }

                        i++;
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

                    dfApplicationData.deleteApiData('user', requestDataObj).$promise.then(

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

                        }
                    );
                };


                // WATCHERS

                // this fires when the API data changes
                var watchApiData = scope.$watchCollection(function() {

                    return dfApplicationData.getApiDataFromCache('user');

                }, function (newValue, oldValue) {

                    var _users = [];
                    
                    if (newValue) {
                        angular.forEach(newValue, function (user) {
                            _users.push(new ManagedUser(user));
                        });
                        scope.emptySectionOptions.active = (_users.length === 0);
                    }

                    scope.users = _users;
                });

                // MESSAGES

                scope.$on('$destroy', function (e) {

                    // Destroy watchers
                    watchApiData();
                    // when filter is changed the controller is reloaded and we get destroy event
                    // the reset event tells pagination engine to update based on filter
                    scope.$broadcast('toolbar:paginate:user:reset');
                });
            }
        };
    }])

    .directive('dfUserLoading', [function() {
        return {
            restrict: 'E',
            template: "<div class='col-lg-12' ng-if='dataLoading'><span style='display: block; width: 100%; text-align: center; color: #A0A0A0; font-size: 50px; margin-top: 100px'><i class='fa fa-refresh fa-spin'></i></div>"
        };
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

                scope.$watch('uploadFile.path', function (newValue, oldValue) {

                    if (!newValue) {
                        return false;
                    }

                    newValue = scope.uploadFile.path;

                    if (!scope._checkFileType(newValue)) {

                        scope.uploadFile.path = '';


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
                            scope.uploadFile.path = '';

                            $('#upload').val('');

                            var messageOptions = {
                                module: 'Users',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Users imported successfully.'
                            };
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
                            };

                            dfNotify.error(messageOptions);

                            scope.$broadcast('toolbar:paginate:user:reset');
                        }
                    );
                });
            }
        };
    }])

    .directive('dfExportUsers', ['MOD_USER_ASSET_PATH', 'INSTANCE_URL', 'UserDataService', '$http', '$window', 'ADMIN_API_KEY', function (MOD_USER_ASSET_PATH, INSTANCE_URL, UserDataService, $http, $window, ADMIN_API_KEY) {

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
                    });
                };

                scope._exportUsers = function (fileFormatStr) {

                    if (fileFormatStr === 'csv' || fileFormatStr === 'json' || fileFormatStr === 'xml' ) {

                        scope.fileFormatStr = fileFormatStr;

                        var params = 'file=user.' + scope.fileFormatStr + '&api_key=' + ADMIN_API_KEY;
                        var currentUser = UserDataService.getCurrentUser();
                        if (currentUser && currentUser.session_token) {
                            params += '&session_token=' + currentUser.session_token;
                        }

                        // Jason's method to make it work.  He doesn't check for bad response.
                        // I'll look into angularJS's $location to fix this.
                        $window.location.href= INSTANCE_URL + '/api/v2/system/user?' + params;
                    }
                };
            }
        };
    }]);
