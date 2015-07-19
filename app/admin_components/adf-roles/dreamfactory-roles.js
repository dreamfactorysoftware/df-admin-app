'use strict';


angular.module('dfRoles', ['ngRoute', 'dfUtility', 'dfTable'])
    .constant('MOD_ROLES_ROUTER_PATH', '/roles')
    .constant('MOD_ROLES_ASSET_PATH', 'admin_components/adf-roles/')
    .config(['$routeProvider', 'MOD_ROLES_ROUTER_PATH', 'MOD_ROLES_ASSET_PATH',
        function ($routeProvider, MOD_ROLES_ROUTER_PATH, MOD_ROLES_ASSET_PATH) {
            $routeProvider
                .when(MOD_ROLES_ROUTER_PATH, {
                    templateUrl: MOD_ROLES_ASSET_PATH + 'views/main.html',
                    controller: 'RolesCtrl',
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

    .run(['DSP_URL', '$templateCache', function (DSP_URL, $templateCache) {


    }])

    .controller('RolesCtrl', ['$scope', function($scope) {

        $scope.$parent.title = 'Roles';

        // Set module links
        $scope.links = [
            {
                name: 'manage-roles',
                label: 'Manage',
                path: 'manage-roles'
            },
            {
                name: 'create-role',
                label: 'Create',
                path: 'create-role'
            }

        ];


        // Set empty section options
        $scope.emptySectionOptions = {
            title: 'You have no Roles!',
            text: 'Click the button below to get started creating your first role.  You can always create new roles by clicking the tab located in the section menu to the left.',
            buttonText: 'Create A Role!',
            viewLink: $scope.links[1]
        };
    }])

    .directive('dfRoleDetails', ['MOD_ROLES_ASSET_PATH', 'dfApplicationData', 'dfNotify', 'dfObjectService', 'dfApplicationPrefs', '$q', function(MOD_ROLES_ASSET_PATH, dfApplicationData, dfNotify, dfObjectService, dfApplicationPrefs, $q) {


        return {

            restrict: 'E',
            scope: {
                roleData: '=?',
                newRole: '=?'
            },
            templateUrl: MOD_ROLES_ASSET_PATH + 'views/df-role-details.html',
            link: function(scope, elem, attrs) {

                // @TODO: Refactor to factory.
                var Role = function(roleData) {

                    var newRole = {
                        name: '',
                        description: '',
                        is_active: false,
                        default_app_id: null,
                        role_service_access_by_role_id:[],
                        id: null,
                        role_lookup_by_role_id: []
                    };

                    roleData = roleData || newRole;

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: angular.copy(roleData),
                        recordCopy: angular.copy(roleData)
                    }
                };

                scope.basicInfoError = false;

                scope.role = null;

                // Is this going to be a new Role
                if (scope.newRole) {
                    scope.role = new Role();
                }


                // Other Data
                scope.services = dfApplicationData.getApiData('service');

                if (scope.services[0].name !== 'All') {
                    scope.services.unshift({id: null, name: 'All', components: ["","*"]});
                }


                // PUBLIC API
                scope.saveRole = function() {

                    if (scope.newRole) {

                        scope._saveRole();
                    }
                    else {

                        scope._updateRole();
                    }
                };

                scope.deleteRole = function () {

                    scope._deleteRole();
                };

                scope.closeRole = function() {

                    scope._closeRole();
                };


                // PRIVATE API
                scope._saveRoleToServer = function (requestDataObj) {

                    return dfApplicationData.saveApiData('role', requestDataObj).$promise;
                };

                scope._updateRoleToServer = function (requestDataObj) {

                    return dfApplicationData.updateApiData('role', requestDataObj).$promise;
                };

                scope._deleteRoleFromServer = function (requestDataObj) {

                    return dfApplicationData.deleteApiData('role', requestDataObj).$promise;
                };

                scope._prepareRoleData = function () {

                    if (!scope.role.record.name) {
                        scope.basicInfoError = true;
                        return;
                    }else {
                        scope.basicInfoError = false;
                    }

                    scope._prepareServiceAccessData();
                    scope._prepareRoleLookUpKeysData();
                    scope._prepareAppsToRoleData();
                };

                scope._resetRoleDetails = function () {

                    if (scope.newRole) {

                        scope.role = new Role();
                    }
                    else {

                        scope.roleData = null;
                    }

                    // reset tabs
                    angular.element('#basic-tab').trigger('click');
                    scope.$broadcast('dfPaginate:reset:user');
                    scope.$broadcast('dfPaginate:reset:app');

                    // reset errors
                    scope.lookupKeysError = false;
                    scope.basicInfoError = false;

                };


                // COMPLEX IMPLEMENTATION
                scope._saveRole = function () {

                    scope._prepareRoleData();

                    var requestDataObj = {
                        params:{
                            fields: '*',
                            related: 'role_service_access_by_role_id,role_lookup_by_role_id'
                        },
                        data: scope.role.record
                    };

                    scope._saveRoleToServer(requestDataObj).then(
                        function(result) {

                            var messageOptions = {
                                module: 'Roles',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Role saved successfully.'

                            };

                            scope.role = new Role(result);
                            dfNotify.success(messageOptions);

                            // Did we add or remove any users
                            if (scope.addedRoleUsers.length || scope.removedRoleUsers.length) {

                                // run the update for users
                                scope._updateUsersToServer().then(
                                    function(result) {

                                        var messageOptions = {
                                            module: 'Roles',
                                            type: 'success',
                                            provider: 'dreamfactory',
                                            message: 'Role users saved successfully.'
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
                                        function() {
                                            // console.log('Update Role Users finally')
                                        }
                                    )

                            }


                            // Did we add or remove any apps
                            if (scope._checkForChangedApps()) {

                                scope._updateAppsToServer().then(
                                    function(result) {

                                        var messageOptions = {
                                            module: 'Roles',
                                            type: 'success',
                                            provider: 'dreamfactory',
                                            message: 'Role users saved successfully.'
                                        };

                                        dfNotify.success(messageOptions);


                                    },

                                    function(reject) {

                                        var messageOptions = {
                                            module: 'Api Error',
                                            type: 'error',
                                            provider: 'dreamfactory',
                                            message: reject

                                        };

                                        dfNotify.error(messageOptions);

                                    }

                                ).finally(
                                        function() {

                                            // console.log('Update Role Apps finally.');
                                        }
                                    )
                            }



                            // clean form
                            scope._resetRoleDetails();


                        },

                        function(reject) {

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject

                            };

                            dfNotify.error(messageOptions);

                        }
                    ).finally(
                        function() {

                            // console.log('Save Roles finally')
                        }
                    )
                };

                scope._updateRole = function () {

                    scope._prepareRoleData();

                    var requestDataObj = {
                        params:{
                            fields: '*',
                            related: 'role_service_access_by_role_id,role_lookup_by_role_id'
                        },
                        data: scope.role.record
                    };


                    scope._updateRoleToServer(requestDataObj).then(
                        function(result) {


                            var messageOptions = {
                                module: 'Roles',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Role updated successfully.'

                            };

                            dfNotify.success(messageOptions);
                            scope.role = new Role(result);

                        },

                        function(reject) {

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject

                            };

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function() {

                            // console.log('Update Roles finally')
                        }
                    );


                    // Did we add or remove any users
                    if (scope.addedRoleUsers.length || scope.removedRoleUsers.length) {

                        // run the update for users
                        scope._updateUsersToServer().then(
                            function(result) {

                                var messageOptions = {
                                    module: 'Roles',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: 'Role users saved successfully.'
                                };

                                dfNotify.success(messageOptions);
                                scope.$broadcast('dfPaginate:reset:user');

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
                            function() {
                                // console.log('Update Role Users finally')
                            }
                        )
                    }


                    // Did we add or remove any apps
                    if (scope._checkForChangedApps()) {

                        scope._updateAppsToServer().then(
                            function(result) {

                                var messageOptions = {
                                    module: 'Roles',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: 'Role apps saved successfully.'
                                };

                                dfNotify.success(messageOptions);
                                scope.$broadcast('dfPaginate:reset:app');

                            },

                            function(reject) {

                                var messageOptions = {
                                    module: 'Api Error',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    message: reject

                                };

                                dfNotify.error(messageOptions);

                            }

                        ).finally(
                            function() {

                                // console.log('Update Role Apps finally.');
                            }
                        )
                    }


                    if (dfApplicationPrefs.getPrefs().sections.role.autoClose) {
                        scope._resetRoleDetails();
                    }
                };

                scope._deleteRole = function () {

                    var requestDataObj = {
                        params: {},
                        data: scope.role.record
                    };


                    scope._deleteRoleFromServer(requestDataObj).then(
                        function(result) {

                            // notify success
                            var messageOptions = {
                                module: 'Roles',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Role successfully deleted.'
                            };

                            dfNotify.success(messageOptions);

                            scope.role = null;

                        },

                        function(reject) {

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);

                        }
                    ).finally(
                        function() {

                           //  console.log('Delete App Finally')
                        }
                    )

                };

                scope._closeRole = function () {

                    scope._prepareRoleData();

                    if (!dfObjectService.compareObjectsAsJson(scope.role.record, scope.role.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return false;
                        }
                    }
                    else if (scope._checkForChangedUsers()) {

                        if (!dfNotify.confirmNoSave()) {

                            return false;
                        }
                    }


                    scope._resetRoleDetails();
                };


                // WATCHERS
                var watchData = scope.$watch('roleData', function(newValue, oldValue) {

                    if (!newValue) return false;
                    if (scope.newRole) return false;

                    scope.role = new Role(newValue);
                });


                // MESSAGES
                scope.$on('$destroy', function(e) {
                    watchData();

                    scope.$broadcast('dfPaginate:reset:records');
                });


                // HELP
                scope.dfSimpleHelp = {
                    serviceAccess: {
                        title: 'Role Service Access Information',
                        text: 'Access rules for DSP services. Use caution when allowing system access.'
                    }
                };

                scope.dfLargeHelp = {

                    basic: {
                        title: 'Roles Overview',
                        text: 'Roles provide a way to grant or deny API access to specific' +
                            ' services or simply access to specific apps.'
                    },
                    access: {
                        title: 'Access Overview',
                        text: 'This section allows you set set up rules for a role restricting what' +
                            ' services and components users assigned to the role will have access to.' +
                            ' Advanced Filters are for implementing additional server side filter logic ' +
                            'on database transactions.'
                    },
                    users: {
                        title: 'Users Overview',
                        text: 'Select which users are assigned to this role.'
                    },
                    apps: {
                        title: 'Apps Overview',
                        text: 'Select which apps users assigned to this role should have access to.'
                    },
                    lookupkeys: {
                        title: 'Lookup Keys Overview',
                        text: 'The DSP administrator can create any number of "key value" pairs attached to a ' +
                            'role. The key values are automatically substituted on the server. For example, key ' +
                            'names can be used in the username and password fields required to hook up a SQL or ' +
                            'NoSQL database. They can also be used in Email Templates or as parameters for external ' +
                            'REST services. Any Lookup Key can be marked as private, and in this case the key value ' +
                            'is securely encrypted on the server and is no longer accessible through the platform ' +
                            'interface.<span style="color: red;">  Lookup keys for service configuration and credentials must be made private.</span>'
                    }
                }
            }
        }
    }])

    .directive('assignServiceAccess', ['MOD_ROLES_ASSET_PATH', 'dfNotify', function(MOD_ROLES_ASSET_PATH, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_ROLES_ASSET_PATH + 'views/df-assign-service-access.html',
            link: function(scope, elem, attrs) {

                // @TODO: Refactor to factory.
                var ServiceAccess = function () {

                    return {
                        __dfUI: {
                            allowFilters: false,
                            showFilters: false,
                            hasError: false
                        },
                        record: {
                            "verb_mask": 0,
                            "requestor_mask": 1,
                            "component": "*",
                            "service": scope.services[0] || null,
                            "service_id": scope.services[0].id || null,
                            "filters": [],
                            "filter_op": "AND",
                            "show_filters": false
                        }
                    };
                };


                // Members
                scope.roleServiceAccesses = [];



                // PUBLIC API
                scope.addServiceAccess = function () {

                    scope._addServiceAccess();
                };

                scope.removeServiceAccess = function (serviceAccessObjIndex) {

                    scope._removeServiceAccess(serviceAccessObjIndex);
                };


                // PRIVATE API
                scope._prepareServiceAccessData = function () {

                    var preppedArr = [];

                    angular.forEach(scope.roleServiceAccesses, function (obj) {

                        // Copy the service access obj
                        var _obj = angular.copy(obj.record);

                        // delete service obj bc it don't be needed by des server
                        delete _obj.service;

                        // Add role id
                        // _obj.role_id = scope.role.id;

                        // push all this onto a fresh array
                        preppedArr.push(_obj);
                    });

                    // assign that array to the role obj
                    scope.role.record.role_service_access_by_role_id = preppedArr;
                };


                // COMPLEX IMPLEMENTATION
                scope._addServiceAccess = function () {

                    scope.roleServiceAccesses.push(new ServiceAccess());
                };

                scope._removeServiceAccess = function (serviceAccessObjIndex) {

                    scope.roleServiceAccesses.splice(serviceAccessObjIndex, 1);
                };

                scope._getService = function(serviceId) {

                    var i = 0;

                    while (i < scope.services.length) {

                        if (scope.services[i].id === serviceId) {

                            return scope.services[i];
                        }

                        i++;
                    }

                    var messageOptions = {
                        module: 'DreamFactory Roles Module',
                        type: 'error',
                        provider: 'dreamfactory',
                        message: 'Service with id "' + serviceId + '" not found.'

                    }

                    dfNotify.error(messageOptions);
                };


                // WATCHERS
                var watchRole = scope.$watch('role', function(newValue, oldValue) {

                    if (!newValue) return false;

                    scope.roleServiceAccesses = [];

                    // Do we have a new role
                    if (scope.newRole) {

                        // Yes.  We can set roleServiceAccesses to empty array
                        scope.roleServiceAccesses = [];
                    }
                    else {

                        // We need to create our role service objects
                        angular.forEach(newValue.record.role_service_access_by_role_id, function (obj) {


                            // Make a new role service object
                            var _newSA = new ServiceAccess();

                            // assign data from current role service that was returned
                            // in the role to the role service obj
                            _newSA.record = obj;

                            // Get the service for this serviceAccess's service_id
                            _newSA.record['service'] = scope._getService(obj.service_id);


                            if (_newSA.record.service.hasOwnProperty('components') && typeof _newSA.record.service.components === 'string') {

                                // Set error to true.  This will trigger the ui changes
                                _newSA.__dfUI.hasError = true;

                                // Set component to null;
                                _newSA.record.component = null;

                                var messageOptions = {
                                    module: 'Roles',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    message: _newSA.record.service.components
                                }

                                dfNotify.error(messageOptions);
                            }


                            // store on the scope
                            scope.roleServiceAccesses.push(_newSA);

                        });
                    }
                });

                // MESSAGES

                scope.$on('$destroy', function(newValue, oldValue) {

                    watchRole();
                });



                // HELP



            }
        }
    }])

    .directive('dfServiceAccess', ['MOD_ROLES_ASSET_PATH', 'dfNotify', function (MOD_ROLES_ASSET_PATH, dfNotify) {

        return {

            restrict: 'E',
            replace: true,
            scope: {
                serviceAccess: '=',
                index: '='
            },
            templateUrl: MOD_ROLES_ASSET_PATH + 'views/df-service-access.html',
            link: function(scope, elem, attrs) {

                // @TODO: Refactor to factory.
                var ServiceAccessFilter = function () {

                    return {
                        "name":     "",
                        "operator": "=",
                        "value":    ""
                    }
                };

                scope.filterOperators =  [
                    "=",
                    "!=",
                    ">",
                    "<",
                    ">=",
                    "<=",
                    "in",
                    "not in",
                    "starts with",
                    "ends with",
                    "contains",
                    "is null",
                    "is not null"
                ];


                // PUBLIC API
                scope.toggleServiceAccessFilters = function () {

                    scope._toggleServiceAccessFilters();
                };

                scope.addServiceAccessFilter = function () {

                    scope._addServiceAccessFilter();
                };

                scope.removeServiceAccessFilter = function (serviceAccessFilterIndex) {

                    scope._removeServiceAccessFilter(serviceAccessFilterIndex);
                };

                scope.toggleServiceFilterOp = function() {

                    scope._toggleServiceFilterOp();
                };


                // PRIVATE API
                scope.allowFilters = function () {

                    switch(scope.serviceAccess.record.service.type) {

                        case "sql_db":
                        case "mongo_db":
                        case "aws_dynamodb":
                        case "aws_simpledb":
                        case "azure_table":
                        case "couch_db":
                        case "salesforce_db":
                            scope.serviceAccess.__dfUI.allowFilters = true;
                            break;
                        default:
                            scope.serviceAccess.__dfUI.allowFilters = false;
                    }
                };




                // COMPLEX IMPLEMENTATION
                scope._toggleServiceAccessFilters = function () {

                    scope.serviceAccess.__dfUI.show_filters = !scope.serviceAccess.__dfUI.show_filters;
                };

                scope._addServiceAccessFilter = function () {

                    scope.serviceAccess.record.filters.push(new ServiceAccessFilter());
                };

                scope._removeServiceAccessFilter = function (serviceAccessFilterIndex) {

                    scope.serviceAccess.record.filters.splice(serviceAccessFilterIndex, 1);
                };

                scope._toggleServiceFilterOp = function () {

                    scope.serviceAccess.record.filter_op = scope.serviceAccess.record.filter_op === 'AND' ? 'OR' : 'AND';
                };

                scope._checkForFailure = function () {

                    // Check if service components is a string.  If it is it's an error
                    if (scope.serviceAccess.record.service.hasOwnProperty('components') && typeof scope.serviceAccess.record.service.components === 'string') {

                        // Set error to true.  This will trigger the ui changes
                        scope.serviceAccess.__dfUI.hasError = true;

                        // Set component to null;
                        scope.serviceAccess.record.component = null;

                        var messageOptions = {
                            module: 'Roles',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: scope.serviceAccess.record.service.components
                        }

                        dfNotify.error(messageOptions);

                    }
                    else {

                        // set error to false. ditto
                        scope.serviceAccess.__dfUI.hasError = false;


                    }
                }


                // WATCHERS

                var watchServiceAccess = scope.$watch('serviceAccess', function (oldValue, newValue) {

                    if (!newValue) return false;
                    if (!newValue.record.service) return false;

                    // set filters if allowed
                    scope.allowFilters();

                });

                var watchServiceAccessRecordService = scope.$watch('serviceAccess.record.service', function(newValue, oldValue) {

                    if (!newValue) return false;

                    // set filters if allowed
                    scope.allowFilters();

                    // update service_id prop
                    scope.serviceAccess.record.service_id = newValue.id;
                    scope._checkForFailure();
                });


                // MESSAGES

                scope.$on('$destroy', function (e) {
                    watchServiceAccessRecordService();
                    watchServiceAccess();
                });


            }
        }
    }])

    .directive('dfManageRoles', ['MOD_ROLES_ASSET_PATH', 'dfApplicationData', 'dfApplicationPrefs', 'dfNotify', function(MOD_ROLES_ASSET_PATH, dfApplicationData, dfApplicationPrefs, dfNotify) {


        return {

            restrict: 'E',
            scope: false,
            templateUrl: MOD_ROLES_ASSET_PATH + 'views/df-manage-roles.html',
            link: function(scope, elem, attrs) {

                // @TODO: Refactor to factory.
                var ManagedRole = function (roleData) {

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: roleData
                    }
                };


                scope.currentViewMode = dfApplicationPrefs.getPrefs().sections.role.manageViewMode;

                scope.roles = null;

                scope.currentEditRole = null;

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

                scope.selectedRoles = [];


                // PUBLIC API

                scope.editRole = function (role) {

                    scope._editRole(role);
                };

                scope.deleteRole = function (role) {

                    if (dfNotify.confirm("Delete " + role.record.name + "?")) {
                        scope._deleteRole(role);
                    }
                };

                scope.deleteSelectedRoles = function () {

                    if (dfNotify.confirm("Delete selected roles?")) {
                        scope._deleteSelectedRoles();
                    }
                };

                scope.orderOnSelect = function (fieldObj) {

                    scope._orderOnSelect(fieldObj);
                };

                scope.setSelected = function (role) {

                    scope._setSelected(role);
                };


                // PRIVATE API
                scope._deleteFromServer = function (requestDataObj) {

                    return dfApplicationData.deleteApiData('role', requestDataObj).$promise;
                };



                // COMPLEX IMPLEMENTATION

                scope._editRole = function (role) {

                    scope.currentEditRole = role;
                };

                scope._deleteRole = function(role) {

                    var requestDataObj = {
                        params: {},
                        data: role.record
                    };


                    scope._deleteFromServer(requestDataObj).then(
                        function(result) {

                            // notify success
                            var messageOptions = {
                                module: 'Roles',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Role successfully deleted.'
                            };

                            dfNotify.success(messageOptions);

                            // Was this role previously selected before
                            // we decided to remove them individually
                            if (role.__dfUI.selected) {

                                // This will remove the role from the selected
                                // role array
                                scope.setSelected(role);
                            };

                            scope.$broadcast('toolbar:paginate:role:delete');
                        },

                        function(reject) {

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
                        function() {

                            // console.log('Delete Role Finally')
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

                scope._setSelected = function (role) {

                    var i = 0;

                    while (i < scope.selectedRoles.length) {

                        if (role.record.id === scope.selectedRoles[i]) {

                            role.__dfUI.selected = false;
                            scope.selectedRoles.splice(i, 1);
                            return;
                        }

                        i++
                    }

                    role.__dfUI.selected = true;
                    scope.selectedRoles.push(role.record.id);

                };

                scope._deleteSelectedRoles = function () {

                    var requestDataObj = {
                        params: {
                            ids: scope.selectedRoles.join(','),
                            rollback: true
                        }
                    };


                    scope._deleteFromServer(requestDataObj).then(

                        function(result) {

                            var messageOptions = {
                                module: 'Roles',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Roles deleted successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.selectedRoles = [];

                            scope.$broadcast('toolbar:paginate:role:reset');
                        },

                        function(reject) {

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function() {

                            // console.log('Delete Roles Finally');
                        }
                    )
                };


                // WATCHERS

                var watchRoles = scope.$watchCollection('roles', function (newValue, oldValue) {

                    if (newValue == null) {

                        var _roles = [];

                        angular.forEach(dfApplicationData.getApiData('role'), function (role) {

                            _roles.push(new ManagedRole(role));
                        });

                        scope.roles = _roles;
                        return;
                    }
                });

                var watchApiData = scope.$watchCollection(function() {

                    return dfApplicationData.getApiData('role');

                }, function (newValue, oldValue) {

                    var _roles = [];

                    angular.forEach(dfApplicationData.getApiData('role'), function (role) {

                        _roles.push(new ManagedRole(role));
                    });

                    scope.roles = _roles;
                    return;
                });


                // MESSAGES
                scope.$on('toolbar:paginate:role:update', function (e) {

                    var _roles = [];

                    angular.forEach(dfApplicationData.getApiData('role'), function (role) {


                        var _role = new ManagedRole(role);

                        var i = 0;

                        while (i < scope.selectedRoles.length) {

                            if (scope.selectedRoles[i] === _role.record.id) {

                                _role.__dfUI.selected = true;
                                break;
                            }

                            i++
                        }

                        _roles.push(_role);
                    });

                    scope.roles = _roles;
                });
                
                scope.$on('$destroy', function(e) {
                    watchRoles();
                })

            }
        }
    }])

    .directive('dfAssignUsersRole', ['MOD_ROLES_ASSET_PATH', 'dfApplicationData', 'dfNotify',
        function (MOD_ROLES_ASSET_PATH, dfApplicationData, dfNotify) {

            return {
                restrict: 'E',
                templateUrl: MOD_ROLES_ASSET_PATH + 'views/df-assign-users-role.html',
                scope: false,
                link: function (scope, elem, attrs) {

                    // @TODO: Refactor to factory.
                    var User = function (userData) {
                        return {

                            __dfUI: {
                                hasRole: false,
                                currentRole: null
                            },
                            record: angular.copy(userData)
                        }
                    };


                    scope.usersPrepFunc = function(userDataArr) {

                        var newUsersArr = [];

                        angular.forEach(userDataArr, function(userData) {

                            var newUser = new User(userData);

                            scope._getRoleName(newUser);
                            scope._hasCurrentRole(newUser);

                            newUsersArr.push(newUser);
                        });

                        return newUsersArr;
                    };

                    scope.users = [];
                    scope.addedRoleUsers = [];
                    scope.removedRoleUsers = [];


                    scope._getRoleName = function (userObj) {

                        if (userObj.record.role_id) {
                            var currentRole = dfApplicationData.getApiData('role', {id: [userObj.record.role_id]});
                            userObj.__dfUI.currentRole = currentRole.length ? currentRole[0] : null;
                        }
                    };

                    scope._hasCurrentRole = function (userObj) {

                        if (scope.role == null) return;

                        if (userObj.record.role_id != null && userObj.record.role_id === scope.role.record.id) {

                            userObj.__dfUI.hasRole = true;
                        }
                        else {

                            var i = 0;
                            while (i < scope.addedRoleUsers.length) {

                                if (userObj.record.id === scope.addedRoleUsers[i].id) {

                                    userObj.__dfUI.hasRole = true;
                                }

                                i++
                            }
                        }
                    };

                    scope._checkForChangedUsers = function () {

                        return scope.addedRoleUsers.length || scope.removedRoleUsers.length;
                    };

                    scope._toggleUserInRole = function (userObj) {

                        if (userObj.__dfUI.hasRole) {

                            scope._addUserToRole(userObj);
                        }
                        else {
                            scope._removeUserFromRole(userObj);
                        }
                    };

                    scope._addUserToRole = function (userObj) {


                        // if this is a new role
                        if (scope.role.record.id == null && scope.newRole) {
                            scope.addedRoleUsers.push({id: userObj.record.id, role_id: null});
                            return;
                        }

                        // if the user wasn't previously in this role and we are adding them
                        if (userObj.record.role_id !== scope.role.record.id) {
                            scope.addedRoleUsers.push({id: userObj.record.id, role_id: scope.role.record.id});
                        }

                        // user was recently removed but we changed our mind
                        else {
                            var i = 0;
                            while (i < scope.removedRoleUsers.length) {

                                if (userObj.record.id === scope.removedRoleUsers[i].id) {

                                    scope.removedRoleUsers.splice(i, 1);
                                }

                                i++
                            }
                        }
                    };

                    scope._removeUserFromRole = function (userObj) {


                        // if this is a new role
                        if (scope.role.record.id == null && scope.newRole) {
                            var i = 0;
                            while (i < scope.addedRoleUsers.length) {

                                if (userObj.record.id === scope.addedRoleUsers[i].id) {

                                    scope.addedRoleUsers.splice(i, 1);
                                }

                                i++
                            }
                            return;
                        }


                        // user was previously in this role and we are removing them
                        if (userObj.record.role_id === scope.role.record.id) {
                            scope.removedRoleUsers.push({id: userObj.record.id, role_id: null});
                        }

                        // user was recently added but we've changed our mind
                        else {
                            var i = 0;
                            while (i < scope.addedRoleUsers.length) {

                                if (userObj.record.id === scope.addedRoleUsers[i].id) {

                                    scope.addedRoleUsers.splice(i, 1);
                                }

                                i++
                            }
                        }
                    };

                    scope._updateUsersToServer = function () {

                        // If this is a new role we need the id of
                        // the new role to update these users
                        if (scope.newRole) {

                            // Add the current role id to the users role_id prop
                            angular.forEach(scope.addedRoleUsers, function(addedUserObj) {

                                addedUserObj.role_id = scope.role.record.id;
                            })
                        }

                        // Create an array of all users to be updated
                        var users = scope.addedRoleUsers.concat(scope.removedRoleUsers);

                        // set request data and params
                        var requestDataObj = {
                            params:{
                                fields: '*'
                            },
                            data: users
                        };

                        // make request and return resp
                        return dfApplicationData.updateApiData('user', requestDataObj).$promise;
                    };


                    var watchRole = scope.$watch('role', function(newValue, oldValue) {

                        if (!newValue) return false;

                        scope.addedRoleUsers = [];
                        scope.removedRoleUsers = [];
                        scope.users = scope.usersPrepFunc(dfApplicationData.getApiData('user'));
                    });


                    scope.$on('$destroy', function (e) {
                        watchRole();
                    });
                }
            }
        }])

    .directive('dfAssignAppsRole', ['MOD_ROLES_ASSET_PATH', 'dfApplicationData', function(MOD_ROLES_ASSET_PATH, dfApplicationData) {

        return {

            restrict: 'E',
            scope: false,
            templateUrl: MOD_ROLES_ASSET_PATH + 'views/df-assign-apps-role.html',
            link: function(scope, elem, attrs) {

                // @TODO: Refactor to factory.
                var App = function (appData) {

                    return {

                        __dfUI: {
                            inRole: false,
                            isDefaultApp: false
                        },
                        record: angular.copy(appData)
                    }
                };

                // @TODO: Refactor to factory.
                var AppToRoleObj = function (appObjData) {

                    return {
                        id: appObjData.id,
                        roles: appObjData.roles
                    }
                };


                scope.appsPrepFunc = function(appDataArr) {

                    var newAppsArr = [];

                    angular.forEach(appDataArr, function(appData) {

                        var newApp = new App(appData);

                        if (scope.role) {
                            scope._inCurrentRole(newApp);
                        }

                        newAppsArr.push(newApp);
                    });

                    return newAppsArr;
                };

                scope.apps = [];

                scope.defaultAppId = null;

                scope.addedRoleApps = [];

                scope.removedRoleApps = [];


                scope._inCurrentRole = function (appObj) {

                    if (!appObj.record.roles) return;

                    var i = 0;

                    while (i < appObj.record.roles.length) {

                        if (appObj.record.roles[i].id === scope.role.record.id) {

                            appObj.__dfUI.inRole = true;

                            if (appObj.record.roles[i].id === scope.default_app_id) {
                                appObj.__dfUI.isDefaultApp = true;
                            }

                            return;
                        }

                        i++
                    }
                };

                scope._checkForChangedApps = function () {

                    return scope.addedRoleApps.length || scope.removedRoleApps.length;
                };

                scope._toggleAppInRole = function (appObj) {

                    if (appObj.__dfUI.inRole) {

                        scope._addAppToRole(appObj);
                    }
                    else {
                        scope._removeAppFromRole(appObj);

                        if (scope.defaultAppId === appObj.record.id) {
                            scope.defaultAppId = null;
                        }
                    }
                };

                scope._toggleDefaultAppId = function (appObj) {

                    if (appObj.__dfUI.inRole) {

                        scope.defaultAppId = appObj.record.id;
                    }
                    else {

                        scope._addAppToRole(appObj);
                        scope.defaultAppId = appObj.record.id;
                    }
                };

                scope._addAppToRole = function (appObj) {


                    // if this is a new role
                    if (scope.role.record.id == null && scope.newRole) {

                        var AppToRoleRecord = new AppToRoleObj(appObj.record);
                        AppToRoleRecord.roles.push({id: scope.role.record.id});

                        scope.addedRoleApps.push(AppToRoleRecord);

                        // just make sure it's set to true
                        appObj.__dfUI.inRole = true;
                        return;
                    }

                    // counter
                    var i = 0;


                    while (i <= appObj.record.roles.length) {

                        // if the app has no roles or if the app wasn't previously in this role and we are adding it
                        if (appObj.record.roles.length === 0 || scope.role.record.id !== appObj.record.roles[i].id) {

                            // Create a new AppToRoleObj
                            var AppToRoleRecord = new AppToRoleObj(appObj.record);

                            // add this role to the app
                            AppToRoleRecord.roles.push({id: scope.role.record.id});

                            // store this AppToRoleObj for saving later
                            scope.addedRoleApps.push(AppToRoleRecord);

                            // just make sure it's set to true
                            appObj.__dfUI.inRole = true;

                            return;
                        }

                        // app was recently removed but we changed our mind
                        else {
                            var j = 0;

                            while (j < scope.removedRoleApps.length) {

                                if (appObj.record.id === scope.removedRoleApps[j].id) {

                                    scope.removedRoleApps.splice(j, 1);

                                    // just make sure it's set to true
                                    appObj.__dfUI.inRole = true;

                                    return;
                                }

                                j++
                            }
                        }

                        i++
                    }
                };

                scope._removeAppFromRole = function (appObj) {

                    // if this is a new role
                    if (scope.role.record.id == null && scope.newRole) {
                        var i = 0;
                        while (i < scope.addedRoleApps.length) {

                            if (appObj.record.id === scope.addedRoleApps[i].id) {

                                scope.addedRoleApps.splice(i, 1);

                                // just make sure it's set to true
                                appObj.__dfUI.inRole = false;

                                return;
                            }

                            i++
                        }

                        return;
                    }


                    var i = 0;

                    while (i < appObj.record.roles.length) {

                        // app was previously in this role and we are removing it
                        if (appObj.record.roles[i].id === scope.role.record.id) {

                            var RemoveAppToRoleRecord = new AppToRoleObj(appObj.record);
                            RemoveAppToRoleRecord.roles.splice(i, 1);

                            scope.removedRoleApps.push(RemoveAppToRoleRecord);

                            // just make sure it's set to true
                            appObj.__dfUI.inRole = false;

                            return;
                        }

                        // app was recently added but we've changed our mind
                        else {
                            var j = 0;
                            while (j < scope.addedRoleApps.length) {

                                if (appObj.record.id === scope.addedRoleApps[j].id) {

                                    scope.addedRoleApps.splice(j, 1);

                                    // just make sure it's set to true
                                    appObj.__dfUI.inRole = false;
                                    return;
                                }

                                j++
                            }
                        }

                        i++
                    }
                };

                scope._prepareAppsToRoleData = function () {

                    scope.role.record.default_app_id = scope.defaultAppId;
                };

                scope._updateAppsToServer = function () {


                    // If this is a new role we need the id of
                    // the new role to update these users
                    if (scope.newRole) {

                        angular.forEach(scope.addedRoleApps, function(appObj) {

                            angular.forEach(appObj.roles, function(roleObj) {

                                if (roleObj.id === null) {
                                    roleObj.id = scope.role.record.id;
                                }
                            });
                        });
                    }

                    var apps = scope.addedRoleApps.concat(scope.removedRoleApps);

                    var requestDataObj = {
                        params:{
                            fields: '*',
                            related: 'role_by_role_id'
                        },
                        data: apps
                    };

                    return dfApplicationData.updateApiData('app', requestDataObj).$promise;
                };


                var watchRole = scope.$watch('role', function (newValue, oldValue) {

                    if (!newValue) return;

                    scope.defaultAppId = newValue.record.default_app_id;

                    scope.addedRoleApps = [];
                    scope.removedRoleApps = [];
                    scope.apps = scope.appsPrepFunc(dfApplicationData.getApiData('app'));
                });

                scope.$on('$destroy', function (e) {

                    watchRole();
                });
            }
        }
    }])

    .directive('dfAssignLookUpKeys', ['MOD_ROLES_ASSET_PATH', function(MOD_ROLES_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_ROLES_ASSET_PATH + 'views/df-assign-lookup-keys.html',
            link: function(scope, elem, attrs) {

                // @TODO: Refactor to factory.
                var LookUpKey = function (lookupKeyData) {

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


                scope.roleLookUpKeys = [];

                scope.sameKeys = [];

                scope.lookupKeysError = false;



                // PUBLIC API
                scope.addLookUpKey = function() {

                    scope._addLookUpKey();
                };

                scope.deleteLookUpKey = function (keyObjIndex) {

                    scope._deleteLookUpKey(keyObjIndex);
                };


                // PRIVATE API

                scope._prepareRoleLookUpKeysData = function() {

                    var tempArr = [];

                    angular.forEach(scope.roleLookUpKeys, function (lk) {

                        tempArr.push(lk.record);
                    });


                    scope.role.record.role_lookup_by_role_id = tempArr;
                };

                scope._isUniqueKey = function () {

                    scope.sameKeys = [];

                    angular.forEach(scope.roleLookUpKeys, function(value, index) {
                        angular.forEach(scope.roleLookUpKeys, function (_value, _index) {

                            if (index === _index) return;

                            if (value.record.name === _value.record.name) {
                                scope.sameKeys.push(value);
                            }
                        })
                    });

                }


                // COMPLEX IMPLEMENTATION

                scope._addLookUpKey = function() {

                    scope.roleLookUpKeys.push(new LookUpKey());
                };

                scope._deleteLookUpKey = function (keyObjIndex) {

                    scope.roleLookUpKeys.splice(keyObjIndex, 1);
                };


                // WATCHERS
                var watchRole = scope.$watch('role', function(newValue, oldValue) {

                    if (!newValue) return false;

                    scope.roleLookUpKeys = null;

                    if (scope.newRole) {

                        scope.roleLookUpKeys = [];
                    }
                    else {

                        scope.roleLookUpKeys = [];
                        angular.forEach(newValue.record.role_lookup_by_role_id, function(lkObj) {

                            scope.roleLookUpKeys.push(new LookUpKey(lkObj));
                        })
                    }
                });

                var watchSameKeys = scope.$watch('sameKeys', function (newValue, oldValue) {

                    if (newValue.length === 0 && scope.roleLookUpKeys.length === 0) {
                        scope.lookupKeysError = false;
                        return;
                    }


                    if (newValue.length === 0 && scope.roleLookUpKeys.length > 0) {

                        angular.forEach(scope.roleLookUpKeys, function (lk) {

                            lk.__dfUI.unique = true;
                            scope.lookupKeysError = false;
                        });

                        return;
                    }


                    angular.forEach(scope.roleLookUpKeys, function (lk) {

                        angular.forEach(newValue, function (_lk) {

                            if (lk.record.name === _lk.record.name) {
                                lk.__dfUI.unique = false;


                            }else {
                                lk.__dfUI.unique = true;
                            }
                        })
                    })

                    scope.lookupKeysError = true;
                });

                var watchLookupKeys = scope.$watchCollection('roleLookUpKeys', function (newValue, oldValue) {

                    if (!newValue) return;

                    // Did we add or remove a key
                    // if so check if everything is unique again
                    scope._isUniqueKey();

                });


                // MESSAGES

                scope.$on('$destroy', function(e) {
                    watchRole();
                    watchSameKeys();
                    watchLookupKeys();

                });
            }
        }
    }]);

