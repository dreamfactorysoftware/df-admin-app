'use strict';


angular.module('dfLimit', ['ngRoute', 'dfUtility'])
    .constant('MOD_LIMIT_ROUTER_PATH', '/limit')
    .constant('MOD_LIMIT_ASSET_PATH', 'admin_components/adf-limit/')

    .config(['$routeProvider', 'MOD_LIMIT_ROUTER_PATH', 'MOD_LIMIT_ASSET_PATH',
        function ($routeProvider, MOD_LIMIT_ROUTER_PATH, MOD_LIMIT_ASSET_PATH) {
            $routeProvider
                .when(MOD_LIMIT_ROUTER_PATH, {
                    templateUrl: MOD_LIMIT_ASSET_PATH + 'views/main.html',
                    controller: 'LimitCtl',
                    resolve: {
                        checkCurrentLimit: ['UserDataService', '$location', '$q', function (UserDataService, $location, $q) {

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
                                };
                            }

                            // There is a currentUser but they are not an admin
                            else if (currentUser && !currentUser.is_sys_admin) {

                                $location.url('/launchpad');

                                // This will stop the route from loading anything
                                // it's caught by the global error handler in
                                // app.js
                                throw {
                                    routing: true
                                };
                            }

                            defer.resolve();
                            return defer.promise;
                        }]
                    }
                });
        }])

.run(['INSTANCE_URL', '$templateCache', function (INSTANCE_URL, $templateCache) {

}])

.factory('editLimitService', [ function(){
    return { record: {}, recordCopy: {} };
}])

