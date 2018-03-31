'use strict';


angular.module('dfApplication', ['dfUtility', 'dfUserManagement', 'ngResource'])

    .run([function () {

    }])

    .service('dfApplicationData', ['$q', '$http', 'INSTANCE_URL', 'dfObjectService', 'UserDataService', 'dfSystemData', '$rootScope', '$location', function ($q, $http, INSTANCE_URL, dfObjectService, UserDataService, dfSystemData, $rootScope, $location) {

        var dfApplicationObj = {
            apis: {}
        };

        // remove params with null values
        function _checkParams(options) {

            if (!options.params) {
                options['params'] = {};
                return;
            }
            angular.forEach(options.params, function (value, key) {

                if (value == null) {
                    delete options.params[key];
                }
            });
        }

        function _getApiData(apis, forceRefresh) {
            var deferred = $q.defer();

            var promises = apis.map(function(api) {
                return _loadOne(api, forceRefresh);
            });

            $q.all(promises).then(
                function (response) {
                    deferred.resolve(response);
                },
                function (response) {
                    deferred.reject(response);
                }
            );

            return deferred.promise;
        }

        function _loadOne(api, forceRefresh) {

            var params, options;
            var debugLevel = 0;
            var deferred = $q.defer();

            if (forceRefresh === true) {
                delete dfApplicationObj.apis[api];
            }
            if (dfApplicationObj.apis.hasOwnProperty(api)) {
                if (debugLevel >= 1) console.log('_loadOne(' + api + '): from cache', dfApplicationObj.apis[api]);
                if (debugLevel >= 2) console.log('_loadOne(' + api + '): dfApplicationObj', dfApplicationObj);
                deferred.resolve(dfApplicationObj.apis[api]);
            } else {
                // get default params, all tabs share this data so params must stay consistent
                params = _getApiPrefs().data[api];
                if (!params) {
                    params = {};
                }
                options = null;
                // add required api param used by resource to build url
                // this allows for aliasing so the same api can be called with different query params
                // for example event = system/event but event_list = system/event?as_list=true
                // this capability should be used as little as possible
                switch (api) {
                    case 'system':
                        params['api'] = '';
                        break;
                    case 'event_list':
                        params['api'] = 'event';
                        break;
                    case 'service_link':
                    case 'service_list':
                    case 'service_type_list':
                        // for this call use /api/v2 not /api/v2/system
                        options = {'url': INSTANCE_URL.url};
                        break;
                    default:
                        params['api'] = api;
                        break;
                }
                dfSystemData.resource(options).get(params).$promise.then(
                    function (response) {
                        if (api === 'service_link' || api === 'service_list') {
                            // add resource wrapper for consistency at higher levels
                            dfApplicationObj.apis[api] = {"resource": response.services};
                        } else if (api === 'service_type_list') {
                            // add resource wrapper for consistency at higher levels
                            dfApplicationObj.apis[api] = {"resource": response.service_types};
                        } else {
                            dfApplicationObj.apis[api] = response;
                        }
                        if (debugLevel >= 1) console.log('_loadOne(' + api + ',' +  !!forceRefresh + '): ok from server', dfApplicationObj.apis[api]);
                        if (debugLevel >= 2) console.log('_loadOne(' + api + ',' +  !!forceRefresh + '): dfApplicationObj', dfApplicationObj);
                        deferred.resolve(dfApplicationObj.apis[api]);
                    }, function (error) {
                        if (debugLevel >= 1) console.log('_loadOne(' + api + ',' +  !!forceRefresh + '): error from server', error);
                        if (debugLevel >= 2) console.log('_loadOne(' + api + ',' +  !!forceRefresh + '): dfApplicationObj', dfApplicationObj);
                        deferred.reject(error.data);
                    });
            }

            return deferred.promise;
        }

        // Load a single api synchronously. It would be good to get rid of this
        // but system config relies on it for now. It does not support params, options, or aliasing.

        function _getApiDataSync(api, forceRefresh) {

            var debugLevel = 0;

            if (forceRefresh === true) {
                delete dfApplicationObj.apis[api];
            }
            if (dfApplicationObj.apis.hasOwnProperty(api)) {
                if (debugLevel >= 1) console.log('_getApiDataSync(' + api + '): from cache', dfApplicationObj.apis[api]);
                if (debugLevel >= 2) console.log('_getApiDataSync(' + api + '): dfApplicationObj', dfApplicationObj);
            } else {
                var xhr, currentUser = UserDataService.getCurrentUser();

                if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
                    xhr = new XMLHttpRequest();
                } else {// code for IE6, IE5
                    xhr = new ActiveXObject("Microsoft.XMLHTTP");
                }

                xhr.open("GET", INSTANCE_URL.url + '/system/' + api, false);
                xhr.setRequestHeader("X-DreamFactory-API-Key", "6498a8ad1beb9d84d63035c5d1120c007fad6de706734db9689f8996707e0f7d");
                if (currentUser && currentUser.session_token) {
                    xhr.setRequestHeader("X-DreamFactory-Session-Token", currentUser.session_token);
                }
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.send();

                if (xhr.readyState == 4 && xhr.status == 200) {
                    dfApplicationObj.apis[api] = angular.fromJson(xhr.responseText);
                    if (debugLevel >= 1) console.log('_getApiDataSync(' + api + ',' +  !!forceRefresh + '): ok from server', dfApplicationObj.apis[api]);
                    if (debugLevel >= 2) console.log('_getApiDataSync(' + api + ',' +  !!forceRefresh + '): dfApplicationObj', dfApplicationObj);
                } else {
                    if (debugLevel >= 1) console.log('_getApiDataSync(' + api + ',' +  !!forceRefresh + '): error from server', xhr.responseText);
                    if (debugLevel >= 2) console.log('_getApiDataSync(' + api + ',' +  !!forceRefresh + '): dfApplicationObj', dfApplicationObj);
                }
            }

            return dfApplicationObj.apis[api];
        }

        // Resets the dfApplicationObj to initial state
        function _resetApplicationObj() {

            dfApplicationObj = {
                apis: {}
            };
        }

        // Save api data to server
        function _saveApiData(api, options) {

            // check for and remove null value params
            _checkParams(options);

            // set up our params
            var params = options.params;
            params['api'] = api;

            if (!options.dontWrapData) {
                // add wrapper
                options.data = {"resource": [options.data]};
            }

            // return response from server as promise
            return dfSystemData.resource(options).post(params, options.data, function (result) {

                // update the application object and session storage.
                if (result &&
                    result.resource &&
                    Object.prototype.toString.call(result.resource) === '[object Array]' &&
                    result.resource.length > 0) {

                    result = result.resource[0];
                }

                __insertApiData(api, result);
            });
        }

        // Save api data to server
        function _updateApiData(api, options) {

            // check for and remove null value params
            _checkParams(options);

            // set up our params
            var params = options.params;
            params['api'] = api;

            // return response from server as promise
            return dfSystemData.resource({ url: options.url })[options.method || 'put'](params, options.data, function (result) {

                // update the application object and session storage.
                __updateApiData(api, result);
            });
        }

        // Delete api data from server
        // update session storage and app obj
        function _deleteApiData(api, options) {

            // check for and remove null value params
            _checkParams(options);

            // set up our params
            var params = options.params;
            params['api'] = api;
            params['rollback'] = _getApiPrefs().data[api].rollback;

            return dfSystemData.resource().delete(params, options.data, function (result) {

                // update the application object and session storage.
                __deleteApiData(api, result);
            });
        }

        // retrieves new data set from server
        // update session storage and app obj
        function _getDataSetFromServer(api, options) {

            options = options || {params: {}};

            var defaults = _getApiPrefs().data[api];

            options.params = dfObjectService.mergeObjects(defaults, options.params);

            // set up our params
            var params = options.params;
            params['api'] = api;

            // return response from server as promise
            return dfSystemData.resource(options).get(params, function (result) {

                // update the application object and session storage.
                __replaceApiData(api, result);
            });
        }

        // retrieves API settings
        function _getApiPrefs() {

            var limit = 100;

            return {
                data: {
                    app: {
                        include_count: true,
                        limit: limit,
                        related: 'role_by_role_id'
                    },
                    role: {
                        include_count: true,
                        related: 'role_service_access_by_role_id,lookup_by_role_id',
                        limit: 10000
                    },
                    admin: {
                        include_count: true,
                        limit: limit,
                        related: 'lookup_by_user_id'
                    },
                    user: {
                        include_count: true,
                        limit: limit,
                        related: 'lookup_by_user_id,user_to_app_to_role_by_user_id'
                    },
                    service: {
                        include_count: true,
                        limit: limit,
                        related: 'service_doc_by_service_id'
                    },
                    service_link: {
                        group:"source control,file"
                    },
                    service_list: {
                    },
                    service_type_list: {
                    },
                    cache: {
                        fields: '*'
                    },
                    email_template: {
                        include_count: true
                    },
                    lookup: {
                        include_count: true
                    },
                    cors: {
                        include_count: true
                    },
                    event_list: {
                        as_list: true
                    },
                    event_script: {
                        as_list: true
                    },
                    limit: {
                        include_count: true,
                        limit: limit,
                        related: 'service_by_service_id,role_by_role_id,user_by_user_id,limit_cache_by_limit_id'
                    }
                }
            };
        }

        // Insert data into local model dfApplicationObj
        function __insertApiData(api, dataObj) {

            // Check for existence of api and ensure that it is an array
            if (dfApplicationObj.apis.hasOwnProperty(api) && Object.prototype.toString.call(dfApplicationObj.apis[api].resource) === '[object Array]') {

                // Everything looks good...let's add the data object to the array
                dfApplicationObj.apis[api].resource.push(dataObj);
            }

            // Update record count
            if (dfApplicationObj.apis.hasOwnProperty(api) && dfApplicationObj.apis[api].hasOwnProperty('meta') && Object.prototype.toString.call(dfApplicationObj.apis[api].meta) === '[object Object]') {

                if (dfApplicationObj.apis[api].meta.hasOwnProperty('count')) {

                    dfApplicationObj.apis[api].meta['count']++;
                }
                else {

                    dfApplicationObj.apis[api].meta['count'] = 1;
                }
            }
        }

        // Insert data into local model dfApplicationObj
        function __updateApiData(api, dataObj) {

            if (dataObj.resource) {
                dataObj = dataObj.resource;
            }

            // Check for existence of api and ensure that it is an array
            if (dfApplicationObj.apis.hasOwnProperty(api) && Object.prototype.toString.call(dfApplicationObj.apis[api].resource) === '[object Array]') {

                // So counting vars
                var found = false,
                    i = 0;

                // looking for api record that was just updated
                while (!found && i <= dfApplicationObj.apis[api].resource.length - 1) {

                    // if we find it
                    if (dataObj.id === dfApplicationObj.apis[api].resource[i].id) {

                        // stop looping
                        found = true;

                        // remove it and splice in new one
                        dfApplicationObj.apis[api].resource.splice(i, 1, dataObj);
                    }

                    // duh
                    i++;
                }
            }
        }

        // Deletes data from local model dfApplicationObj
        function __deleteApiData(api, result) {

            // Searches for and removes a record from the local model
            function removeRecord(record) {

                // So counting vars
                var found = false,
                    i = 0;

                // looking for api record that was just deleted
                while (!found && i < dfApplicationObj.apis[api].resource.length) {

                    // if we find it
                    if (record.id === dfApplicationObj.apis[api].resource[i].id) {

                        // stop looping
                        found = true;

                        // remove it
                        dfApplicationObj.apis[api].resource.splice(i, 1);
                    }

                    // duh
                    i++;
                }
            }

            function updateCount() {

                // Update record count
                if (dfApplicationObj.apis.hasOwnProperty(api) && dfApplicationObj.apis[api].hasOwnProperty('meta') && Object.prototype.toString.call(dfApplicationObj.apis[api].meta) === '[object Object]') {

                    // Do we have a count property.  And we should
                    if (dfApplicationObj.apis[api].meta.hasOwnProperty('count')) {

                        // decrement
                        dfApplicationObj.apis[api].meta['count']--;
                    }
                }
            }


            // Sanity check for api.  Let's make sure it exists.
            if (dfApplicationObj.apis.hasOwnProperty(api) && Object.prototype.toString.call(dfApplicationObj.apis[api].resource) === '[object Array]') {

                // Deleting multiple records
                if (result.hasOwnProperty('resource')) {

                    // loop through them
                    angular.forEach(result.resource, function (_record) {

                        // remove from local model
                        removeRecord(_record);

                        // update count
                        updateCount();
                    });
                }
                else {

                    // Delete the single record from the local model
                    removeRecord(result);
                    updateCount();
                }
            }
        }

        // Replaces a entire single api data set in
        // local model dfApplicationObj
        function __replaceApiData(api, result) {

            // Check for existence of api and ensure that it is an array
            if (dfApplicationObj.apis.hasOwnProperty(api) && Object.prototype.toString.call(dfApplicationObj.apis[api].resource) === '[object Array]') {

                // Everything looks good...let's add the data object to the array
                dfApplicationObj.apis[api].resource = result.resource;
                dfApplicationObj.apis[api].meta = result.meta;
            }
        }

        return {

            // Returns dfApplicationObj that is stored in the service
            getApplicationObj: function () {

                return dfApplicationObj;
            },

            // Resets dfApplicationObj to initial state
            resetApplicationObj: function() {

                _resetApplicationObj();
            },

            getApiRecordCount: function (api) {

                var count = 0;
                if (dfApplicationObj.apis.hasOwnProperty(api) && dfApplicationObj.apis[api].meta) {
                    count =  dfApplicationObj.apis[api].meta.count;
                }
                return count;
            },

            // get api data by name
            getApiDataFromCache: function (api) {

                // temporary for backwards compatibility
                var result = undefined;

                // check for data
                if (dfApplicationObj.apis.hasOwnProperty(api)) {

                    // return if it exists
                    if (dfApplicationObj.apis[api].resource) {
                        result = dfApplicationObj.apis[api].resource;
                    }
                    else {
                        result = dfApplicationObj.apis[api];
                    }
                }
                return result;
            },

            // delete api data by name
            deleteApiDataFromCache: function (api) {

                // check for data
                if (dfApplicationObj.apis.hasOwnProperty(api)) {

                    delete dfApplicationObj.apis[api];
                }
            },

            // save data to server and update app obj
            saveApiData: function (api, options) {

                if (dfApplicationObj.apis.hasOwnProperty(api)) {

                    return _saveApiData(api, options);
                }
            },

            // update data on server and update app obj
            updateApiData: function (api, options) {

                if (dfApplicationObj.apis.hasOwnProperty(api)) {

                    return _updateApiData(api, options);
                }
            },

            // delete data on server and update app obj
            deleteApiData: function (api, options) {

                if (dfApplicationObj.apis.hasOwnProperty(api)) {

                    return _deleteApiData(api, options);
                }
            },

            // retrieves more records from the db.  Will replace current
            // working set of records for specified api in the application obj
            getDataSetFromServer: function (api, options) {

                if (dfApplicationObj.apis.hasOwnProperty(api)) {

                    return _getDataSetFromServer(api, options);
                }
            },

            // get API preferences
            getApiPrefs: function () {

                return _getApiPrefs();
            },

            // Get table names. If not in cache then request from server and update cache.
            // This piggybacks on the existing service data to store components.

            getServiceComponents: function (serviceName, url, params, forceRefresh) {

                var deferred = $q.defer();
                // assumes services are loaded already and there's a matching service name
                var serviceList = this.getApiDataFromCache('service_list');
                var service = serviceList.filter(function(obj) {
                    return obj.name === serviceName;
                })[0];
                if (service.components && !forceRefresh) {
                    deferred.resolve(service.components);
                } else {
                    $http.get(url, params || {})
                        .then(
                            function (result) {
                                service.components = result.data.resource || result.data;
                                deferred.resolve(service.components);
                                __updateApiData('service_list', service);
                            },
                            function (error) {
                                deferred.reject(error.data);
                            }
                        );
                }
                return deferred.promise;
            },

            // Table list has changed. Update cache with new list.

            updateServiceComponentsLocal: function (svc) {

                // assumes services are loaded already and there's a matching service name
                var serviceList = this.getApiDataFromCache('service_list');
                if (serviceList !== undefined) {
                    var service = serviceList.filter(function(obj) {
                        return obj.name === svc.name;
                    })[0];
                    service.components = svc.components;
                }
            },

            getApiData: function(apis, forceRefresh) {
                return _getApiData(apis, forceRefresh);
            },

            getApiDataSync: function(api, forceRefresh) {
                return _getApiDataSync(api, forceRefresh);
            }
        };
    }])

    .service('dfSystemData', ['INSTANCE_URL', '$resource', 'dfObjectService', function (INSTANCE_URL, $resource, dfObjectService) {

        return {

            resource: function (options) {

                options = options || {};

                var defaults = {
                    headers: ''
                };

                options = dfObjectService.mergeObjects(options, defaults);
                var url = options.url || INSTANCE_URL.url + '/system/:api/:id';
                var queryParams = options.queryParams || { api: '@api', id: '@id' };


                // Return a resource for our service so we can just call the operation we want.
                return $resource(url, queryParams, {

                    get: {
                        method: 'GET',
                        headers: options.headers
                    },
                    post: {
                        method: 'POST',
                        headers: options.headers
                    },
                    put: {
                        method: 'PUT',
                        headers: options.headers
                    },
                    patch: {
                        method: 'PATCH',
                        headers: options.headers
                    },
                    delete: {
                        method: 'DELETE',
                        headers: options.headers
                    }
                });
            }
        };
    }])

    // Intercepts outgoing http calls.  Checks for valid session.  If 401 will trigger a pop up login screen.
    .factory('httpValidSession', ['$q', '$rootScope', '$location', 'INSTANCE_URL', '$injector', function ($q, $rootScope, $location, INSTANCE_URL, $injector) {

        var refreshSession = function (reject) {

            var $http = $injector.get('$http');
            var UserDataService = $injector.get('UserDataService');
            var user = UserDataService.getCurrentUser();
            var deferred = $injector.get('$q').defer();

            var url = user.is_sys_admin ? '/system/admin/session' : '/user/session';

            $http({
                method: 'PUT',
                url: INSTANCE_URL.url + url
            }).then(function (result) {
                UserDataService.setCurrentUser(result.data);
                retry(reject.config, deferred);
            }, function () {
                newSession(reject, deferred);
            });

            return deferred.promise;
        };

        var retry = function (config, deferred) {

            var request = {
                method: config.method,
                url: config.url
            };
            if (config.params) {
                request.params = config.params;
            }
            if (config.data) {
                request.data = config.data;
            }
            if (config.transformRequest) {
                request.transformRequest = config.transformRequest;
            }
            var $http = $injector.get('$http');
            $http(request).then(deferred.resolve, deferred.reject);
            return deferred.promise;
        };

        var newSession = function (reject, deferred) {

            var UserDataService = $injector.get('UserDataService');
            UserDataService.unsetCurrentUser();

            var UserEventsService = $injector.get('UserEventsService');
            var deferred = deferred || $injector.get('$q').defer();

            $rootScope.$$childHead.openLoginWindow(reject);
            $rootScope.$on('user:login:success', function () {
                retry(reject.config, deferred);
            });

            return deferred.promise;
        };

        return {

            request: function (config) {

                return config;
            },

            requestError: function (reject) {

                return $q.reject(reject);
            },

            response: function (response) {

                return response;
            },

            responseError: function (reject) {

                switch ($location.path()) {

                    // If we get an error from any of the
                    // login / register pages, ignore it.
                    // No need to pop up a login.
                    case '/login':
                    case '/user-invite':
                    case '/register-confirm':
                    case '/register':
                    case '/register-complete':
                    // apidocs has its own login
                    case '/apidocs':
                        break;

                    default:
                        if (!reject.config.ignore401 && reject.config.url.indexOf('/session') === -1) {
                            var UserDataService = $injector.get('UserDataService');
                            var currentUser = UserDataService.getCurrentUser();
                            if (currentUser) {
                                if (reject.status === 401 || (reject.data && reject.data.error && reject.data.error.code === 401)  ||
                                    ((reject.status === 403 || (reject.data && reject.data.error && reject.data.error.code === 403)) && reject.data.error.message.indexOf('The token has been blacklisted') >= 0)) {

                                    if (reject.data.error.message.indexOf('Token has expired') >= 0 || reject.config.url.indexOf('/profile') !== -1) {
                                        //  refresh session
                                        return refreshSession(reject);
                                    }
                                    else {
                                        // new session
                                        return newSession(reject);
                                    }
                                }
                            }
                        }
                        break;
                }

                return $q.reject(reject);
            }
        };
    }]);