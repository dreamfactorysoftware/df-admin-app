'use strict';


angular.module('dfRoles', ['ngRoute', 'dfUtility', 'dfApplication', 'dfTable'])
    .constant('MOD_ROLES_ROUTER_PATH', '/roles')
    .constant('MOD_ROLES_ASSET_PATH', 'admin_components/adf-roles/')
    .config(['$routeProvider', 'MOD_ROLES_ROUTER_PATH', 'MOD_ROLES_ASSET_PATH',
        function ($routeProvider, MOD_ROLES_ROUTER_PATH, MOD_ROLES_ASSET_PATH) {
            $routeProvider
                .when(MOD_ROLES_ROUTER_PATH, {
                    templateUrl: MOD_ROLES_ASSET_PATH + 'views/main.html',
                    controller: 'RolesCtrl',
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

    .controller('RolesCtrl', ['$rootScope', '$scope', '$q', 'dfApplicationData', 'SystemConfigDataService', 'dfNotify', '$location',
        function ($rootScope, $scope, $q, dfApplicationData, SystemConfigDataService, dfNotify, $location) {

        $scope.$parent.title = 'Roles';
        $scope.$parent.titleIcon = 'exclamation-circle';

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

        // set empty search result message
        $scope.emptySearchResult = {
            title: 'You have no Roles that match your search criteria!',
            text: ''
        };

        $scope.adldap = 0;
        var systemConfig = SystemConfigDataService.getSystemConfig();
        if (systemConfig && systemConfig.authentication && systemConfig.authentication.hasOwnProperty('adldap')) {
            $scope.adldap = systemConfig.authentication.adldap.length;
        }

        // Set empty section options
        $scope.emptySectionOptions = {
            title: 'You have no Roles!',
            text: 'Click the button below to get started creating your first role.  You can always create new roles by clicking the tab located in the section menu to the left.',
            buttonText: 'Create A Role!',
            viewLink: $scope.links[1],
            active: false
        };

        $scope.$on('$destroy', function (e) {

            // dump data if not on page 1
            $scope.$broadcast('toolbar:paginate:role:destroy');
        });

        // load data

        $scope.apiData = null;

        $scope.loadTabData = function(init) {

            $scope.dataLoading = true;

            var apis = ['role', 'service_list', 'service_type_list'];

            dfApplicationData.getApiData(apis).then(
                function (response) {
                    var newApiData = {};
                    apis.forEach(function(value, index) {
                        newApiData[value] = response[index].resource ? response[index].resource : response[index];
                    });
                    $scope.apiData = newApiData;
                    if (init) {
                        $scope.$broadcast('toolbar:paginate:role:load');
                    }
                },
                function (error) {
                    var msg = 'To use the Roles tab your role must allow GET access to service \'system\' and system/role/*. To create, update, or delete roles you need POST, PUT, DELETE access to /system/role/*.';

                    if (error && error.error && (error.error.code === 401 || error.error.code === 403)) {
                        $location.url('/home');
                    }

                    var messageOptions = {
                        module: 'Roles',
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

    .directive('dfRoleDetails', ['MOD_ROLES_ASSET_PATH', 'dfApplicationData', 'dfNotify', 'dfObjectService', '$q', 'SystemConfigDataService', 'dfSystemData', '$timeout', function (MOD_ROLES_ASSET_PATH, dfApplicationData, dfNotify, dfObjectService, $q, SystemConfigDataService, dfSystemData, $timeout) {

        return {

            restrict: 'E',
            scope: {
                roleData: '=?',
                newRole: '=?',
                apiData: '=?'
            },
            templateUrl: MOD_ROLES_ASSET_PATH + 'views/df-role-details.html',
            link: function (scope, elem, attrs) {

                scope.adldap = 0;
                var systemConfig = SystemConfigDataService.getSystemConfig();
                if (systemConfig && systemConfig.authentication && systemConfig.authentication.hasOwnProperty('adldap')) {
                    scope.adldap = systemConfig.authentication.adldap.length;
                }

                // @TODO: Refactor to factory.
                var Role = function (roleData) {

                    var newRole = {
                        name: null,
                        description: null,
                        is_active: false,
                        default_app_id: null,
                        role_service_access_by_role_id: [],
                        id: null,
                        lookup_by_role_id: []
                    };

                    roleData = roleData || newRole;

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: angular.copy(roleData),
                        recordCopy: angular.copy(roleData)
                    };
                };

                scope.basicInfoError = false;

                scope.role = null;
                scope.isBasicTab = true;

                // Is this going to be a new Role
                if (scope.newRole) {
                    scope.role = new Role();
                }

                // PUBLIC API

                scope.saveRole = function () {

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

                scope.cancelEditor = function () {

                    // merge data from UI into current edit record
                    scope._prepareRoleData();

                    // then compare to original edit record
                    if (!dfObjectService.compareObjectsAsJson(scope.role.record, scope.role.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return;
                        }
                    }

                    scope.closeEditor();
                };


                // PRIVATE API

                scope._prepareRoleData = function () {

                    if (!scope.role.record.name) {
                        scope.basicInfoError = true;
                        return;
                    } else {
                        scope.basicInfoError = false;
                    }

                    if(scope.adldap && scope.role.record.dn){
                        scope.role.record.role_adldap_by_role_id = (scope.role.record.id)? {'role_id':scope.role.record.id, 'dn':scope.role.record.dn} : {'dn':scope.role.record.dn};
                        delete scope.role.record.dn;
                    }

                    scope._prepareServiceAccessData();
                    scope._prepareRoleLookUpKeysData();
                };

                scope.refreshRoleEditor = function ($event) {
                    scope.isBasicTab = $event.target.id === 'basic-tab';
                };

                scope.refreshRoleAccessEditor = function () {

                    // click Access tab
                    $timeout(function () {
                        angular.element('#access-tab').trigger('click');
                    });
                };

                scope.closeEditor = function () {

                    // same object as currentEditRole used in ng-show
                    scope.roleData = null;

                    scope.role = new Role();

                    // reset tabs
                    $timeout(function () {
                        angular.element('#basic-tab').trigger('click');
                    });


                    // reset errors
                    scope.lookupKeysError = false;
                    scope.basicInfoError = false;

                    // force to manage view
                    scope.$emit('sidebar-nav:view:reset');
                };


                // COMPLEX IMPLEMENTATION

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

                scope._saveRole = function () {

                    // merge data from UI into current edit record
                    scope._prepareRoleData();

                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'role_service_access_by_role_id,lookup_by_role_id'
                        },
                        data: scope.role.record
                    };

                    dfApplicationData.saveApiData('role', requestDataObj).$promise.then(

                        function (result) {

                            var messageOptions = {
                                module: 'Roles',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Role saved successfully.'

                            };

                            dfNotify.success(messageOptions);

                            scope.closeEditor();
                        },

                        function (reject) {
                            var msg = reject.data.message;
                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: msg ? msg : reject

                            };

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function () {

                        }
                    );
                };

                scope._updateRole = function () {

                    // merge data from UI into current edit record
                    scope._prepareRoleData();

                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'role_service_access_by_role_id,lookup_by_role_id'
                        },
                        data: scope.role.record
                    };

                    dfApplicationData.updateApiData('role', requestDataObj).$promise.then(

                        function (result) {

                            // why is this here? role should be reset by closeEditor()

                            if(scope.adldap) {
                                dfSystemData.resource({
                                    params: {
                                        fields: '*',
                                        related: 'role_adldap_by_role_id'
                                    }
                                }).get({'api': 'role', 'id': result.id, 'related': 'role_adldap_by_role_id'}).$promise.then(
                                    function (adResult) {
                                        if (adResult.role_adldap_by_role_id && (adResult.role_adldap_by_role_id.length > 0 || adResult.role_adldap_by_role_id.hasOwnProperty('dn'))) {
                                            if(adResult.role_adldap_by_role_id.length > 0) {
                                                result.dn = adResult.role_adldap_by_role_id[0].dn;
                                            } else {
                                                result.dn = adResult.role_adldap_by_role_id.dn;
                                            }
                                        }
                                        scope.role = new Role(result);
                                    },
                                    function (reject) {
                                        scope.role = new Role(result);
                                    }
                                );
                            } else {
                                scope.role = new Role(result);
                            }

                            var messageOptions = {
                                module: 'Roles',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Role updated successfully.'

                            };

                            dfNotify.success(messageOptions);

                            scope.closeEditor();
                        },

                        function (reject) {
                            var msg = reject.data.message;

                            if (scope.role.record.role_adldap_by_role_id && (scope.role.record.role_adldap_by_role_id.length > 0 || scope.role.record.role_adldap_by_role_id.hasOwnProperty('dn'))) {
                                if(scope.role.record.role_adldap_by_role_id.length > 0) {
                                    scope.role.record.dn = scope.role.record.role_adldap_by_role_id[0].dn;
                                } else {
                                    scope.role.record.dn = scope.role.record.role_adldap_by_role_id.dn;
                                }
                            }
                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: msg ? msg : reject
                            };

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function () {

                        }
                    );
                };

                scope._deleteRole = function () {

                    var requestDataObj = {
                        params: {},
                        data: scope.role.record
                    };

                    dfApplicationData.deleteApiData('role', requestDataObj).$promise.then(

                        function (result) {

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

                        function (reject) {
                            var msg = reject.data.message;
                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: msg ? msg : reject
                            };

                            dfNotify.error(messageOptions);

                        }
                    ).finally(
                        function () {

                        }
                    );
                };

                // WATCHERS

                // this fires when a record is selected for editing
                // roleData is passed in to the directive as data-role-data
                var watchRoleData = scope.$watch('roleData', function (newValue, oldValue) {

                    if (newValue && !scope.newRole) {
                        scope.role = new Role(newValue);
                    }
                });

                var watchServiceData = scope.$watchCollection('apiData.service_list', function (newValue, oldValue) {

                    if (!newValue) {
                        return;
                    }

                    scope.services = angular.copy(newValue);

                    // The array scope.services needs to be sorted by name before shifting 'All to the top'


                    // function compare( a, b ) {
                    //     if ( a.name < b.name ){
                    //       return -1;
                    //     }
                    //     if ( a.name > b.name ){
                    //       return 1;
                    //     }
                    //     return 0;
                    //   }
                    //   scope.services.sort(compare);

                    // ************ Refactoring (lines 483 to 492) ******************

                      scope.services.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))


                    // The below will force 'All' to appear at the top of the dropdown options list.
                    if (scope.services[0].name !== 'All') {
                        scope.services.unshift({id: null, name: 'All'});
                    }

                    angular.forEach(scope.services, function (svc) {

                        if (!svc.components) {
                            svc.components = ["", "*"];
                        }
                        
                    });
                });

                // MESSAGES

                scope.$on('$destroy', function (e) {

                    watchRoleData();
                    watchServiceData();
                });

                // HELP

                scope.dfSimpleHelp = {
                    serviceAccess: {
                        title: 'Role Service Access Information',
                        text: 'Access rules for DreamFactory services. Use caution when allowing system access.'
                    }
                };

                scope.dfLargeHelp = {

                    basic: {
                        title: 'Roles Overview',
                        text: 'Roles provide a way to grant or deny API access to specific' +
                        ' services or apps.'
                    },
                    access: {
                        title: 'Access Overview',
                        text: 'This section allows you set set up rules for a role restricting what' +
                        ' services and components users assigned to the role will have access to.' +
                        ' Advanced Filters are for implementing additional server side filter logic ' +
                        'on database transactions.'
                    },
                    lookupkeys: {
                        title: 'Lookup Keys Overview',
                        text: 'The DreamFactory administrator can create any number of "key value" pairs attached to a ' +
                        'role. The key values are automatically substituted on the server. For example, key ' +
                        'names can be used in the username and password fields required to hook up a SQL or ' +
                        'NoSQL database. They can also be used in Email Templates or as parameters for external ' +
                        'REST services. Any Lookup Key can be marked as private, and in this case the key value ' +
                        'is securely encrypted on the server and is no longer accessible through the platform ' +
                        'interface.<span style="color: red;">  Lookup keys for service configuration and credentials must be made private.</span>'
                    }
                };
            }
        };
    }])

    .directive('assignServiceAccess', ['MOD_ROLES_ASSET_PATH', 'dfNotify', function (MOD_ROLES_ASSET_PATH, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_ROLES_ASSET_PATH + 'views/df-assign-service-access.html',
            link: function (scope, elem, attrs) {

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
                            "filter_op": "AND"
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

/*
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
*/

                // COMPLEX IMPLEMENTATION

                scope._addServiceAccess = function () {

                    scope.roleServiceAccesses.push(new ServiceAccess());
                };

                scope._removeServiceAccess = function (serviceAccessObjIndex) {
                    if (!scope.roleServiceAccesses[serviceAccessObjIndex].record.id) {
                      scope.roleServiceAccesses.splice(serviceAccessObjIndex, 1);
                    } else {
                        scope.roleServiceAccesses[serviceAccessObjIndex].record.role_id = null;
                    }
                };

                scope._getService = function (serviceId) {

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
                    };

                    dfNotify.error(messageOptions);
                };


                // WATCHERS
                var watchRole = scope.$watch('role', function (newValue, oldValue) {

                    if (!newValue) {
                        return false;
                    }

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

                            // store on the scope
                            scope.roleServiceAccesses.push(_newSA);
                        });
                    }
                });

                // MESSAGES

                scope.$on('$destroy', function (newValue, oldValue) {

                    watchRole();
                });
            }
        };
    }])

    .directive('dfServiceAccess', ['MOD_ROLES_ASSET_PATH', 'dfNotify', '$http', 'INSTANCE_URL', 'serviceTypeToGroup', function (MOD_ROLES_ASSET_PATH, dfNotify, $http, INSTANCE_URL, serviceTypeToGroup) {

        return {

            restrict: 'E',
            replace: true,
            scope: {
                serviceAccess: '=',
                index: '=',
                apiData: '='
            },
            templateUrl: MOD_ROLES_ASSET_PATH + 'views/df-service-access.html',
            link: function (scope, elem, attrs) {

                // @TODO: Refactor to factory.
                var ServiceAccessFilter = function () {

                    return {
                        "name": "",
                        "operator": "=",
                        "value": ""
                    };
                };

                scope.filterOperators = [
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

                scope.toggleServiceFilterOp = function () {

                    scope._toggleServiceFilterOp();
                };


                // PRIVATE API

                scope.allowFilters = function () {

                    var type = scope.serviceAccess.record.service.type;
                    var group = serviceTypeToGroup(type, scope.apiData['service_type_list']);
                    scope.serviceAccess.__dfUI.allowFilters = (group === 'Database' && type !== 'couchdb');
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

                // PRIVATE API

                scope._getComponents = function () {

                    var name = scope.serviceAccess.record.service.name;

                    return $http.get(INSTANCE_URL.url + '/' + name + '/?as_list=true');
                };
                
                // WATCHERS

                var watchServiceAccessRecordService = scope.$watch('serviceAccess.record.service', function (newValue, oldValue) {

                    if (!newValue) {
                        return false;
                    }

                    scope.serviceAccess.__dfUI.hasError = false;

                    // set filters if allowed
                    scope.allowFilters();

                    
                    // update service_id prop
                    scope.serviceAccess.record.service_id = newValue.id;

                    var name = scope.serviceAccess.record.service.name;
                    var group = serviceTypeToGroup(scope.serviceAccess.record.service.type, scope.apiData['service_type_list']);
                    if (name === 'All' || group === null || group === 'Email') {
                        // use default components
                        return;

                    }

                    // try to get actual components

                    var components = ['', '*'];

                    scope._getComponents().then(

                        function (result) {

                            components = result.data.resource;

                        },
                        
                        function (reject) {
                            
                            scope.serviceAccess.__dfUI.hasError = true;
                            scope.serviceAccess.record.component = null;
                            
                            var messageOptions = {
                                module: 'Roles',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            
                            dfNotify.error(messageOptions);
                        }
                        ).finally(
                            function () {
                                scope.serviceAccess.record.service.components = components;
                            }
                            );

                });


                // MESSAGES

                scope.$on('$destroy', function (e) {

                    watchServiceAccessRecordService();
                });
            }
        };
    }])

    .directive('dfManageRoles', ['$rootScope', 'MOD_ROLES_ASSET_PATH', 'dfApplicationData', 'dfNotify', 'dfSystemData', 'SystemConfigDataService', function ($rootScope, MOD_ROLES_ASSET_PATH, dfApplicationData, dfNotify, dfSystemData, SystemConfigDataService) {

        return {

            restrict: 'E',
            scope: false,
            templateUrl: MOD_ROLES_ASSET_PATH + 'views/df-manage-roles.html',
            link: function (scope, elem, attrs) {

                // @TODO: Refactor to factory.
                var ManagedRole = function (roleData) {

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: roleData
                    };
                };

                scope.adldap = 0;
                var systemConfig = SystemConfigDataService.getSystemConfig();
                if (systemConfig && systemConfig.authentication && systemConfig.authentication.hasOwnProperty('adldap')) {
                    scope.adldap = systemConfig.authentication.adldap.length;
                }
                scope.roles = null;

                scope.currentEditRole = null;



                scope.fields = [
                    {
                        name: 'id',
                        label: 'label',
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
                    if(scope.adldap) {
                        dfSystemData.resource({
                            params: {
                                fields: '*',
                                related: 'role_adldap_by_role_id'
                            }
                        }).get({'api': 'role', 'id': role.id, 'related': 'role_adldap_by_role_id'}).$promise.then(
                            function (result) {
                                if (result.role_adldap_by_role_id && (result.role_adldap_by_role_id.length > 0 || result.role_adldap_by_role_id.hasOwnProperty('dn'))) {
                                    if(result.role_adldap_by_role_id.length > 0) {
                                        role.dn = result.role_adldap_by_role_id[0].dn;
                                    } else {
                                        role.dn = result.role_adldap_by_role_id.dn;
                                    }
                                }
                                scope._editRole(role);
                            },
                            function (reject) {
                                scope._editRole(role);
                            }
                        );
                    } else {
                        scope._editRole(role);
                    }
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


                // COMPLEX IMPLEMENTATION

                scope._editRole = function (role) {
                    scope.currentEditRole = role;
                };

                scope._deleteRole = function (role) {

                    var requestDataObj = {
                        params: {},
                        data: role.record
                    };

                    dfApplicationData.deleteApiData('role', requestDataObj).$promise.then(

                        function (result) {

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
                            }

                            scope.$broadcast('toolbar:paginate:role:delete');
                        },

                        function (reject) {

                            // notify success
                            var msg = reject.data.message;
                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: msg ? msg : reject
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

                scope._setSelected = function (role) {

                    var i = 0;

                    while (i < scope.selectedRoles.length) {

                        if (role.record.id === scope.selectedRoles[i]) {

                            role.__dfUI.selected = false;
                            scope.selectedRoles.splice(i, 1);
                            return;
                        }

                        i++;
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

                    dfApplicationData.deleteApiData('role', requestDataObj).$promise.then(

                        function (result) {

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

                        function (reject) {
                            var msg = reject.data.message;
                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: msg ? msg : reject
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
                var watchApiData = scope.$watchCollection(function(){
                   // this is how the table repopulates after an update
                    return dfApplicationData.getApiDataFromCache('role');
                
                }, function (newValue, oldValue) {

                    var _roles = [];

                    if (newValue) {
                        angular.forEach(newValue, function (role) {
                            _roles.push(new ManagedRole(role));
                        });
                        scope.emptySectionOptions.active = (newValue.length === 0);
                    }

                    scope.roles = _roles;
    
                });


                // MESSAGES

                // broadcast by pagination code when new data is available
                scope.$on('toolbar:paginate:role:update', function (e) {

                    scope.loadTabData();
                });
                
                scope.$on('$destroy', function (e) {

                    // Destroy watchers
                    watchApiData();

                    // when filter is changed the controller is reloaded and we get destroy event
                    // the reset event tells pagination engine to update based on filter
                    scope.$broadcast('toolbar:paginate:role:reset');
                });
            }
        };
    }])

    .directive('dfRoleLoading', [function() {
      return {
        restrict: 'E',
        template: "<div class='col-lg-12' ng-if='dataLoading'><span style='display: block; width: 100%; text-align: center; color: #A0A0A0; font-size: 50px; margin-top: 100px'><i class='fa fa-refresh fa-spin'></i></div>"
      };
    }])

    .directive('dfAssignLookUpKeys', ['MOD_ROLES_ASSET_PATH', function (MOD_ROLES_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_ROLES_ASSET_PATH + 'views/df-assign-lookup-keys.html',
            link: function (scope, elem, attrs) {

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
                };

                scope.roleLookUpKeys = [];

                scope.sameKeys = [];

                scope.lookupKeysError = false;


                // PUBLIC API

                scope.addLookUpKey = function () {

                    scope._addLookUpKey();
                };

                scope.deleteLookUpKey = function (keyObjIndex) {

                    scope._deleteLookUpKey(keyObjIndex);
                };


                // PRIVATE API

                scope._prepareRoleLookUpKeysData = function () {

                    var tempArr = [];

                    angular.forEach(scope.roleLookUpKeys, function (lk) {

                        tempArr.push(lk.record);
                    });

                    scope.role.record.lookup_by_role_id = tempArr;
                };

                scope._isUniqueKey = function () {

                    scope.sameKeys = [];

                    angular.forEach(scope.roleLookUpKeys, function (value, index) {
                        angular.forEach(scope.roleLookUpKeys, function (_value, _index) {

                            if (index === _index) return;

                            if (value.record.name === _value.record.name) {
                                scope.sameKeys.push(value);
                            }
                        });
                    });
                };


                // COMPLEX IMPLEMENTATION

                scope._addLookUpKey = function () {

                    scope.roleLookUpKeys.push(new LookUpKey());
                };

                scope._deleteLookUpKey = function (keyObjIndex) {
                    if (scope.roleLookUpKeys[keyObjIndex].record.role_id !== undefined) {
                        scope.roleLookUpKeys[keyObjIndex].record.role_id = null;
                    }
                    else {
                        scope.roleLookUpKeys.splice(keyObjIndex, 1);
                    }
                };


                // WATCHERS

                var watchRole = scope.$watch('role', function (newValue, oldValue) {

                    if (!newValue) {
                        return false;
                    }

                    scope.roleLookUpKeys = null;

                    if (scope.newRole) {

                        scope.roleLookUpKeys = [];
                    }
                    else {

                        scope.roleLookUpKeys = [];
                        angular.forEach(newValue.record.lookup_by_role_id, function (lkObj) {

                            scope.roleLookUpKeys.push(new LookUpKey(lkObj));
                        });
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
                            } else {
                                lk.__dfUI.unique = true;
                            }
                        });
                    });

                    scope.lookupKeysError = true;
                });

                var watchLookupKeys = scope.$watchCollection('roleLookUpKeys', function (newValue, oldValue) {

                    if (!newValue) {
                        return;
                    }

                    // Did we add or remove a key
                    // if so check if everything is unique again
                    scope._isUniqueKey();
                });


                // MESSAGES

                scope.$on('$destroy', function (e) {
                    watchRole();
                    watchSameKeys();
                    watchLookupKeys();
                });
            }
        };
    }]);