.controller('LimitCtl', ['INSTANCE_URL', '$rootScope', '$scope', '$http', 'dfApplicationData', 'dfNotify', 'dfObjectService', function (INSTANCE_URL, $rootScope, $scope, $http, dfApplicationData, dfNotify, dfObjectService) {

        $scope.$parent.title = 'Limits';

        // Set module links
        $scope.links = [
            {
                name: 'manage-limits',
                label: 'Manage',
                path: 'manage-limits'
            },
            {
                name: 'create-limit',
                label: 'Create',
                path: 'create-limit'
            }
        ];

        /* define instance Types */
        $scope.instanceTypes = [
            {value: 'instance', name: 'Instance'},
            {value: 'instance.user', name: 'User'},
            {value: 'instance.each_user', name: 'Each User'},
            {value: 'instance.service', name: 'Service'},
            {value: 'instance.role', name: 'Role'},
            {value: 'instance.user.service', name: 'Service by User'},
            {value: 'instance.each_user.service', name: 'Service by Each User'},
            {value: 'instance.service.endpoint', name: 'Endpoint'},
            {value: 'instance.user.service.endpoint', name: 'Endpoint by User'},
            {value: 'instance.each_user.service.endpoint', name: 'Endpoint by Each User'},
        ];

        /* define instance Types */
        $scope.limitPeriods = [
            {value: 'minute', name: 'Minute'},
            {value: 'hour', name: 'Hour'},
            {value: 'day', name: 'Day'},
            {value: '7-day', name: 'Week'},
            {value: '30-day', name: '30 Days'}
        ];

        // Set empty section options
        $scope.emptySectionOptions = {
            title: 'You have no Limits!',
            text: 'Click the button below to get started adding limits.  You can always create new limits by clicking the tab located in the section menu to the left.',
            buttonText: 'Create A Limit!',
            viewLink: $scope.links[1],
            active: false
        };

        $scope.hidden = {
            users : true,
            roles : true,
            services: true,
            endpoint: true
        };

        $scope.selectType = function(recordType) {

            if (angular.isObject(recordType)) {

                switch (recordType.value) {
                    case 'instance':
                        $scope.hidden = {
                            users: true,
                            roles: true,
                            services: true,
                            endpoint: true
                        };
                        break;
                    case 'instance.user':
                        $scope.hidden = {
                            users: false,
                            roles: true,
                            services: true,
                            endpoint: true
                        };

                        break;
                    case 'instance.each_user':
                        $scope.hidden = {
                            users: true,
                            roles: true,
                            services: true,
                            endpoint: true
                        };

                        break;
                    case 'instance.service':
                        $scope.hidden = {
                            users: true,
                            roles: true,
                            services: false,
                            endpoint: true
                        };
                        break;
                    case 'instance.role':
                        $scope.hidden = {
                            users: true,
                            roles: false,
                            services: true,
                            endpoint: true
                        };
                        break;
                    case 'instance.user.service':
                        $scope.hidden = {
                            users: false,
                            roles: true,
                            services: false,
                            endpoint: true
                        };
                        break;
                    case 'instance.each_user.service':
                        $scope.hidden = {
                            users: true,
                            roles: true,
                            services: false,
                            endpoint: true
                        };
                        break;
                    case 'instance.service.endpoint':
                        $scope.hidden = {
                            users: true,
                            roles: true,
                            services: false,
                            endpoint: false
                        };
                        break;
                    case 'instance.user.service.endpoint' :
                        $scope.hidden = {
                            users: false,
                            roles: true,
                            services: false,
                            endpoint: false
                        };
                        break;
                    case 'instance.each_user.service.endpoint' :
                        $scope.hidden = {
                            users: true,
                            roles: true,
                            services: false,
                            endpoint: false
                        };
                        break;
                }
            }
        };

        $scope.$on('$destroy', function (e) {

            // dump data if not on page 1
            $scope.$broadcast('toolbar:paginate:limit:destroy');
        });

        $scope.limitEnabled = false;
        $scope.subscription_required = false;

        // load data

        $scope.apiData = null;

        $scope.loadTabData = function(init) {

            $scope.dataLoading = true;

            var apis, newApiData;

            var errorFunc = function (error) {
                var messageOptions = {
                    module: 'Limits',
                    provider: 'dreamfactory',
                    type: 'error',
                    message: 'There was an error loading data for the Limits tab. Please try refreshing your browser and logging in again.'
                };
                dfNotify.error(messageOptions);
            };

            // first get system data to decide whether to load other data
            dfApplicationData.getApiData(['system']).then(
                function (response) {
                    angular.forEach(response[0].resource, function (value) {
                        if (value.name === 'limit') {
                            $scope.limitEnabled = true;
                        }
                    });
                    if (!$scope.limitEnabled) {
                        // limits not enabled, disable UI
                        $scope.subscription_required = true;
                        /* Disable ability to navigate to create */
                        $scope.links[1].path = $scope.links[0].path;
                    } else {
                        // limits enabled, load other data
                        apis = ['limit', 'role', 'service', 'user'];

                        dfApplicationData.getApiData(apis).then(
                            function (response) {
                                newApiData = {};
                                apis.forEach(function (value, index) {
                                    newApiData[value] = response[index].resource ? response[index].resource : response[index];
                                });
                                $scope.apiData = newApiData;
                                if (init) {
                                    $scope.$broadcast('toolbar:paginate:limit:load');
                                }
                            },
                            // error getting other data
                            errorFunc
                        );
                    }
                },
                // error getting system data
                errorFunc
            ).finally(function () {
                $scope.dataLoading = false;
            });
        };

        $scope.loadTabData(true);
    }])

    .directive('dfManageLimits', [
        '$rootScope',
        'MOD_LIMIT_ASSET_PATH',
        'dfApplicationData',
        'dfNotify',
        '$timeout',
        'editLimitService',
        '$http',
        'INSTANCE_URL',
        function ($rootScope,
            MOD_LIMIT_ASSET_PATH,
            dfApplicationData,
            dfNotify,
            $timeout,
            editLimitService,
            $http,
            INSTANCE_URL
        ) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_LIMIT_ASSET_PATH + 'views/df-manage-limits.html',
            link: function (scope, elem, attrs) {


                var ManagedLimit = function (limitData) {

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: limitData,
                        recordCopy: limitData
                    };
                };

                scope.limits = null;
                scope.currentEditLimit = editLimitService;

                scope.fields = [
                    {
                        name: 'id',
                        label: 'ID',
                        active: true
                    },
                    {
                        name: 'name',
                        label: 'Limit Name',
                        active: true
                    },
                    {
                        name: 'type',
                        label: 'Limit Type',
                        active: true
                    },
                    {
                        name: 'rate',
                        label: 'Limit Rate',
                        active: true
                    },
                    {
                        name: 'percent',
                        label: 'Limit Counter',
                        active: true
                    },
                    {
                        name: 'user_id',
                        label: 'User',
                        active: true
                    },
                    {
                        name: 'service_id',
                        label: 'Service',
                        active: true
                    },
                    {
                        name: 'role_id',
                        label: 'Role',
                        active: true
                    },
                    {
                        name: 'active',
                        label: 'Active',
                        active: true
                    }
                ];

                scope.order = {
                    orderBy: 'id',
                    orderByReverse: false
                };

                scope.selectedLimits = [];

                // PUBLIC API

                scope.editLimit = function (limit) {

                    scope._editLimit(limit);
                };

                scope.deleteLimit = function (limit) {

                    if (dfNotify.confirm("Delete " + limit.record.name + "?")) {
                        scope._deleteLimit(limit);
                        /* Clear out any unwanted preselected limits */
                        scope.selectAll(false);
                    }
                };

                scope.resetCounter = function (limit) {
                    if (dfNotify.confirm("Clear counter for " + limit.record.name + "?")) {
                        scope._deleteLimitCache(limit);
                    }
                };

                scope.deleteSelectedLimits = function () {

                    if (dfNotify.confirm("Delete selected limits?")) {
                        scope._deleteSelectedLimits();
                    }
                };

                scope.resetSelectedLimits = function () {

                    if (dfNotify.confirm("Reset selected limits?")) {
                        scope._resetSelectedLimits();
                    }
                };

                /**
                 * Main table sorting function (public)
                 * @param fieldObj
                 */
                scope.orderOnSelect = function (fieldObj) {

                    scope._orderOnSelect(fieldObj);
                };

                scope.setSelected = function (limit) {

                    scope._setSelected(limit);
                };

                scope.selectAll = function(checkStatus){

                    /*If we're deselecting all, go ahead and clear out the selectedLimits array */
                    if(scope.selectedLimits.length && checkStatus === false){
                        scope.selectedLimits = [];
                    }
                    angular.forEach(scope.limits, function(limit){
                        //unchecking - don't need anything in selected limits
                        if(checkStatus === false){
                            limit.__dfUI.selected = false;
                            scope.selectedLimits.splice(limit.record.id, 1);
                        } else {
                            limit.__dfUI.selected = true;
                            scope.selectedLimits.push(limit.record.id);
                        }
                    });
                };


                // PRIVATE API

                scope._deleteCacheFromServer = function (requestDataObj) {

                    return $http({
                        method: 'DELETE',
                        url: INSTANCE_URL + '/api/v2/system/limit_cache',
                        params: requestDataObj.params
                    });
                };

                // COMPLEX IMPLEMENTATION

                scope._editLimit = function (limit) {

                    angular.copy(limit, scope.currentEditLimit);

                    var limitType = limit.record.type;
                    var limitPeriod = limit.record.period;
                    var userId = limit.record.user_id;

                    scope.currentEditLimit.record.typeObj = scope.instanceTypes.filter(function(obj){
                        return (obj.value == limitType);
                    })[0];
                    scope.currentEditLimit.recordCopy.typeObj = scope.currentEditLimit.record.typeObj;
                    scope.currentEditLimit.record.periodObj = scope.limitPeriods.filter(function(obj){
                        return (obj.value == limitPeriod);
                    })[0];
                    scope.currentEditLimit.recordCopy.periodObj = scope.currentEditLimit.record.periodObj;

                    if(angular.isObject(scope.users)){
                        scope.currentEditLimit.record.user_id = scope.users.filter(function(obj){
                            return (obj.id == userId);
                        })[0];
                        scope.currentEditLimit.recordCopy.user_id = scope.currentEditLimit.record.user_id;

                    }
                    scope.selectType(scope.currentEditLimit.record.typeObj);
                };

                scope._deleteLimitCache = function (limit){

                    var requestDataObj = {
                        params: {
                            ids: limit.record.id
                        }
                    };

                    scope._deleteCacheFromServer(requestDataObj).then(

                        function (result) {

                            // notify success
                            var messageOptions = {
                                module: 'Limits',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Limit counter successfully reset.'
                            };

                            angular.forEach(limit.record.limit_cache_by_limit_id, function(cache){
                                cache.attempts = 0;
                                cache.percent = 0;
                            });

                            dfNotify.success(messageOptions);
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
                        function () {

                        }
                    );
                };

                scope._deleteLimit = function (limit) {

                    var requestDataObj = {
                        params: {
                            id: limit.record.id
                        }
                    };

                    dfApplicationData.deleteApiData('limit', requestDataObj).$promise.then(

                        function (result) {

                        // notify success
                        var messageOptions = {
                            module: 'Limits',
                            type: 'success',
                            provider: 'dreamfactory',
                            message: 'Limit successfully deleted.'
                        };

                        dfNotify.success(messageOptions);

                        // Was this user previously selected before
                        // we decided to remove them individually
                        if (limit.__dfUI.selected) {

                            // This will remove the user from the selected
                            // user array
                            scope.setSelected(limit);
                        }

                        scope.$broadcast('toolbar:paginate:limit:delete');
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

                scope._setSelected = function (limit) {

                    var i = 0;
                    while (i < scope.selectedLimits.length) {
                        if (limit.record.id === scope.selectedLimits[i]) {
                            limit.__dfUI.selected = false;
                            scope.selectedLimits.splice(i, 1);
                            return;
                        }
                        i++;
                    }
                    limit.__dfUI.selected = true;
                    scope.selectedLimits.push(limit.record.id);

                };

                scope._resetSelectedLimits = function () {

                    var requestDataObj = {
                        params: {
                            ids: scope.selectedLimits.join(',')
                        }
                    };

                    scope._deleteCacheFromServer(requestDataObj).then(

                        function (result) {

                            // notify success
                            var messageOptions = {
                                module: 'Limits',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Limit counters successfully reset.'
                            };

                            /* Iterate over the selected limits to reset the progress bars */
                            angular.forEach(scope.selectedLimits, function(value){
                                scope.limits.filter(function(obj){
                                    if(obj.record.id == value){
                                        angular.forEach(obj.record.limit_cache_by_limit_id, function(cache){
                                            cache.attempts = 0;
                                            cache.percent = 0;
                                        });
                                    }
                                });
                            });

                            dfNotify.success(messageOptions);
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
                        function () {

                        }
                    );
                };

                scope._deleteSelectedLimits = function () {

                    var requestDataObj = {
                        params: {
                            ids: scope.selectedLimits.join(','),
                            rollback: true
                        }
                    };

                    dfApplicationData.deleteApiData('limit', requestDataObj).$promise.then(

                        function (result) {

                            var messageOptions = {
                                module: 'Limits',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Limits deleted successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.selectedLimits = [];

                            scope.$broadcast('toolbar:paginate:limit:reset');
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
                        function () {

                        }
                    );
                };

                // WATCHERS

                // this fires when the API data changes
                // apiData is passed in to the details directive as data-api-data
                var watchLimitApiData = scope.$watchCollection('apiData.limit', function (newValue, oldValue) {

                    var _limits = [];

                    if (newValue) {
                        angular.forEach(newValue, function (limit) {
                            _limits.push(new ManagedLimit(limit));
                        });
                        scope.emptySectionOptions.active = (newValue.length === 0);
                    }

                    scope.limits = _limits;

                });

                // MESSAGES

                // broadcast by pagination code when new data is available
                scope.$on('toolbar:paginate:limit:update', function (e) {

                    scope.loadTabData();
                });

                scope.$on('$destroy', function (e) {

                    // Destroy watchers
                    watchLimitApiData();
                });
            }
        };
    }])

    .directive('dfLimitLoading', [function() {
        return {
            restrict: 'E',
            template: "<div class='col-lg-12' ng-if='dataLoading'><span style='display: block; width: 100%; text-align: center; color: #A0A0A0; font-size: 50px; margin-top: 100px'><i class='fa fa-refresh fa-spin'></i></div>"
        };
    }])

.directive('dfLimitDetails', [
    'MOD_LIMIT_ASSET_PATH',
    'dfApplicationData',
    'dfNotify',
    'dfObjectService',
    'INSTANCE_URL',
    '$http',
    '$cookies',
    'UserDataService',
    '$cookieStore',
    '$rootScope',
    'editLimitService',
    function(
        MOD_LIMIT_ASSET_PATH,
        dfApplicationData,
        dfNotify,
        dfObjectService,
        INSTANCE_URL,
        $http,
        $cookies,
        UserDataService,
        $cookieStore,
        $rootScope,
        editLimitService
        ) {

        return {

            restrict: 'E',
            scope: {
                limitData: '=?',
                newLimit: '=newLimit',
                selectType: '=?',
                activeView: '=?',
                apiData: '=?'
            },
            templateUrl: MOD_LIMIT_ASSET_PATH + 'views/df-limit-details.html',
            link: function (scope, elem, attrs) {

                var Limit = function  (limitData) {

                    var _limit = {
                        is_active: true,
                        key_text: null,
                        description: null,
                        name: null,
                        period: null,
                        rate: null,
                        role_id: null,
                        service_id: null,
                        type: null,
                        endpoint: null,
                        user_id: null,
                        cacheData: {}
                    };

                    limitData = limitData || _limit;

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: angular.copy(limitData),
                        recordCopy: angular.copy(limitData)
                    };
                };

                scope.limit = null;
                scope.saveData = {};

                scope.currentEditLimit = editLimitService;

                if (scope.newLimit) {
                  scope.currentEditLimit = new Limit();
                }

                scope.verbs = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];

                scope.dfSimpleHelp = {
                    verb: {
                        title: 'Limit by Verb ',
                        text: 'By default, all verbs will be limited unless a specific verb is selected for the limit type.'
                    },
                    endpoint: {
                        title: 'Endpoint Limits ',
                        text: 'Endpoint limits are combined with a service and follow the same conventions in the API Docs for endpoints. The endpoint created' +
                        ' must follow a simple form, such as with db service, <strong><i>"_schema/{table_name}"</i></strong>. Anything more detailed will still filter at the table level.'
                    }
                };

                // PUBLIC API

                scope.saveLimit = function () {

                    // validate
                    if (!scope._validateData()) {
                        return;
                    }

                    if (scope.newLimit) {

                        scope._saveLimit();
                    }
                    else {
                        scope._updateLimit();
                    }
                };

                scope.cancelEditor = function () {

                    // compare to original edit record
                    if (!dfObjectService.compareObjectsAsJson(scope.currentEditLimit.record, scope.currentEditLimit.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return;
                        }
                    }

                    scope.closeEditor();
                };

                /*/!** When API Endpoint is selected, need to map associative resource options *!/
                scope.buildResource = function(serviceObj){
                    var name = serviceObj.name;
                    if(angular.isObject(scope.events)){
                       if(scope.events.hasOwnProperty(name)){
                            var fullResource = scope.events[name];
                            var resourceObj = {

                            };
                            var levels = [];
                            angular.forEach(fullResource, function(val, key){
                                var prefixes = key.split('.');
                                if(prefixes[1] !== undefined){
                                    if(levels.indexOf(prefixes[1]) == -1){
                                        levels.push(prefixes[1]);
                                    }
                                }
                                if(prefixes[2] !== undefined){
                                    if(levels.indexOf(prefixes[1] + '/' + prefixes[2]) == -1){
                                        levels.push(prefixes[1] + '/' + prefixes[2]);
                                    }
                                }


                            });
                           scope.resources = levels;
                        }
                    }
                };*/

                /** When a user selects a resource, find any variables and supply an appropriate input */
                /*scope.selectResource = function(resource){
                    var pattern = /{(.*?)}/;
                    var inputVariable;
                    if(pattern.test(resource)){
                        inputVariable = pattern.exec(resource)[1];
                    }
                    if(angular.isDefined(inputVariable)){
                        scope.resourceId = inputVariable;
                        scope.resourceIdLabel = inputVariable;
                    }

                };*/

                // PRIVATE API

                scope.closeEditor = function() {

                    scope.currentEditLimit.record = {};
                    scope.limit = new Limit();

                    // force to manage view
                    scope.$emit('sidebar-nav:view:reset');
                };

                scope._validateData = function () {
                    var checkData = scope.currentEditLimit.record;

                    if(checkData.typeObj == null) {
                        var options = {
                            module: 'Limit Create Error',
                            message: 'Please select a limit type.',
                            type: 'error'
                        };
                        dfNotify.error(options);
                        return false;
                    }

                    if(checkData.name === null || checkData.name == ''){
                        var options = {
                            module: 'Limit Create Error',
                            message: 'The limit name cannot be blank.',
                            type: 'error'
                        };
                        dfNotify.error(options);
                        return false;
                    }

                    if(!angular.isDefined(checkData.typeObj)){
                        var options = {
                            module: 'Limit Create Error',
                            message: 'A Limit type must be selected.',
                            type: 'error'
                        };
                        dfNotify.error(options);
                        return false;
                    }

                    if(checkData.rate === null || checkData.rate == ''){
                        var options = {
                            module: 'Limit Create Error',
                            message: 'The limit rate cannot be blank.',
                            type: 'error'
                        };
                        dfNotify.error(options);
                        return false;
                    }
                    /** Check for only integers */
                    var reg = /^\d+$/;
                    if(!reg.test(checkData.rate)){
                        var options = {
                            module: 'Limit Create Error',
                            message: 'The limit rate must be an integer.',
                            type: 'error'
                        };
                        dfNotify.error(options);
                        return false;
                    }
                    return true;
                };

                // COMPLEX IMPLEMENTATION
                scope._saveLimit = function () {

                    // perform some checks on app data
                    scope.saveData = scope._prepareLimitData();
                    if(!scope.saveData){
                        return false;
                    }

                    var requestDataObj = {
                        params: {
                            fields: '*',
                            related: 'service_by_service_id,role_by_role_id,user_by_user_id,limit_cache_by_limit_id'
                        },
                        data: scope.saveData
                    };

                    dfApplicationData.saveApiData('limit', requestDataObj).$promise.then(

                        function(result) {

                            var messageOptions = {
                                module: 'Limits',
                                provider: 'dreamfactory',
                                type: 'success',
                                message: 'Limit saved successfully.'
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

                scope._updateLimit = function () {

                    // perform some checks on app data
                    scope.saveData = scope._prepareLimitData();

                    // instead of specifing params here maybe we should
                    // set dfApplicationData to pull from the prefs to set.
                    // For now we'll leave it here.j
                    var requestDataObj = {

                        params: {
                            fields: '*',
                            related: 'service_by_service_id,role_by_role_id,user_by_user_id,limit_cache_by_limit_id'
                        },
                        data: scope.saveData
                    };

                    dfApplicationData.updateApiData('limit', requestDataObj).$promise.then(

                        function (result) {

                            var messageOptions = {
                                module: 'Limit',
                                provider: 'dreamfactory',
                                type: 'success',
                                message: 'Limit updated successfully.'
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

                /**
                 * Strips out and prepares data for saving or updating in API model. Does some basic validations as well.
                 * Copies currentEditLimit to preserve
                 * objects, etc.
                 * @private
                 */
                scope._prepareLimitData = function () {
                    /* This will be the save data to be returned to the model */
                    var saveData = angular.copy(scope.currentEditLimit.record);

                    if(angular.isObject(saveData.periodObj)){
                        saveData.period = saveData.periodObj.value;
                    }
                    if(angular.isObject(saveData.typeObj)){
                        saveData.type = saveData.typeObj.value;
                    }
                    if(angular.isObject(saveData.user_by_user_id)){
                        saveData.user_id = saveData.user_by_user_id.id;
                    }
                    if(angular.isObject(saveData.role_by_role_id)){
                        saveData.role_id = saveData.role_by_role_id.id;
                    }
                    if(angular.isObject(saveData.service_by_service_id)){
                        saveData.service_id = saveData.service_by_service_id.id;
                    }
                    var endpointTypes = [
                        'instance.service.endpoint',
                        'instance.user.service.endpoint',
                        'instance.each_user.service.endpoint'
                    ];

                    /** Endpoint check for blank */
                    if(!saveData.endpoint || endpointTypes.indexOf(saveData.type) === -1)
                    {
                        saveData.endpoint = null;
                    }

                    delete saveData.key_text;
                    delete saveData.periodObj;
                    delete saveData.typeObj;
                    delete saveData.user_by_user_id;
                    delete saveData.role_by_role_id;
                    delete saveData.service_by_service_id;
                    delete saveData.limit_cache_by_limit_id;

                    return saveData;
                };


                // WATCHERS

                var watchLimitData = scope.$watch('limitData', function (newValue, oldValue) {

                    if (!newValue) return false;
                    scope.limit = new Limit(newValue);
                    //  scope.selectType(scope.limit.type);
                });


                // MESSAGES

                scope.$on('$destroy', function(e) {

                    scope.currentEditLimit.record = {};
                    scope.limit = new Limit();
                    watchLimitData();
                });


                // HELP

                scope.dfHelp = {

                };
            }
        };
    }]);