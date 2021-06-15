'use strict';


angular.module('dfServices', ['ngRoute', 'dfUtility', 'dfApplication'])
    .constant('MOD_SERVICES_ROUTER_PATH', '/services')
    .constant('MOD_SERVICES_ASSET_PATH', 'admin_components/adf-services/')
    .config(['$routeProvider', 'MOD_SERVICES_ROUTER_PATH', 'MOD_SERVICES_ASSET_PATH',
        function ($routeProvider, MOD_SERVICES_ROUTER_PATH, MOD_SERVICES_ASSET_PATH) {
            $routeProvider
                .when(MOD_SERVICES_ROUTER_PATH, {
                    templateUrl: MOD_SERVICES_ASSET_PATH + 'views/main.html',
                    controller: 'ServicesCtrl',
                    resolve: {
                        checkUser: ['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }])

    .run([function () {

    }])

    // We will use this factory to be able to send the currently selected service to the scripts controller
    // (ScriptsCtrl). This will allow the service's scripts to directly load when going there from the
    // services tab. currentService will be populated when goToSelectedServiceScripts() is called.
    .factory('dfSelectedService', function () {
        return {
            currentService: null,
            selectedRelatedRole: null
        };
    })

    .controller('ServicesCtrl', ['$rootScope', '$scope', 'dfApplicationData', 'dfNotify', '$location', function ($rootScope, $scope, dfApplicationData, dfNotify, $location) {

        $scope.$parent.title = 'Services';
        $scope.$parent.titleIcon = 'cubes';

        // Provide rootscope to the roles related to a Service, which will load in at the time
        // a particular Service is selected
        $scope.relatedRoles = [];

        // Set module links
        $scope.links = [
            {
                name: 'manage-services',
                label: 'Manage',
                path: 'manage-services'
            },
            {
                name: 'create-service',
                label: 'Create',
                path: 'create-service'
            }
        ];

        // set empty search result message
        $scope.emptySearchResult = {
            title: 'You have no Services that match your search criteria!',
            text: ''
        };

        // Set empty section options
        $scope.emptySectionOptions = {
            title: 'You have no Services!',
            text: 'Click the button below to get started building your first Service.  You can always create new services by clicking the "Create" tab located in the section menu to the left.',
            buttonText: 'Create A Service!',
            viewLink: $scope.links[1]
        };

        $scope.$on('$destroy', function (e) {

            // dump data if not on page 1
            $scope.$broadcast('toolbar:paginate:service:destroy');
        });

        // load data

        $scope.apiData = null;

        $scope.loadTabData = function (init) {

            $scope.dataLoading = true;

            // eventlist is loaded only as needed to improve user experience
            var apis = ['service', 'service_link', 'storage_service_link', 'service_type'];

            dfApplicationData.getApiData(apis).then(
                function (response) {
                    var newApiData = {};
                    apis.forEach(function (value, index) {
                        newApiData[value] = response[index].resource ? response[index].resource : response[index];
                    });
                    $scope.apiData = newApiData;
                    if (init) {
                        $scope.$broadcast('toolbar:paginate:service:load');
                    }
                },
                function (error) {
                    var msg = 'There was an error loading data for the Services tab. Please try refreshing your browser and logging in again.';
                    if (error && error.error && (error.error.code === 401 || error.error.code === 403)) {
                        msg = 'To use the Services tab your role must allow GET access to system/service and system/service_type. To create, update, or delete services you need POST, PUT, DELETE access to /system/service and/or /system/service/*.';
                        $location.url('/home');
                    }
                    var messageOptions = {
                        module: 'Services',
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

    .directive('dfServiceLoading', [function () {
        return {
            restrict: 'E',
            template: "<div class='col-lg-12' ng-if='dataLoading'><span style='display: block; width: 100%; text-align: center; color: #A0A0A0; font-size: 50px; margin-top: 100px'><i class='fa fa-refresh fa-spin'></i></div>"
        };
    }])

    .directive('dfManageServices', ['$rootScope', 'MOD_SERVICES_ASSET_PATH', 'dfApplicationData', 'dfNotify', '$http', 'INSTANCE_URL', 'dfSelectedService', function ($rootScope, MOD_SERVICES_ASSET_PATH, dfApplicationData, dfNotify, $http, INSTANCE_URL, dfSelectedService) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-manage-services.html',
            link: function (scope, elem, attrs) {

                var ManagedService = function (serviceData) {

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: serviceData
                    };
                };

                // array of ManagedService objects, updated by watcher for apiData.service
                scope.services = [];

                // the service currently being edited, set by editService when a service is clicked on in the table view
                // this is passed to the dfServiceDetails directive as 'serviceData'
                scope.currentEditService = null;

                // for selecting services to delete in the table view
                scope.selectedServices = [];

                // When a Service is selected, make an api call to get the Roles that are related with it.
                var getRelatedRoles = function () {

                    scope.$root.dataLoading = true;

                    $http({
                        method: 'GET',
                        url: INSTANCE_URL.url + '/system/role',
                        params: {"related": "role_service_access_by_role_id,lookup_by_role_id"}
                    }).then(
                        function (result) {
                            var currentServiceID = scope.currentEditService.id;
                            var roles = result.data.resource;

                            // The API Loads in all roles, we only want the roles that are associated
                            // with the current Service in question.
                            var relatedRoles = roles.reduce(function (filtered, role) {
                                // Because not all roles will have a service associated with them, we 
                                // need to check that the JOIN exists. If it does we will create the new
                                // array. 
                                var roleServiceAccessArray = role.role_service_access_by_role_id
                                if (roleServiceAccessArray.length != 0) {
                                    roleServiceAccessArray.forEach(function (service) {
                                        if (service.service_id === currentServiceID) {
                                            var relatedRole = role;
                                            filtered.push(relatedRole);
                                        }
                                    });
                                }
                                return filtered;
                            }, []);
                            // Assign the array of related Roles, and pass it up to the controller so
                            // that our view in df-service-info is able to iterate and create a list.
                            scope.$root.relatedRoles = relatedRoles;
                        },
                        function (reject) {
                            var messageOptions = {
                                module: 'Roles',
                                provider: 'dreamfactory',
                                type: 'error',
                                message: reject
                            };
                            dfNotify.error(messageOptions);
                        }
                    ).finally(function () {
                        scope.$root.dataLoading = false;
                    });
                };

                scope.editService = function (service) {

                    scope.currentEditService = service;
                    getRelatedRoles();
                };

                scope.deleteService = function (service) {

                    if (dfNotify.confirm("Delete " + service.record.label + "?")) {

                        var requestDataObj = {
                            params: {
                                id: service.record.id
                            }
                        };

                        dfApplicationData.deleteApiData('service', requestDataObj).$promise.then(
                            function (result) {

                                // notify success
                                var messageOptions = {
                                    module: 'Services',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: 'Service successfully deleted.'
                                };

                                dfNotify.success(messageOptions);

                                // Was this service previously selected before
                                // we decided to remove them individually
                                if (service.__dfUI.selected) {

                                    // This will remove the service from the selected
                                    // service array
                                    scope.setSelected(service);
                                }

                                scope.$broadcast('toolbar:paginate:service:delete');
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
                    }
                };

                scope.deleteSelectedServices = function () {

                    if (dfNotify.confirm("Delete selected services?")) {

                        var requestDataObj = {
                            params: {
                                ids: scope.selectedServices.join(','),
                                rollback: true
                            }
                        };

                        dfApplicationData.deleteApiData('service', requestDataObj).$promise.then(
                            function (result) {

                                var messageOptions = {
                                    module: 'Services',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: 'Services deleted successfully.'
                                };

                                dfNotify.success(messageOptions);

                                scope.selectedServices = [];

                                scope.$broadcast('toolbar:paginate:service:reset');
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
                    }
                };

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
                        name: 'label',
                        label: 'Label',
                        active: true
                    },
                    {
                        name: 'description',
                        label: 'Description',
                        active: true
                    },
                    {
                        name: 'type',
                        label: 'Type',
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

                scope.orderOnSelect = function (fieldObj) {

                    var orderedBy = scope.order.orderBy;

                    if (orderedBy === fieldObj.name) {
                        scope.order.orderByReverse = !scope.order.orderByReverse;
                    } else {
                        scope.order.orderBy = fieldObj.name;
                        scope.order.orderByReverse = false;
                    }
                };

                scope.setSelected = function (service) {

                    var i = 0;

                    // if already selected then unselect
                    while (i < scope.selectedServices.length) {

                        if (service.record.id === scope.selectedServices[i]) {

                            service.__dfUI.selected = false;
                            scope.selectedServices.splice(i, 1);
                            return;
                        }

                        i++;
                    }

                    // select
                    service.__dfUI.selected = true;
                    scope.selectedServices.push(service.record.id);
                };

                // WATCHERS

                // this fires when the API data changes
                // apiData is passed in to the details directive as data-api-data
                var watchApiServiceData = scope.$watchCollection(function () {
                    // this is how the table repopulates after an update
                    return dfApplicationData.getApiDataFromCache('service');
                }, function (newValue, oldValue) {

                    var _services = [];

                    if (newValue) {
                        angular.forEach(newValue, function (service) {
                            _services.push(new ManagedService(service));
                        });
                        scope.emptySectionOptions.active = (newValue.length === 0);
                    }

                    scope.services = _services;
                });


                // MESSAGES

                // broadcast by pagination code when new data is available
                scope.$on('toolbar:paginate:service:update', function (e) {

                    scope.loadTabData();
                });

                scope.$on('$destroy', function (e) {

                    // Destroy watchers
                    watchApiServiceData();

                    // Clear the Roles associated with the Service we had selected.
                    scope.$root.relatedRoles = [];

                    // when filter is changed the controller is reloaded and we get destroy event
                    // the reset event tells pagination engine to update based on filter
                    scope.$broadcast('toolbar:paginate:service:reset');
                });
            }
        };
    }])

    .directive('dfServiceDetails', ['MOD_SERVICES_ASSET_PATH', '$q', 'dfApplicationData', 'dfNotify', 'dfObjectService', '$timeout', '$http', 'INSTANCE_URL',
        function (MOD_SERVICES_ASSET_PATH, $q, dfApplicationData, dfNotify, dfObjectService, $timeout, $http, INSTANCE_URL) {

            return {

                restrict: 'E',
                scope: {
                    serviceData: '=?',
                    newService: '=?',
                    apiData: '=?'
                },
                templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-service-details.html',
                link: function (scope, elem, attrs) {
                    scope.isInfoTab = true;

                    var ServiceDetails = function (service) {

                        var newService = {
                            "id": null,
                            "name": '',
                            "label": '',
                            "description": '',
                            "is_active": true,
                            "type": "",
                            "config": {},
                            "service_doc_by_service_id": null
                        };

                        service = service || newService;

                        // Convert object from config types to array. Used with config.options.
                        // This will be undone by normalizeKeyValuePairs() on Save or Update.
                        //
                        // {"username":"bn_df","password":"23e4bedd53"}
                        //
                        // becomes
                        //
                        // [{"key":"username","value":"bn_df"},{"key":"password","value":"23e4bedd53"}]

                        if (service && service.config) {
                            Object.keys(service.config).forEach(function (key) {
                                if (service.config[key] && service.config[key].constructor === Object) {
                                    var arr = [];
                                    Object.keys(service.config[key]).forEach(function (objKey) {
                                        arr.push({key: objKey, value: service.config[key][objKey]});
                                    });
                                    service.config[key] = arr;
                                }
                            });
                        }

                        return {
                            __dfUI: {
                                selected: false
                            },
                            record: angular.copy(service),
                            recordCopy: angular.copy(service)
                        };
                    };

                    // the service being edited, set by watcher on serviceData
                    // this is where we store the current record and a backup copy for comparison
                    // data gets exploded from serviceDetails.record into serviceInfo, serviceConfig, serviceDefinition
                    // the user edits these copies, then on save or update prepareServiceData() does the reverse to update
                    // serviceDetails.record
                    scope.serviceDetails = null;

                    // all service types
                    scope.editableServiceTypes = [];

                    // all service types except non-creatable ones like system or user
                    scope.creatableServiceTypes = [];

                    function __throwApiError(infoData) {

                        var field = '';
                        if (!infoData.name && !infoData.label) {
                            field = 'namespace and label fields';
                        } else if (!infoData.name) {
                            field = 'namespace field';
                        } else {
                            field = 'label field';
                        }

                        var msg = 'Invalid data supplied. The ' + field + ' is required.';
                        var messageOptions = {
                            module: 'Api Error',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: msg

                        };

                        dfNotify.error(messageOptions);
                    }

                    scope.saveOrUpdateService = function () {


                        if (!scope.serviceInfo.name || !scope.serviceInfo.label) {
                            scope.serviceInfoError = true;
                            __throwApiError(scope.serviceInfo);
                            return;
                        } else {
                            scope.serviceInfoError = false;
                        }

                        if (scope.newService) {

                            scope.saveService();
                        } else {

                            scope.updateService();
                        }
                    };

                    scope.cancelEditor = function () {

                        // merge data from UI into current edit record
                        scope.prepareServiceData();

                        // then compare to original edit record
                        if (!dfObjectService.compareObjectsAsJson(scope.serviceDetails.record, scope.serviceDetails.recordCopy)) {

                            if (!dfNotify.confirmNoSave()) {

                                return false;
                            }
                        }

                        scope.closeEditor();
                    };

                    scope.prepareServiceData = function () {

                        // merge settings from each tab into base record
                        scope.serviceDetails.record = scope.prepareServiceInfo();
                        scope.serviceDetails.record.config = scope.prepareServiceConfig();
                        scope.serviceDetails.record.service_doc_by_service_id = scope.prepareServiceDefinition();
                    };

                    scope.clearCache = function () {
                        $http.delete(INSTANCE_URL.url + '/system/cache/' + scope.serviceDetails.record.name)
                            .then(function () {
                                },
                                function (error) {

                                    var messageOptions = {
                                        module: 'Api Error',
                                        type: 'error',
                                        provider: 'dreamfactory',
                                        message: error
                                    };

                                    dfNotify.error(messageOptions);
                                });
                    };

                    scope.closeEditor = function () {

                        // same object as currentEditService used in ng-show
                        scope.serviceData = null;

                        scope.serviceDetails = new ServiceDetails();

                        // reset tabs
                        $timeout(function () {
                            angular.element('#info-tab').trigger('click');
                        });

                        // reset errors
                        scope.serviceInfoError = false;

                        // force to manage view
                        scope.$emit('sidebar-nav:view:reset');
                    };

                    // Convert array back to object. Used with config.options.
                    //
                    // [{"key":"username","value":"bn_df"},{"key":"password","value":"23e4bedd53"}]
                    //
                    // becomes
                    //
                    // {"username":"bn_df","password":"23e4bedd53"}

                    var normalizeKeyValuePairs = function () {

                        var data = angular.copy(scope.serviceDetails.record);

                        var convert = function (item) {
                            var arr = data.config[item.name];
                            data.config[item.name] = {};
                            arr.forEach(function (arrItem) {
                                data.config[item.name][arrItem.key] = arrItem.value;
                            });
                        };

                        if (scope.selectedSchema.hasOwnProperty('config_schema') && scope.selectedSchema.config_schema !== null) {
                            // convert key, value pair array to object
                            scope.selectedSchema.config_schema.forEach(function (item) {
                                if (item.type.indexOf('object') > -1 && data.config[item.name] && data.config[item.name].length) {
                                    convert(item);
                                }
                            });
                        }

                        return data;
                    };

                    scope.saveService = function () {

                        // merge data from UI into current edit record
                        scope.prepareServiceData();

                        var data = normalizeKeyValuePairs();

                        var requestDataObj = {
                            params: {
                                fields: '*',
                                related: 'service_doc_by_service_id'
                            },
                            data: data
                        };

                        dfApplicationData.saveApiData('service', requestDataObj).$promise.then(
                            function (result) {

                                var messageOptions = {
                                    module: 'Services',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: 'Service saved successfully.'

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

                    scope.updateService = function () {

                        // merge data from UI into current edit record
                        scope.prepareServiceData();

                        var data = normalizeKeyValuePairs();

                        var requestDataObj = {
                            params: {
                                fields: '*',
                                related: 'service_doc_by_service_id'
                            },
                            data: data
                        };

                        dfApplicationData.updateApiData('service', requestDataObj).$promise.then(
                            function (result) {

                                var messageOptions = {
                                    module: 'Services',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: 'Service updated successfully'
                                };

                                if (scope.selections.saveAndClearCache) {
                                    scope.clearCache();
                                    messageOptions.message = 'Service updated successfully and cache cleared.';
                                }

                                dfNotify.success(messageOptions);

                                if (scope.selections.saveAndClose) {
                                    scope.closeEditor();
                                } else {
                                    scope.serviceDetails = new ServiceDetails(result);
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

                            }
                        );
                    };

                    // Refresh the editors when switching tabs

                    scope.refreshServiceConfigEditor = function () {

                        $('#config-tab').tab('show');
                        scope.isInfoTab = false;

                        var editor = scope.serviceConfigEditorObj.editor;
                        if (editor) {
                            editor.renderer.updateText();
                            editor.resize(true);
                            editor.focus();
                        }
                    };

                    scope.refreshServiceInfoEditor = function () {
                        scope.isInfoTab = true;
                    };

                    scope.refreshServiceDefEditor = function () {
                        scope.isInfoTab = false;

                        var editor = scope.serviceDefEditorObj.editor;
                        if (editor) {
                            editor.renderer.updateText();
                            editor.resize(true);
                            editor.focus();
                        }
                    };

                    scope.serviceTypeToSchema = function (type) {

                        var types = scope.newService ? scope.creatableServiceTypes : scope.editableServiceTypes;
                        var schema = types.filter(function (item) {
                            return item.name === type;
                        });
                        if (schema.length > 0) {
                            return schema[0];
                        }
                        return null;
                    };

                    // WATCHERS

                    var watchServiceData = scope.$watch('serviceData', function (newValue, oldValue) {

                        scope.serviceDetails = new ServiceDetails(newValue);
                        scope.updateHelpText(newValue);
                    });


                    // MESSAGES

                    scope.$on('$destroy', function (e) {

                        watchServiceData();
                    });


                    // HELP

                    scope.dfHelp = {

                        createService: {
                            title: 'Create Service Information',
                            text: 'Create Service information help text'
                        }
                    };

                    scope.updateHelpText = function (record) {

                        var details, configText, serviceDefText, serviceDefReadOnlyText;

                        details = " this service ";
                        if (record && record.label) {
                            details = '<b> ' + record.label + ' </b>';
                        }
                        configText = 'Specify any service-specific configuration for' + details + 'below.';

                        details = "remote and script services";
                        if (record && record.label) {
                            details = '<b> ' + record.label + '</b>';
                        }
                        serviceDefText = 'For ' + details + ', you can specify a definition of the service below. ' +
                            'Refer to the <a target="_blank" href="https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md" title="Link to Swagger">OpenAPI docs</a> ' +
                            'for details, or build and export your own from <a target="_blank" href="http://editor.swagger.io/#/" title="Link to Swagger Editor">here</a>.';

                        details = " this service ";
                        if (record && record.label) {
                            details = '<b> ' + record.label + ' </b>';
                        }
                        serviceDefReadOnlyText = 'The service definition for ' + details + 'is pre-defined and can not be edited.';

                        scope.dfLargeHelp = {

                            basic: {
                                title: 'Services Overview',
                                text: 'Services are where you set up REST API connections to databases, file storage, email, remote web services, and more.'
                            },
                            config: {
                                title: 'Config Overview',
                                text: configText
                            },
                            serviceDef: {
                                title: 'Service Definition Overview',
                                text: serviceDefText
                            },
                            serviceDefReadOnly: {
                                title: 'Service Definition Overview',
                                text: serviceDefReadOnlyText
                            }
                        };
                    };
                }
            }
    }])
    .directive('dfServiceInfo', ['MOD_SERVICES_ASSET_PATH', 'SystemConfigDataService' , 'dfNotify', '$location', 'dfSelectedService', function (MOD_SERVICES_ASSET_PATH, SystemConfigDataService, dfNotify, $location, dfSelectedService) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-service-info.html',
            link: function (scope, elem, attrs) {

                // grouped list of service types for building service type menu
                scope.serviceTypes = [];

                scope.serviceInfoError = false;

                // this will be updated by the watcher for serviceDetails when a service is loaded into the editor
                // all user changes are applied to scope.serviceInfo
                // prepareServiceInfo copies the settings back to serviceDetails.record
                scope.serviceInfo = {};

                scope.prepareServiceInfo = function () {

                    return scope.serviceInfo;
                };

                scope.sortArray = function (groupsArray, orderArray) {
                    var result = [];

                    orderArray.forEach(function (group) {
                        if (groupsArray.indexOf(group) !== -1) {
                            result.push(group);
                        }
                    });

                    if (groupsArray.length > orderArray.length) {
                        var unsortedGroups = groupsArray.filter(function (i) {
                            return result.indexOf(i) < 0;
                        });
                        result.push.apply(result, unsortedGroups);
                    }

                    return result;
                };

                scope.updateAffectedFields = function (fieldValue, field) {

                    if (field.name === 'driver' && field.values) {
                        var foundValue = field.values.filter(function (item) {
                            return item.name === fieldValue;
                        })[0] || {};

                        scope.serviceConfig.dsn = foundValue.dsn;
                    }
                };

                scope.validateServiceName = function () {
                    var isNameValid = scope.serviceInfo.name.match(/^[a-z0-9_-]+$/);
                    if (!isNameValid || isNameValid.length === 0) {
                        var msg = 'Be sure that service name is in lowercase and alphanumeric. It should only contain letters, numbers, underscores and dashes.';
                        var messageOptions = {
                            module: 'Services',
                            provider: 'dreamfactory',
                            type: 'warning',
                            message: msg
                        };
                        dfNotify.warn(messageOptions);
                    }
                };

                scope.addMissingPaidServices = function (types) {

                    // if these paid services are not in service_type array then add them
                    // this is basically done for advertisement purposes

                    var silverServices = [{
                        "name": "adldap",
                        "label": "Active Directory",
                        "description": "A service for supporting Active Directory integration",
                        "group": "LDAP"
                    }, {
                        "name": "ldap",
                        "label": "Standard LDAP",
                        "description": "A service for supporting Open LDAP integration",
                        "group": "LDAP"
                    }, {
                        "name": "oidc",
                        "label": "OpenID Connect",
                        "description": "OpenID Connect service supporting SSO.",
                        "group": "OAuth"
                    }, {
                        "name": "oauth_azure_ad",
                        "label": "Azure Active Directory OAuth",
                        "description": "OAuth service for supporting Azure Active Directory authentication and API access.",
                        "group": "OAuth"
                    }, {
                        "name": "saml",
                        "label": "SAML 2.0",
                        "description": "SAML 2.0 service supporting SSO.",
                        "group": "SSO"
                    }, {
                        "name": "okta_saml",
                        "label": "Okta SAML",
                        "description": "Okta service supporting SSO.",
                        "group": "SSO"
                    }, {
                        "name": "auth0_sso",
                        "label": "Auth0 SSO",
                        "description": "Auth0 service supporting SSO.",
                        "group": "SSO"
                    }, {
                        "name": "ibmdb2",
                        "label": "IBM DB2",
                        "description": "Database service supporting IBM DB2 SQL connections.",
                        "group": "Database"
                    }, {
                        "name": "informix",
                        "label": "IBM Informix",
                        "description": "Database service supporting IBM Informix SQL connections.",
                        "group": "Database"
                    }, {
                        "name": "oracle",
                        "label": "Oracle",
                        "description": "Database service supporting SQL connections.",
                        "group": "Database"
                    }, {
                        "name": "salesforce_db",
                        "label": "Salesforce",
                        "description": "Database service with SOAP and/or OAuth authentication support for Salesforce connections.",
                        "group": "Database"
                    }, {
                        "name": "soap",
                        "label": "SOAP Service",
                        "description": "A service to handle SOAP Services",
                        "group": "Remote Service"
                    }, {
                        "name": "sqlanywhere",
                        "label": "SAP SQL Anywhere",
                        "description": "Database service supporting SAP SQL Anywhere connections.",
                        "group": "Database"
                    }, {
                        "name": "sqlsrv",
                        "label": "SQL Server",
                        "description": "Database service supporting SQL Server connections.",
                        "group": "Database"
                    }, {
                        "name": "memsql",
                        "label": "MemSQL",
                        "description": "Database service supporting MemSQL connections.",
                        "group": "Database"
                    }, {
                        "name": "apns",
                        "label": "Apple Push Notification",
                        "description": "Apple Push Notification Service Provider.",
                        "group": "Notification"
                    }, {
                        "name": "gcm",
                        "label": "GCM Push Notification",
                        "description": "GCM Push Notification Service Provider.",
                        "group": "Notification"
                    }, {
                        "name": "mqtt",
                        "label": "MQTT Client",
                        "description": "MQTT Client based on Mosquitto.",
                        "group": "IoT"
                    }, {
                        "name": "mysql",
                        "label": "MySQL",
                        "description": "Database service supporting MySLQ connections.",
                        "group": "Database"
                    }, {
                        "name": "mariadb",
                        "label": "MariaDB",
                        "description": "Database service supporting MariaDB connections.",
                        "group": "Database"
                    }, {
                        "name": "nodejs",
                        "label": "Node.js",
                        "description": "Service that allows client-callable scripts utilizing the system scripting.",
                        "group": "Script"
                    }, {
                        "name": "php",
                        "label": "PHP",
                        "description": "Service that allows client-callable scripts utilizing the system scripting.",
                        "group": "Script"
                    }, {
                        "name": "python",
                        "label": "Python",
                        "description": "Service that allows client-callable scripts utilizing the system scripting.",
                        "group": "Script"
                    }, {
                        "name": "python3",
                        "label": "Python3",
                        "description": "Service that allows client-callable scripts utilizing the system scripting.",
                        "group": "Script"
                    }, {
                        "name": "mongodb",
                        "label": "MongoDB",
                        "description": "Database service for MongoDB connections.",
                        "group": "Database"
                    }, {
                        "name": "gridfs",
                        "label": "GridFS",
                        "description": "GridFS File Storage services.",
                        "group": "File"
                    }];

                    var goldServices = [{
                        "name": "logstash",
                        "label": "Logstash",
                        "description": "Logstash service.",
                        "group": "Log"
                    }, {
                        "name": "snowflake",
                        "label": "Snowflake",
                        "description": "Database service supporting Snowflake connections.",
                        "group": "Big Data"
                    }, {
                        "name": "apache_hive",
                        "label": "Apache Hive",
                        "description": "The Apache Hive data warehouse software facilitates reading, writing, and managing large datasets residing in distributed storage using SQL",
                        "group": "Big Data"
                    }, {
                        "name": "hadoop_hdfs",
                        "label": "Hadoop HDFS",
                        "description": "Hadoop Distributed File System",
                        "group": "File"
                    }];

                    var add = [];

                    angular.forEach(silverServices, function (svc) {

                        var matches = types.filter(function (type) {
                            return svc.name === type.name;
                        });
                        if (matches.length === 0) {
                            svc.singleton = false;
                            svc.available = false;
                            svc.config_schema = null;
                            svc.subscription_required = 'SILVER';
                            add.push(svc);
                        }
                    });

                    angular.forEach(goldServices, function (svc) {

                        var matches = types.filter(function (type) {
                            return svc.name === type.name;
                        });
                        if (matches.length === 0) {
                            svc.singleton = false;
                            svc.available = false;
                            svc.config_schema = null;
                            svc.subscription_required = 'GOLD';
                            add.push(svc);
                        }
                    });

                    types = types.concat(add);

                    // add available property to present services
                    angular.forEach(types, function (svc) {
                        if (!svc.hasOwnProperty('available')) {
                            svc.available = true;
                        }
                    });

                    return types;
                };

                // this is only called for new services
                // for existing services you can't change the type

                scope.changeServiceType = function (type) {

                    // set type
                    scope.serviceInfo.type = type;

                    // rebuild config based on new type
                    scope.serviceConfig = {};
                    scope.selectedSchema = scope.serviceTypeToSchema(type);
                    if (scope.selectedSchema) {
                        scope.decorateSchema();
                    }

                    // clear out service def
                    scope.resetServiceDef();
                };

                var watchServiceDetails = scope.$watch('serviceDetails', function (newValue, oldValue) {

                    // We don't have a service.  Don't do anything.
                    if (!newValue) {
                        return false;
                    }

                    scope.serviceInfo = angular.copy(newValue.record);
                });

                // after service types are loaded from API, pre-build service type list for create/edit views.
                // in edit view, the displayed service type comes from the label for the service being edited and
                // is displayed in a button. there is no menu in this case.
                var watchServiceTypes = scope.$watchCollection('apiData.service_type', function (newValue, oldValue) {

                    if (newValue) {
                        // add missing paid service for advertisement purposes
                        scope.editableServiceTypes = scope.addMissingPaidServices(newValue);
                        // remove any non-creatable types like system or user
                        scope.creatableServiceTypes = scope.editableServiceTypes.filter(function (el) {
                            return !el.singleton;
                        });

                        // build scope.serviceTypes to populate menu

                        var typeObj = {};

                        var groups = scope.creatableServiceTypes.map(function (obj) {
                            if (!typeObj.hasOwnProperty(obj.group)) {
                                typeObj[obj.group] = [];
                            }

                            typeObj[obj.group].push({name: obj.name, label: obj.label});

                            return obj.group;
                        });

                        groups = groups.filter(function (v, i) {
                            return groups.indexOf(v) === i;
                        });

                        var sortingArray = [
                            'Database',
                            'Big Data',
                            'File',
                            'Email',
                            'Notification',
                            'Remote Service',
                            'Script',
                            'OAuth',
                            'LDAP'
                        ];

                        // sort groups per above list
                        // service types within each group are ordered as returned by server
                        groups = scope.sortArray(groups, sortingArray);

                        // sort each array of service types into a staggered list to
                        // accomodate 2 columns when there are more than X items.
                        // doing this work here allows the CSS to remain really simple
                        // with a float left to create the 2 columns. we want them ordered
                        // top to bottom not left to right. first column 1 then column 2.
                        //
                        // we want this:
                        //
                        // 1   3
                        // 2   4
                        //
                        // not this:
                        //
                        // 1   2
                        // 3   4

                        // make sure database and oauth submenus do not extend below main menu
                        scope.serviceTypesSingleColLimit = 5;
                        var newTypeObj = {};
                        angular.forEach(typeObj, function (types, group) {
                            var newTypes = angular.copy(types);
                            var limit = scope.serviceTypesSingleColLimit, i, j;
                            if (types.length > limit) {
                                for (i = 0, j = 0; i < types.length; i += 2) {
                                    newTypes[i] = types[j++];
                                }
                                for (i = 1; i < types.length; i += 2) {
                                    newTypes[i] = types[j++];
                                }
                            }
                            newTypeObj[group] = newTypes;
                        });

                        var _serviceTypes = [];

                        for (var i = 0; i < groups.length; i++) {

                            _serviceTypes.push({"group_name": groups[i], "group_types": newTypeObj[groups[i]]});
                        }
                        scope.serviceTypes = _serviceTypes;
                    }
                });

                scope.$on('$destroy', function (e) {

                    watchServiceDetails();
                    watchServiceTypes();
                });


                // HELP

                scope.dfSimpleHelp = {

                    serviceType: {
                        title: 'Service Type ',
                        text: 'Select the type of service you\'re adding.'
                    },
                    name: {
                        title: 'Namespace ',
                        text: 'Select a namespace used for the API’s URI structure, such as \'db\' in /api/v2/db. It should be lowercase and alphanumeric.'
                    },
                    label: {
                        title: 'Label ',
                        text: 'The display name or label for the service.'
                    },
                    description: {
                        title: 'Description ',
                        text: 'Write a brief description of the API (optional).'
                    }
                };

                scope.goToSelectedServiceScripts = function () {
                    dfSelectedService.currentService = {
                        name: scope.serviceInfo.name
                    };
                    $location.url('/scripts');
                };

                scope.goToSelectedServiceRole = function (role) {
                    dfSelectedService.selectedRelatedRole = role;
                    $location.url('/roles');
                }
            }
        };
    }])

    .directive('dfServiceConfig', ['MOD_SERVICES_ASSET_PATH', 'dfApplicationData', 'dfObjectService', '$compile', '$rootScope', 'dfNotify', '$http', 'INSTANCE_URL', 'UserDataService', function (MOD_SERVICES_ASSET_PATH, dfApplicationData, dfObjectService, $compile, $rootScope, dfNotify, $http, INSTANCE_URL, UserDataService) {


        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-service-config.html',
            link: function (scope, elem, attrs) {
                // this will be updated by the watcher for serviceDetails when a service is loaded into the editor
                // all user changes are applied to scope.serviceConfig
                // prepareServiceConfig copies the settings back to serviceDetails.record
                scope.serviceConfig = {};
                scope.isServiceConfigEditable = true;
                scope.serviceConfigUpdateCounter = 0;
                scope.eventList = [];
                scope.allowedConfigFormats = '.json,.js,.php,.py,.python,.yaml,.yml';
                scope.allowedConfigGitFormats = ['json', 'js', 'php', 'py', 'python', 'yaml', 'yml'];
                scope.serviceConfigGitHubTarget = 'configmodal';
                scope.serviceConfigEditorObj = {'editor': null};
                scope.isArray = angular.isArray;
                scope.disableServiceLinkRefresh = true;
                scope.uploadSpreadsheet = null;
                scope.spreadsheetUploadPath = null;

                scope.selections = {
                    "service": null
                };

                scope.handleFiles = function (element) {

                    var file = element.files && element.files[0];
                    if (file) {
                        var reader = new FileReader();
                        reader.readAsText(file, "UTF-8");
                        reader.onload = function (evt) {
                            scope.$apply(function () {
                                scope.serviceConfig["content"] = evt.target.result;
                                scope.serviceConfigUpdateCounter++;
                            });
                        };
                        reader.onerror = function (evt) {
                        };
                    }
                };

                scope.browseFileSystem = function () {
                    scope.spreadsheetUploadClear();

                    var field = angular.element('#spreadsheetSelect');
                    if (field) {
                        field.bind('change', function (event) {
                            var file = event.target.files[0];
                            scope.uploadSpreadsheet = file ? file : undefined;
                            scope.$apply();
                        });
                    }
                    field.trigger('click');
                };

                scope.handleSpreadsheet = function () {
                    var file = scope.uploadSpreadsheet;
                    if (file === undefined || file === null) {
                        file = scope.spreadsheetUploadPath;
                    }

                    if (file) {

                        var currentUser = UserDataService.getCurrentUser();

                        // unset content type, it'll get set later

                        $http({
                            method: 'POST',
                            url: scope.getSpreadsheetUploadUrl(),
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

                            if (result && result.data && result.data.resource) {

                                var messageOptions = {
                                    module: 'Services',
                                    provider: 'dreamfactory',
                                    type: 'success',
                                    message: 'Spreadsheet was uploaded successfully.'
                                };

                                dfNotify.success(messageOptions);

                                scope.spreadsheetUploadClear();
                            }
                        }, function (reject) {

                            var messageOptions = {
                                module: 'Services',
                                provider: 'dreamfactory',
                                type: 'error',
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                        });
                    }
                };

                scope.spreadsheetUploadClear = function () {

                    scope.uploadSpreadsheet = null;
                    angular.element('#spreadsheetSelect').val('');
                    scope.spreadsheetUploadPath = null;
                };

                scope.getSpreadsheetUploadUrl = function () {
                    var storagePath = scope.serviceConfig.storage_container || '/';
                    var endsWith = storagePath.endsWith('/');
                    var startsWith = storagePath.startsWith('/');

                    if (!startsWith) {
                        storagePath = '/' + storagePath;
                    }
                    if (!endsWith) {
                        storagePath = storagePath + '/';
                    }
                    return INSTANCE_URL.url + '/' + scope.selections.service.name + storagePath;
                };

                scope.getRefreshEnable = function () {

                    var type, enable = false;

                    if (scope.selections.service) {
                        type = scope.selections.service.type;
                        if (type === 'github' || type === 'gitlab' || type === 'bitbucket') {
                            if (scope.serviceConfig.scm_repository && scope.serviceConfig.scm_reference && scope.serviceConfig.storage_path) {
                                enable = true;
                            }
                        } else {
                            if (scope.serviceConfig.storage_path) {
                                enable = true;
                            }
                        }
                    }

                    return enable;
                };

                scope.resetServiceLink = function () {

                    scope.serviceConfig.scm_repository = null;
                    scope.serviceConfig.scm_reference = null;
                    scope.serviceConfig.storage_path = null;
                };

                scope.pullLatestScript = function () {

                    var serviceName = scope.selections.service.name;
                    var serviceRepo = scope.serviceConfig.scm_repository;
                    var serviceRef = scope.serviceConfig.scm_reference;
                    var servicePath = scope.serviceConfig.storage_path;
                    var url = INSTANCE_URL.url + '/' + serviceName;

                    if (scope.selections.service && (scope.selections.service.type === 'github' || scope.selections.service.type === 'gitlab' || scope.selections.service.type === 'bitbucket')) {
                        var params = {
                            path: servicePath,
                            branch: serviceRef,
                            content: 1
                        };
                        url = url + '/_repo/' + serviceRepo;
                    } else {
                        url = url + '/' + servicePath;
                    }

                    $http({
                        method: 'GET',
                        url: url,
                        params: params
                    }).then(
                        function (result) {

                            scope.serviceConfig.content = result.data;
                            scope.serviceConfigUpdateCounter++;

                            var messageOptions = {
                                module: 'Services',
                                provider: 'dreamfactory',
                                type: 'success',
                                message: 'Successfully pulled the latest script from source.'
                            };
                            dfNotify.error(messageOptions);
                        },

                        function (error) {

                            var messageOptions = {
                                module: 'Services',
                                provider: 'dreamfactory',
                                type: 'error',
                                message: 'There was an error pulling the latest script from source. Please make sure your service, path and permissions are correct and try again.'
                            };
                            dfNotify.error(messageOptions);
                        }
                    ).finally(function () {
                    });
                };

                scope.deleteScriptFromCache = function () {

                    $http({
                        method: 'DELETE',
                        url: INSTANCE_URL.url + '/system/cache/_event/' + scope.serviceInfo.name
                    }).then(
                        function (result) {

                            var messageOptions = {
                                module: 'Services',
                                provider: 'dreamfactory',
                                type: 'success',
                                message: 'Successfully cleared script from cache.'
                            };
                            dfNotify.error(messageOptions);
                        },
                        function (error) {

                            var messageOptions = {
                                module: 'Services',
                                provider: 'dreamfactory',
                                type: 'error',
                                message: 'Failed to cleared script from cache.'
                            };
                            dfNotify.error(messageOptions);
                        }
                    ).finally(function () {
                    });
                };

                scope.githubModalShowConfig = function () {

                    $rootScope.$broadcast('githubShowModal', scope.serviceConfigGitHubTarget);
                };

                scope.addKeyValue = function (field) {
                    if (!scope.serviceConfig[field]) {
                        scope.serviceConfig[field] = [];
                    }
                    scope.serviceConfig[field].push({key: 'new_key', value: 'new_value'});
                };

                scope.deleteKeyValue = function (obj, $index) {
                    obj.splice($index, 1);
                };

                scope.appendItemToArray = function (configObj, key) {
                    if (!configObj[key]) {
                        configObj[key] = [];
                    }

                    var schema = scope.selectedSchema.config_schema.filter(function (item) {
                        return item.name == key;
                    })[0] || {};

                    if (schema.items instanceof Array) {
                        scope.serviceConfig[key].push({});
                    } else if (schema.items === 'string') {
                        scope.serviceConfig[key].push('');
                    }
                };

                scope.deleteStringFromArray = function (arr, index) {
                    arr.splice(index, 1);
                };

                scope.addObjectInArray = function (configObj, key, items) {
                    if (!configObj[key]) {
                        configObj[key] = [];
                    }
                    var newObj = {};
                    items.forEach(function (item) {
                        switch (item.type) {
                            case 'text':
                            case 'string':
                                newObj[item.name] = '';
                                break;
                            case "boolean":
                                newObj[item.name] = false;
                                break;
                            case "verb_mask":
                                newObj[item.name] = 31; // allow all verbs
                                break;
                        }
                    });
                    configObj[key].push(newObj);
                };

                scope.deleteObjectFromArray = function (arr, index) {
                    arr = arr.splice(index, 1);
                };

                scope.decorateSchema = function () {

                    if (scope.selectedSchema.hasOwnProperty('config_schema') && scope.selectedSchema.config_schema !== null) {

                        scope.selectedSchema.config_schema.forEach(function (schema) {

                            if (schema.default) {
                                scope.serviceConfig[schema.name] = scope.serviceConfig[schema.name] || schema.default;

                            } else if (schema.name === "content" && scope.selectedSchema.group === "Custom") {
                                scope.serviceConfig["content"] = scope.serviceConfig["content"] || "";
                            }

                        });
                    }
                };

                scope.getReferences = function (key, valueField) {
                    var dfApplicationObjApis = dfApplicationData.getApplicationObj().apis || [];
                    if (dfApplicationObjApis && dfApplicationObjApis[key] && dfApplicationObjApis[key].record) {
                        return dfApplicationObjApis[key].record.map(function (item) {
                            return {name: item.name, value: item[valueField] || item.id};
                        });
                    }
                };

                scope.getServiceById = function (id) {

                    var matches = scope.apiData['service_link'].filter(function (service) {
                        return service.id === id;
                    });
                    if (matches.length === 0) {
                        return null;
                    }
                    return matches[0];
                };

                var watchServiceDetails = scope.$watch('serviceDetails', function (newValue, oldValue) {

                    // We don't have a service.  Don't do anything.
                    if (!newValue) {
                        return;
                    }

                    scope.serviceConfig = angular.copy(newValue.record.config);

                    switch (newValue.record.type) {
                        case 'nodejs':
                        case 'php':
                        case 'python':
                        case 'python3':
                        case 'excel':
                            scope.selections.service = scope.getServiceById(scope.serviceConfig.storage_service_id);
                            break;
                        default:
                            break;
                    }

                    scope.selectedSchema = scope.serviceTypeToSchema(newValue.record.type);

                    if (scope.selectedSchema) {
                        scope.decorateSchema();
                    }
                });

                var watchSelectedSchema = scope.$watch('selectedSchema', function (newValue, oldValue) {

                    var loadEvents, i;

                    if (!newValue) {
                        return;
                    }

                    // set allowed file types
                    switch (newValue.name) {
                        case 'nodejs':
                            scope.allowedConfigFormats = '.js';
                            scope.allowedConfigGitFormats = ['js'];
                            break;
                        case 'php':
                            scope.allowedConfigFormats = '.php';
                            scope.allowedConfigGitFormats = ['php'];
                            break;
                        case 'python':
                            scope.allowedConfigFormats = '.py,.python';
                            scope.allowedConfigGitFormats = ['py', 'python'];
                            break;
                        case 'python3':
                            scope.allowedConfigFormats = '.py,.python';
                            scope.allowedConfigGitFormats = ['py', 'python'];
                            break;
                        default:
                            scope.allowedConfigFormats = '.json,.js,.php,.yaml,.yml';
                            scope.allowedConfigGitFormats = ['json', 'js', 'php', 'yaml', 'yml'];
                    }

                    // Some services need an event list, currently GCM, APN, and Logstash. These all have a
                    // common entry in their config_schema array named 'service_event_map' which we look for
                    // to trigger loading of events. Events are loaded only as needed, because it can be
                    // slow when there are many services or fail completely if there are bad services, rendering
                    // the admin app services tab inoperable. We check for this here because it works for both
                    // creating and editing services.
                    if (newValue.config_schema) {
                        loadEvents = false;
                        for (i = 0; i < newValue.config_schema.length; i++) {
                            if (newValue.config_schema[i].name === 'service_event_map') {
                                loadEvents = true;
                                break;
                            }
                        }
                        if (loadEvents) {
                            // Trigger loading of event list. It will be cached after first time.
                            dfApplicationData.getApiData(['event_list']).then(
                                function (response) {
                                    scope.apiData.event_list = response[0].resource;
                                },
                                function (error) {
                                    var messageOptions = {
                                        module: 'Services',
                                        provider: 'dreamfactory',
                                        type: 'error',
                                        message: 'There was an error loading the service. Please try refreshing your browser and logging in again.'
                                    };
                                    dfNotify.error(messageOptions);
                                }
                            );
                        }
                    }
                });

                var watchEventList = scope.$watchCollection('apiData.event_list', function (newValue, oldValue) {

                    var temp = {};
                    var serviceEvents = [];

                    if (newValue) {
                        angular.forEach(newValue, function (event) {
                            var service = event;
                            var index = service.indexOf('.');
                            if (index >= 0) {
                                service = service.substr(0, index);
                            }
                            if (!temp[service]) {
                                temp[service] = [];
                            }
                            temp[service].push({
                                'label': event,
                                'name': event
                            });
                        });

                        angular.forEach(temp, function (items, service) {
                            items.unshift({'label': 'All ' + service + ' events', 'name': service + '.*'});
                            serviceEvents.push({'label': service, 'name': service, 'items': items});
                        });

                        scope.eventList = serviceEvents;
                    }
                });

                var watchConfig = scope.$watchCollection('serviceConfig', function (newValue, oldValue) {

                    scope.disableServiceLinkRefresh = !scope.getRefreshEnable();
                });

                var watchSelections = scope.$watchCollection('selections', function (newValue, oldValue) {

                    scope.disableServiceLinkRefresh = !scope.getRefreshEnable();
                    if (newValue) {
                        // when unselecting a service do nothing
                        scope.isServiceConfigEditable = (newValue.service === null);
                        // if changing from no service to service then clear content
                        // if changing from one service to another then clear content
                        // if changing from service to no service then keep content
                        if (newValue.service !== null) {
                            scope.serviceConfig.content = "";
                            scope.serviceConfigUpdateCounter++;
                        }
                    }
                });

                var watchUploadSpreadsheet = scope.$watch('uploadSpreadsheet', function (n, o) {

                    if (!n) return;

                    scope.spreadsheetUploadPath = n.name;
                });

                scope.$on('$destroy', function (e) {

                    watchServiceDetails();
                    watchSelectedSchema();
                    watchEventList();
                    watchConfig();
                    watchSelections();
                    watchUploadSpreadsheet();
                });

                scope.prepareServiceConfig = function () {

                    var config = scope.serviceConfig;
                    var type = scope.serviceInfo.type;

                    if (type === 'nodejs' ||
                        type === 'php' ||
                        type === 'python' ||
                        type === 'python3') {

                        // if linked to a service set script content to empty
                        if (scope.selections.service) {
                            config.content = "";
                            scope.serviceConfigUpdateCounter++;
                        } else {
                            config.content = scope.serviceConfigEditorObj.editor.getValue();
                        }

                        // sanitize service link config before saving
                        // send nulls not empty strings
                        // if no service selected send null for everything

                        // service to link to
                        config.storage_service_id = (scope.selections.service ? scope.selections.service.id : null);

                        // repo is allowed for github or bitbucket, gitlab, replace empty string with null
                        if (scope.selections.service &&
                            (scope.selections.service.type === 'github' || scope.selections.service.type === 'gitlab' || scope.selections.service.type === 'bitbucket')) {
                            config.scm_repository = (config.scm_repository ? config.scm_repository : null);
                        } else {
                            config.scm_repository = null;
                        }

                        // ref is allowed for github or bitbucket, gitlab, replace empty string with null
                        if (scope.selections.service &&
                            (scope.selections.service.type === 'github' || scope.selections.service.type === 'gitlab' || scope.selections.service.type === 'bitbucket')) {
                            config.scm_reference = (config.scm_reference ? config.scm_reference : null);
                        } else {
                            config.scm_reference = null;
                        }

                        // path is allowed for any link service, replace empty string with null
                        if (scope.selections.service) {
                            config.storage_path = (config.storage_path ? config.storage_path : null);
                        } else {
                            config.storage_path = null;
                        }
                    }

                    if (type === 'excel') {

                        // storage service to link to
                        config.storage_service_id = (scope.selections.service ? scope.selections.service.id : null);

                        // path is allowed for any link service, replace empty string with null
                        if (scope.selections.service) {
                            config.storage_container = (config.storage_container ? config.storage_container : null);
                        } else {
                            config.storage_container = null;
                        }
                    }

                    return config;
                };

                scope.isFieldsSeparated = function (schemaName) {
                    return schemaName === 'mysql' || schemaName === 'sqlsrv' || schemaName === 'oracle' || schemaName === 'pgsql'
                }

                scope.isBasic = function (fieldName) {
                    var basicFieldsNames = new Set(['host', 'port', 'database', 'username', 'password', 'schema']);

                    // mysql exception for schema field
                    if(scope.selectedSchema.name === 'mysql' && fieldName === 'schema') {
                        return false;
                    }

                    return basicFieldsNames.has(fieldName);
                }

                scope.isCaching = function (fieldName) {
                    return fieldName.includes('cache') || fieldName.includes('caching')
                }

                scope.showAdvancedSettings = true;
                scope.showAdvancedFields = function () {
                    var moreButton, lessButton, advancedFieldWrapper, advancedFieldContent, totalHeight;

                    totalHeight = 0

                    moreButton = $(".advanced-fields .more-fields .button").parent();
                    lessButton = $(".advanced-fields .less-fields .button").parent();
                    advancedFieldWrapper = moreButton.parent();
                    advancedFieldContent = advancedFieldWrapper.find("#advanced-fields-wrapper:not('.more-fields')");
                    moreButton.fadeOut();
                    lessButton.fadeIn();

                    scope.showAdvancedSettings = !scope.showAdvancedSettings;

                    // measure how tall inside should be by adding the height of advanced fields wrapper
                    totalHeight += advancedFieldContent.outerHeight();

                    advancedFieldWrapper
                        .css({
                            // Set height to prevent instant jumpdown when max height is removed
                            "height": advancedFieldWrapper.height(),
                            "max-height": 9999
                        })
                        .animate({
                            "height": totalHeight
                        });

                    // prevent jump-down
                    return false;

                };
                scope.hideAdvancedFields = function () {
                    var moreButton, lessButton, advancedFieldWrapper;

                    moreButton = $(".advanced-fields .more-fields .button").parent();
                    lessButton = $(".advanced-fields .less-fields .button").parent();
                    advancedFieldWrapper = moreButton.parent();

                    moreButton.fadeIn();
                    lessButton.fadeOut();
                    advancedFieldWrapper.animate({
                        "height": 255
                    });
                    return false;
                }
            }
        };
    }])

    .directive('dfServiceDefinition', ['MOD_SERVICES_ASSET_PATH', '$timeout', '$rootScope', function (MOD_SERVICES_ASSET_PATH, $timeout, $rootScope) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SERVICES_ASSET_PATH + 'views/df-service-definition.html',
            link: function (scope, elem, attrs) {

                scope.serviceDefEditorObj = {"editor": null};
                scope.allowedDefinitionFormats = ['json', 'yml', 'yaml'];
                scope.serviceDefGitHubTarget = 'definition';
                scope.serviceDefUpdateCounter = 0;

                // init service def
                scope.serviceDefinition = {
                    "content": "",
                    "format": "json"
                };
                scope.isServiceDefEditable = false;

                scope.resetServiceDef = function () {

                    scope.serviceDefinition = {
                        "content": "",
                        "format": "json"
                    };
                    switch (scope.serviceInfo.type) {

                        case 'rws':
                        case 'nodejs':
                        case 'php':
                        case 'python':
                        case 'python3':
                            scope.isServiceDefEditable = true;
                            break;

                        default:
                            scope.isServiceDefEditable = false;
                    }
                };

                scope.prepareServiceDefinition = function () {

                    var doc = null, format;

                    switch (scope.serviceInfo.type) {

                        case 'rws':
                        case 'nodejs':
                        case 'php':
                        case 'python':
                        case 'python3':
                            var content = scope.serviceDefEditorObj.editor.getValue();
                            if (content !== "") {
                                doc = scope.serviceDetails.record.service_doc_by_service_id || {};
                                doc.content = content;
                                // on the way out, convert from json/yaml to 0/1
                                // default to 0
                                format = scope.serviceDefinition.format;
                                if (format === "yaml") {
                                    doc.format = 1;
                                } else {
                                    doc.format = 0;
                                }
                            }
                            break;
                    }

                    // null will delete existing service doc if there is one
                    return doc;
                };

                scope.handleDefinitionFiles = function (files) {

                    if (files && files[0]) {
                        var reader = new FileReader();
                        reader.readAsText(files[0], "UTF-8");
                        reader.onload = function (evt) {

                            var format;

                            scope.serviceDefinition.content = evt.target.result;
                            scope.serviceDefUpdateCounter++;

                            if (files[0].name.indexOf('yml') !== -1 || files[0].name.indexOf('yaml') !== -1) {
                                format = "yaml";
                            } else {
                                format = "json";
                            }
                            scope.serviceDefinition.format = format;

                            scope.$apply();
                        };
                        reader.onerror = function (evt) {
                        };
                    }
                };


                scope.$watch('serviceDetails', function (newValue, oldValue) {

                    if (!newValue) {
                        return;
                    }

                    // default values will apply to services with no service def
                    var content = '', format = "json", editable = false;

                    // these service types have an editable service def
                    switch (newValue.record.type) {
                        case 'rws':
                        case 'nodejs':
                        case 'php':
                        case 'python':
                        case 'python3':
                            // get content and format, if valid, otherwise use defaults
                            var doc = newValue.record.service_doc_by_service_id;
                            if (doc) {
                                if (doc.hasOwnProperty("content") && doc.content) {
                                    content = doc.content;
                                }
                                if (doc.hasOwnProperty("format")) {
                                    // on the way in, convert from 0/1 to json/yaml
                                    // default to json
                                    if (doc.format === 1) {
                                        format = "yaml";
                                    } else {
                                        format = "json";
                                    }
                                }
                            }
                            editable = true;
                            break;
                    }

                    // assign values
                    scope.serviceDefinition = {
                        "content": content,
                        "format": format
                    };
                    scope.isServiceDefEditable = editable;
                });

                scope.githubModalShowDef = function () {

                    $rootScope.$broadcast('githubShowModal', scope.serviceDefGitHubTarget);
                };

                $(window).on('resize', function () {

                    var h = $(window).height();

                    $('div[id^="ide_"]').css({
                        height: h - 400 + 'px'
                    });
                });
            }
        };
    }]);
