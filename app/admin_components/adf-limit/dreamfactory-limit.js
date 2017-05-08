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
                        checkAppObj: ['dfApplicationData', function (dfApplicationData) {

                            if (dfApplicationData.initInProgress) {

                                return dfApplicationData.initDeferred.promise;
                            }
                        }],

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

.factory('editLimitService', [ function(){
    return { record: {} };
}])

.service('updateLimitCacheData', [ function(){
    this.mergeCacheData = function(limits, limitCache){
        /* Enrich limits with limit cache data */
        if(angular.isObject(limitCache)){

            /* Precalc percentage for limits cache */
            angular.forEach(limitCache, function(value, key){
                if(value.attempts > 0){
                    value.percent = (value.attempts / value.max) * 100;
                } else {
                    value.percent = 0;
                }
            });
            /* Add limits cache to limits as object, Adjust max as necessary for updates on rate */
            angular.forEach(limits, function(value){
                /* need a zero and one for sorting purposes */
                value.record.active = (value.record.is_active) ? 'active' : 'inactive';
                var limitId = value.record.id;
                value.record.cacheData = limitCache.filter(function(obj){
                    return (obj.id == limitId);
                })[0];
                /* If value is being changed on an update, etc. */
                if(value.record.rate != value.record.cacheData.max){
                    value.record.cacheData.max = value.record.rate;
                    if(value.record.cacheData.attempts > 0){
                        value.record.cacheData.percent = (value.record.cacheData.attempts / value.record.cacheData.max) * 100;
                    } else {
                        value.record.cacheData.percent = 0;
                    }
                }
                /* For filtering and sorting, add percent to the root record */
                value.record.percent = value.record.cacheData.percent;
            });
        }
    };

}])

.controller('LimitCtl', ['INSTANCE_URL', '$rootScope', '$scope', '$http', 'dfApplicationData', 'dfNotify', 'dfObjectService', function (INSTANCE_URL, $rootScope, $scope, $http, dfApplicationData, dfNotify, dfObjectService) {

        $scope.$parent.title = 'Limits';
        $rootScope.isRouteLoading = true;

        dfApplicationData.loadApi(['system', 'limit', 'role', 'service', 'user', 'limit_cache']);

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

        // Set empty search result message
        $scope.emptySearchResult = {
            title: 'You have no Limits that match your search criteria!',
            text: ''
        };

        $scope.hidden = {
            users : true,
            roles : true,
            services: true,
            endpoint: true
        };

        $scope.selectType = function(recordType) {

            switch(recordType.value){
                case 'instance':
                    $scope.hidden = {
                        users : true,
                        roles : true,
                        services: true,
                        endpoint: true
                    };
                    break;
                case 'instance.user':
                    $scope.hidden = {
                        users : false,
                        roles : true,
                        services: true,
                        endpoint: true
                    };

                    break;
                case 'instance.each_user':
                    $scope.hidden = {
                        users : true,
                        roles : true,
                        services: true,
                        endpoint: true
                    };

                    break;
                case 'instance.service':
                    $scope.hidden = {
                        users : true,
                        roles : true,
                        services: false,
                        endpoint: true
                    };
                    break;
                case 'instance.role':
                    $scope.hidden = {
                        users : true,
                        roles : false,
                        services: true,
                        endpoint: true
                    };
                    break;
                case 'instance.user.service':
                    $scope.hidden = {
                        users : false,
                        roles : true,
                        services: false,
                        endpoint: true
                    };
                    break;
                case 'instance.each_user.service':
                    $scope.hidden = {
                        users : true,
                        roles : true,
                        services: false,
                        endpoint: true
                    };
                    break;
                case 'instance.service.endpoint':
                    $scope.hidden = {
                        users : true,
                        roles : true,
                        services: false,
                        endpoint: false
                    };
                    break;
                case 'instance.user.service.endpoint' :
                    $scope.hidden = {
                        users : false,
                        roles : true,
                        services: false,
                        endpoint: false
                    };
                    break;
                case 'instance.each_user.service.endpoint' :
                    $scope.hidden = {
                        users : true,
                        roles : true,
                        services: false,
                        endpoint: false
                    };
                    break;
            }

        };


    }])

    .directive('dfManageLimits', [
        '$rootScope',
        'MOD_LIMIT_ASSET_PATH',
        'dfApplicationData',
        'dfNotify',
        '$timeout',
        'editLimitService',
        'updateLimitCacheData',
        function ($rootScope,
            MOD_LIMIT_ASSET_PATH,
            dfApplicationData,
            dfNotify,
            $timeout,
            editLimitService,
            updateLimitCacheData) {

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
                        record: limitData
                    }
                };

                // For file upload on import limits;
                // there is a scope issue where the fileUpload directive
                // accesses import limit's parent scope.  It's not as bad as it sounds
                scope.uploadFile = {
                    path: ''
                };

                scope.currentViewMode = dfApplicationData.getUserPrefs().sections.user.manageViewMode;

                scope.limits = null;
                scope.limitEnabled = false;
                scope.currentEditLimit = editLimitService;

                scope.system = dfApplicationData.fetchFromApi('system');

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

                scope.limitCache;

                scope.subscription_required = false;

                scope.apiData = {};


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

                scope._deleteFromServer = function (requestDataObj) {

                    return dfApplicationData.deleteApiData('limit', requestDataObj).$promise;
                };

                scope._deleteCacheFromServer = function (requestDataObj) {
                    return dfApplicationData.deleteApiData('limit_cache', requestDataObj).$promise;
                };

                // COMPLEX IMPLEMENTATION

                scope._editLimit = function (limit) {

                    angular.copy(limit, scope.currentEditLimit.record);

                    var limitType = limit.type;
                    var limitPeriod = limit.period;
                    var userId = limit.user_id;

                    scope.currentEditLimit.record.typeObj = scope.instanceTypes.filter(function(obj){
                        return (obj.value == limitType);
                    })[0];
                    scope.currentEditLimit.record.periodObj = scope.limitPeriods.filter(function(obj){
                        return (obj.value == limitPeriod);
                    })[0];

                    if(angular.isObject(scope.users)){
                        scope.currentEditLimit.record.user_id = scope.users.filter(function(obj){
                            return (obj.id == userId);
                        })[0];

                    }
                    scope.selectType(scope.currentEditLimit.record.typeObj);


                };

                scope._deleteLimitCache = function (limit){
                    var requestDataObj = {
                        params: {
                            id: limit.record.id
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

                            limit.record.cacheData.attempts = 0;
                            limit.record.cacheData.percent = 0;
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
                    )
                };

                scope._deleteLimit = function (limit) {


                    var requestDataObj = {
                        params: {
                            id: limit.record.id
                        }
                    };


                    scope._deleteFromServer(requestDataObj).then(
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

                scope._setSelected = function (limit) {
                    var i = 0;
                    while (i < scope.selectedLimits.length) {
                        if (limit.record.id === scope.selectedLimits[i]) {
                            limit.__dfUI.selected = false;
                            scope.selectedLimits.splice(i, 1);
                            return;
                        }
                        i++
                    }
                    limit.__dfUI.selected = true;
                    scope.selectedLimits.push(limit.record.id);

                };

                scope._resetSelectedLimits = function () {
                    var requestDataObj = {
                        params: {
                            ids: scope.selectedLimits.join(','),
                            rollback: true
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
                                         obj.record.cacheData.attempts = 0;
                                         obj.record.cacheData.percent = 0;
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


                    scope._deleteFromServer(requestDataObj).then(
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

                            // console.log('Delete Limits Finally');
                        }
                    )
                };

                scope._determineLimitsStatus = function(systemData){
                    if(angular.isObject(systemData)){
                        angular.forEach(systemData, function(value){
                            if(value.name == 'limit'){
                                scope.limitEnabled = true;
                            }
                        });
                        if(!scope.limitEnabled){
                            scope.subscription_required = true;
                            /* Disable ability to navigate to create */
                            scope.links[1].path = scope.links[0].path;
                            return;
                        }
                    }

                };


                // WATCHERS

                var watchLimits = scope.$watch('limits', function (newValue, oldValue) {

                    if (newValue === null) {

                        var _limits = [];

                        var limits = dfApplicationData.getApiData('limit');
                        angular.forEach(limits, function (limit) {
                            _limits.push(new ManagedLimit(limit));
                        });
                        scope.limits = _limits;

                        updateLimitCacheData.mergeCacheData(scope.limits, scope.limitCache);
                        return;
                    }


                    if (newValue !== null && oldValue !== null) {

                        if (newValue.length === 0 && oldValue.length === 0) {
                            scope.emptySectionOptions.active = true;
                        }
                    }
                });

                var watchApiData = scope.$watchCollection(function () {

                    var limits =  dfApplicationData.getApiData('limit');
                    if(angular.isDefined(limits) && limits.length === 0){
                        scope.emptySectionOptions.active = true;
                    }

                    return limits;

                }, function (newValue, oldValue) {

                    var _limits = [];

                    var limitData = dfApplicationData.getApiData('limit');

                    angular.forEach(limitData, function (limit) {
                        _limits.push(new ManagedLimit(limit));
                    });

                    scope.limits = _limits;
                    updateLimitCacheData.mergeCacheData(scope.limits, scope.limitCache);


                    if(angular.isDefined(newValue) && angular.isDefined(oldValue)){
                        if (newValue.length === 0 && oldValue.length === 0) {
                            scope.emptySectionOptions.active = true;
                        }
                    }

                    return;
                });



                // MESSAGES

                scope.$on('toolbar:paginate:limit:update', function (e) {

                    var _limits = [];
                    var limits = dfApplicationData.getApiData('limit');


                    angular.forEach(limits, function (limit) {

                        var _limit = new ManagedLimit(limit);

                        var i = 0;

                        while (i < scope.selectedLimits.length) {

                            if (scope.selectedLimits[i] === _limit.record.id) {

                                _limit.__dfUI.selected = true;
                                break;
                            }

                            i++
                        }

                        _limits.push(_limit);
                    });

                    scope.limits = _limits;

                });

                scope.$on('$destroy', function (e) {
                    watchLimits();
                    scope.$broadcast('toolbar:paginate:limit:reset');

                });

                scope.$watch('$viewContentLoaded',
                    function (event) {
                        $rootScope.isRouteLoading = false;
                    }
                );

                $rootScope.$on("app", function  (){

                    scope.apps = dfApplicationData.getApiData('app');
                });

                $rootScope.$on("user", function  (){

                    scope.users = dfApplicationData.getApiData('user');
                });

                $rootScope.$on("role", function  (){

                    scope.roles = dfApplicationData.getApiData('role');
                });
                $rootScope.$on("service", function  (){

                    scope.services = dfApplicationData.getApiData('service');
                });

                $rootScope.$on("limit", function  (){
                    scope.$broadcast('toolbar:paginate:limit:reset');
                });

                $rootScope.$on("limit_cache", function  (){

                    scope.limitCache = dfApplicationData.getApiData('limit_cache');
                    updateLimitCacheData.mergeCacheData(scope.limits, scope.limitCache);


                });

                scope.$on("system", function  () {
                    scope.system = dfApplicationData.getApiData('system');
                    scope._determineLimitsStatus(scope.system)
                });


            }
        }
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
    'updateLimitCacheData', function(
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
        editLimitService,
        updateLimitCacheData) {

        return {

            restrict: 'E',
            scope: {
                limitData: '=?',
                newLimit: '=newLimit',
                selectType: '=?',
                activeView: '=?'
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
                    }
                };

                scope.limit = null;
                scope.saveData = {};

                scope.currentEditLimit = editLimitService;

                if (scope.newLimit) {
                  scope.currentEditLimit = new Limit();
                }

                scope.apps = dfApplicationData.getApiData('app');
                scope.services = dfApplicationData.getApiData('service');
                scope.roles = dfApplicationData.getApiData('role');
                scope.users = dfApplicationData.getApiData('user');

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

                scope.closeLimit = function () {

                    scope._closeLimit();
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
                scope._saveLimitToServer = function (requestDataObj) {
                    return dfApplicationData.saveApiData('limit', requestDataObj).$promise;
                };

                scope._updateLimitToServer = function (requestDataObj) {
                    return dfApplicationData.updateApiData('limit', requestDataObj).$promise;
                };

                scope._resetLimitDetails = function() {

                    if (scope.newLimit) {
                        scope.currentEditLimit.record = {};
                        scope.limit = new Limit();
                    }
                    else {
                        scope.currentEditLimit.record = {};
                    }
                };

               
                scope._validateData = function () {
                    return true;

                    //add limit validation here true / false
                };

                // COMPLEX IMPLEMENTATION
                scope._saveLimit = function () {

                    // perform some checks on app data
                    scope.saveData = scope._prepareLimitData();

                    var requestDataObj = {
                        params: {
                            fields: '*',
                        },
                        data: scope.saveData
                    };


                    scope._saveLimitToServer(requestDataObj).then(
                        function(result) {

                            var messageOptions = {
                                module: 'Limits',
                                provider: 'dreamfactory',
                                type: 'success',
                                message: 'Limit saved successfully.'
                            };

                            dfNotify.success(messageOptions);
                            scope._updateSavedLimit(result);

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
                                /*reset the currentEditLimit */
                                $rootScope.$broadcast('toolbar:paginate:limit:reset');
                                scope.currentEditLimit.record = {};
                                scope.activeView = scope.links[0];
                            }
                        )
                };

                scope._updateLimit = function () {

                    // perform some checks on app data
                    scope.saveData = scope._prepareLimitData();

                    // instead of specifing params here maybe we should
                    // set dfApplicationData to pull from the prefs to set.
                    // For now we'll leave it here.j
                    var requestDataObj = {

                        params: {
                            fields: '*'
                        },
                        data: scope.saveData
                    };

                    scope._updateLimitToServer(requestDataObj).then(
                        function (result) {

                            var messageOptions = {
                                module: 'Limit',
                                provider: 'dreamfactory',
                                type: 'success',
                                message: 'Limit updated successfully.'
                            };

                            dfNotify.success(messageOptions);
                            scope._updateSavedLimit(result);

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
                        function(test) {
                            /*reset the currentEditLimit */
                            $rootScope.$broadcast('toolbar:paginate:limit:reset');

                            scope.currentEditLimit.record = {};
                            scope.activeView = scope.links[0];
                        }
                    )


                };

                /**
                 * Strips out and prepares data for saving or updating in API model. Copies currentEditLimit to preserve
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

                    /**
                     * For building the endpoint
                     */
                    /*var pattern = /{(.*?)}/;

                    if(angular.isDefined(saveData.resource)){
                        var resourceBase = '';
                        if(pattern.test(saveData.resource)){
                            resourceBase += saveData.resource.replace(pattern, '');

                        }
                        if(angular.isDefined(saveData.resourceId)){
                            resourceBase += saveData.resourceId;
                        }
                        saveData.endpoint = resourceBase;
                    }
                    */

                    delete saveData.key_text;
                    delete saveData.cacheData;
                    delete saveData.periodObj;
                    delete saveData.typeObj;
                    delete saveData.user_by_user_id;
                    delete saveData.role_by_role_id;
                    delete saveData.service_by_service_id;

                    return saveData;
                };

                /**
                 * This to be called after a successful limit update to place
                 * service, role, user objects back in the limit model, updating
                 * the table.
                 * @private
                 */
                scope._updateSavedLimit = function (referenceLimit) {
                    if(angular.isObject(scope.currentEditLimit.record.user_by_user_id)){
                        referenceLimit.resource[0].user_by_user_id = scope.currentEditLimit.record.user_by_user_id;
                    }
                    if(angular.isObject(scope.currentEditLimit.record.role_by_role_id)){
                        referenceLimit.resource[0].role_by_role_id = scope.currentEditLimit.record.role_by_role_id;
                    }
                    if(angular.isObject(scope.currentEditLimit.record.service_by_service_id)){
                        referenceLimit.resource[0].service_by_service_id = scope.currentEditLimit.record.service_by_service_id;
                    }

                    /* Clear out any previous object references (if any) */
                    switch(scope.currentEditLimit.record.type) {
                        case 'instance':
                        case 'instance.each_user':
                            delete referenceLimit.user_by_user_id;
                            delete referenceLimit.role_by_role_id;
                            delete referenceLimit.service_by_service_id;
                            break;
                        case 'instance.user':
                            delete referenceLimit.role_by_role_id;
                            delete referenceLimit.service_by_service_id;
                            break;
                        case 'instance.service':
                            delete referenceLimit.user_by_user_id;
                            delete referenceLimit.role_by_role_id;
                            break;
                        case 'instance.role':
                            delete referenceLimit.user_by_user_id;
                            delete referenceLimit.service_by_service_id;
                            break;
                        case 'instance.user.service':
                            delete referenceLimit.role_by_role_id;
                            break;
                        case 'instance.each_user.service':
                            delete referenceLimit.user_by_user_id;
                            delete referenceLimit.role_by_role_id;
                            break;
                    }
                };

                scope._closeLimit = function () {

                    // perform some checks on app data

                    if (!dfObjectService.compareObjectsAsJson(scope.limit.record, scope.limit.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return false;
                        }

                    }

                    scope._resetLimitDetails();
                };


                // WATCHERS

                var watchLimitData = scope.$watch('limitData', function (newValue, oldValue) {

                    if (!newValue) return false;
                    scope.limit = new Limit(newValue);
                    //  scope.selectType(scope.limit.type);
                });

                

                // MESSAGES

                scope.$on('$destroy', function(e) {
                    scope._resetLimitDetails();
                    watchLimitData();
                    //watchAppData();
                    //watchRoleData();
                });

                $rootScope.$on("app", function  (){

                    scope.apps = dfApplicationData.getApiData('app');
                });

                $rootScope.$on("user", function  (){

                    scope.users = dfApplicationData.getApiData('user');
                });

                $rootScope.$on("role", function  (){

                    scope.roles = dfApplicationData.getApiData('role');
                });

                $rootScope.$on("limit_cache", function  (){

                    scope.limitCache = dfApplicationData.getApiData('limit_cache');
                });

                $rootScope.$on("service", function  () {

                    scope.services = dfApplicationData.getApiData('service');

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

