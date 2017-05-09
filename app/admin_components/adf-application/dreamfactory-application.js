'use strict';


angular.module('dfApplication', ['dfUtility', 'dfUserManagement', 'ngResource', 'ngProgress'])

    .factory('httpRequestInterceptor', function () {
        return {
            request: function (config) {

                config.headers['X-UA-Compatible'] = 'IE=Edge';

                return config;
            }
        };
    })

    .config(function ($httpProvider) {
        $httpProvider.interceptors.push('httpRequestInterceptor');
    })

    .run(['$q', 'dfApplicationData', 'dfSessionStorage', 'UserDataService', 'SystemConfigDataService', '$location', '$rootScope', 'ngProgressFactory',
        function ($q, dfApplicationData, dfSessionStorage, UserDataService, SystemConfigDataService, $location, $rootScope, ngProgressFactory) {

            //TODO:Add progress bar later on once stabilized.
            //$rootScope.progressbar = ngProgressFactory.createInstance();

            // Get the System Config synchronously because we are dead in the water without it
            var SystemConfig = SystemConfigDataService.getSystemConfigFromServerSync();

            SystemConfigDataService.setSystemConfig(SystemConfig);

            var appObj = dfSessionStorage.getItem('dfApplicationObj');
            var userObj = UserDataService.getCurrentUser();

            // if no local dfApplicationObject and there is a current user
            // **possibly a closed tab without logging out**
            if (!appObj && userObj) {

                dfApplicationData.init();
            }

            // if we have a dfApplicationObj and a current user
            // ** browser refresh **
            if (appObj && userObj) {

                dfApplicationData.init();
            }

            // No local dfApplicationObj and no current user
            if (!appObj && !userObj) {

                // Destroy any existing dfApplicationObj that may be in memory
                dfApplicationData.destroyApplicationObj();

                // redirect to login
                // the application routing will take care of this automatically

            }
            if (appObj && !userObj) {

                // Something went wrong.  App obj should not be present
                // This should be ammedned to accept guest users as a possibility
                dfSessionStorage.removeItem('dfApplicationObj');

                // Delete the dfApplicationObj if it is in memory
                dfApplicationData.destroyApplicationObj();

                // send to login
                $location.url('/login');
            }
        }])

    .service('dfApplicationData', ['$q', '$http', 'INSTANCE_URL', 'dfObjectService', 'UserDataService', 'dfSystemData', 'dfSessionStorage', 'dfUserPrefs', '$rootScope', '$location', 'dfMainLoading', function ($q, $http, INSTANCE_URL, dfObjectService, UserDataService, dfSystemData, dfSessionStorage, dfUserPrefs, $rootScope, $location, dfMainLoading) {


        var dfApplicationObj = {
            currentUser: null,
            apis: {}
        };

        var dfMainLoadData = {
            numElemsToLoad: 0,
            percentIncrement: 0,
            percentLoaded:0,
            loadData: {

                op: 'Loading',
                module: null,
                percent: 0
            }
        };

        // remove params with null values
        function _checkParams(options) {

            if (!options.params) {
                debugger;
                options['params'] = {};
                return;
            }
            angular.forEach(options.params, function (value, key) {

                if (value == null) {
                    debugger;
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

            var params;
            var debugLevel = 1;
            var deferred = $q.defer();

            if (forceRefresh !== true && dfApplicationObj.apis.hasOwnProperty(api)) {
                if (debugLevel >= 1) console.log('_loadOne(' + api + '): from cache', dfApplicationObj.apis[api]);
                if (debugLevel >= 2) console.log('_loadOne(' + api + '): dfApplicationObj', dfApplicationObj);
                deferred.resolve(dfApplicationObj.apis[api]);
            } else {
                // get default params, all tabs share this data so params must stay consistent
                params = _getApiPrefs().data[api];
                if (!params) {
                    params = {};
                }
                // add required api param used by resource to build url
                params['api'] = (api === 'system' ? '' : api);
                dfSystemData.resource().get(params).$promise.then(
                    function (response) {
                        dfApplicationObj.apis[api] = response;
                        if (debugLevel >= 1) console.log('_loadOne(' + api + '): ok from server', dfApplicationObj.apis[api]);
                        if (debugLevel >= 2) console.log('_loadOne(' + api + '): dfApplicationObj', dfApplicationObj);
                        dfSessionStorage.setItem('dfApplicationObj', angular.toJson(dfApplicationObj, true));
                        deferred.resolve(dfApplicationObj.apis[api]);
                        $rootScope.$broadcast(api);
                    }, function (error) {
                        if (debugLevel >= 1) console.log('_loadOne(' + api + '): error from server', error);
                        if (debugLevel >= 2) console.log('_loadOne(' + api + '): dfApplicationObj', dfApplicationObj);
                        deferred.reject(error.data);
                    });
            }

            return deferred.promise;
        }

        // Resets the dfApplicationObj to initial state
        function _resetApplicationObj() {

            dfApplicationObj = {
                currentUser: null,
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


            // had to put in this special rule
            // for config.  Do not send id param.
            if (api === 'config') {
                params.id = null;
            }

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
            })
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

        // saves current user to server
        // update session storage and app obj
        function _saveUserPrefs(userPrefs) {

            dfUserPrefs.setPrefs(userPrefs);

            var adminPreferences = {
                'resource': [
                    {
                        'name': 'adminPreferences',
                        'value': userPrefs
                    }
                ]
            };

            return UserDataService.saveUserSetting(adminPreferences);
        }

        // retrieves user settings
        function _getUserPrefs() {

            var prefs, result, valid;

            // get current settings
            prefs = dfUserPrefs.getPrefs();

            // if not loaded then request from server
            if (prefs === null) {

                // returns 404 if adminPreferences settings do not exist yet
                result = UserDataService.getUserSetting('adminPreferences', true);

                valid = false;

                if (result.status === 200) {

                    // success, pull out settings data
                    prefs = angular.fromJson(result.response);

                    // safety belt to make sure data looks sane
                    if (prefs.hasOwnProperty('application') && prefs.application) {
                        valid = true;
                    }
                }

                // if no valid prefs available then use defaults
                if (!valid) {
                    prefs = dfUserPrefs.getDefaultPrefs();
                }

                // set prefs object. this is the 'cache'
                dfUserPrefs.setPrefs(prefs);
            }

            return prefs;
        }

        // retrieves API settings
        function _getApiPrefs() {

            var limit = 50;

            return {
                data: {
                    app: {
                        include_count: true,
                        limit: limit,
                        related: 'role_by_role_id'
                    },
                    app_group: {
                        include_count: true,
                        limit: limit,
                        related: 'app_to_app_group_by_group_id'
                    },
                    role: {
                        include_count: true,
                        related: 'role_service_access_by_role_id,role_lookup_by_role_id',
                        limit: limit
                    },
                    admin: {
                        include_count: true,
                        limit: limit,
                        related: 'user_lookup_by_user_id'
                    },
                    user: {
                        include_count: true,
                        limit: limit,
                        related: 'user_lookup_by_user_id,user_to_app_to_role_by_user_id'
                    },
                    service: {
                        include_count: true,
                        include_components: true,
                        limit: limit
                    },
                    config: {},
                    email_template: {
                        include_count: true
                    },
                    lookup: {
                        include_count: true
                    },
                    cors: {
                        include_count: true
                    },
                    event: {
                        scriptable: true
                    },
                    limit: {
                        include_count: true,
                        limit: limit,
                        related: 'service_by_service_id,role_by_role_id,user_by_user_id'
                    },
                    limit_cache: {
                        include_count: true,
                        limit: limit
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

            // Lets update our local storage.
            if (dfSessionStorage.setItem('dfApplicationObj', angular.toJson(dfApplicationObj, true))) {
                return true;
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

            // Lets update our local storage.
            if (dfSessionStorage.setItem('dfApplicationObj', angular.toJson(dfApplicationObj, true))) {
                return true;
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
                    })
                }
                else {

                    // Delete the single record from the local model
                    removeRecord(result);
                    updateCount();
                }

                // set to session storage
                if (dfSessionStorage.setItem('dfApplicationObj', angular.toJson(dfApplicationObj, true))) {
                    return true;
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
            }

            // Lets update our local storage.
            if (dfSessionStorage.setItem('dfApplicationObj', angular.toJson(dfApplicationObj, true))) {
                return true;
            }
        }

        function _getLocation() {
            return $location.path();
        }

        return {

            // Public function to init the app
            init: function () {

                dfApplicationObj.currentUser = UserDataService.getCurrentUser();

                // Are we an admin
                if (dfApplicationObj.currentUser.is_sys_admin) {
                    _getUserPrefs();
                }
            },

            // Returns app obj that is stored in the service
            getApplicationObj: function () {

                return dfApplicationObj;
            },

            // Sets app obj stored in the service
            // Useful for when the app obj is pulled from session storage
            // Otherwise the app obj should be built by init or other functions
            // strictly for editing the app obj
            setApplicationObj: function (appObj) {

                dfApplicationObj = appObj;
            },

            // for when you just have to update the applicationObj manually
            // certain things like updating schema components don't adhere
            // to the resource way of updating.  Having second thoughts about
            // the way that interface works.  Will revisit.
            setApplicationObjOverride: function (appObj) {

                dfApplicationObj = appObj;
                this.updateApplicationStore();
            },

            // Update browser sessionStorage with current dfApplicationObj in memory.
            updateApplicationStore: function () {

                dfSessionStorage.setItem('dfApplicationObj', angular.toJson(dfApplicationObj, true));
            },

            // removes the app obj from session storage and sets local copy to empty obj
            destroyApplicationObj: function () {

                // Set local app obj to empty
                _resetApplicationObj();

                // remove from session storage
                if (dfSessionStorage.removeItem('dfApplicationObj')) {
                    return true;
                }
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
                console.log('getApiDataFromCache(' + api + ')', result);
                return result;
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

            // retrieves the stored currentUser from local data model
            getCurrentUser: function () {

                if (dfApplicationObj.hasOwnProperty('currentUser')) {

                    return dfApplicationObj.currentUser;
                }
            },

            // saves current user preferences to server
            saveUserPrefs: function (adminPrefs) {

                return _saveUserPrefs(adminPrefs);
            },

            // get current user preferences from server
            getUserPrefs: function () {

                return _getUserPrefs();

            },

            // get API preferences
            getApiPrefs: function () {

                return _getApiPrefs();

            },

            // get data about current state of init
            getMainLoadData: function () {

                return dfMainLoadData;
            },

            getLocation: function () {
                return _getLocation();
            },

            getServiceComponents: function (serviceName, url, params, forceRefresh) {
                var deferred = $q.defer();
                var service = this.getApiDataFromCache('service');
                if (service !== undefined) {
                    service = service.filter(function(obj) {
                        return obj.name === serviceName;
                    })[0];
                }
                if (service.components && !forceRefresh) {
                    deferred.resolve(service.components);
                } else {
                    var apiUrl = url || INSTANCE_URL + '/api/v2/' + service.name + '/?as_access_list=true';
                    $http.get(apiUrl, params || {})
                        .success(function (result) {
                            service.components = result.resource || result;
                            deferred.resolve(service.components);
                            __updateApiData('service', service);
                        });
                }
                return deferred.promise;
            },

            updateServiceComponentsLocal: function (service) {
                var dfServiceData = this.getApiDataFromCache('service');
                if (dfServiceData !== undefined) {
                    dfServiceData = dfServiceData.filter(function(obj) {
                        return obj.name === service.name;
                    })[0];
                }
                dfServiceData.components = service.components;
            },

            getApiData: function(apis, forceRefresh) {
                return _getApiData(apis, forceRefresh);
            }

        }
    }])

    .service('dfSystemData', ['$http', 'XHRHelper', 'INSTANCE_URL', '$resource', 'dfObjectService', function ($http, XHRHelper, INSTANCE_URL, $resource, dfObjectService) {

        return {

            resource: function (options) {

                options = options || {};

                var defaults = {
                    headers: ''
                };

                options = dfObjectService.mergeObjects(options, defaults);
                var url = options.url || INSTANCE_URL + '/api/v2/system/:api/:id';
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
        }
    }])

    // user configurable prefs for UI

    .factory('dfUserPrefs', [function () {

        var prefs = null;

        return {

            getPrefs: function () {

                return prefs;
            },

            setPrefs: function (data) {

                prefs = data;
            },

            getDefaultPrefs: function () {

                return {
                    application: {
                        notificationSystem: {
                            success: 'pnotify',
                            error: 'pnotify',
                            warn: 'pnotify'
                        }
                    },
                    sections: {
                        app: {
                            autoClose: false,
                            manageViewMode: 'table'
                        },
                        role: {
                            autoClose: false,
                            manageViewMode: 'table'
                        },
                        admin: {
                            autoClose: false,
                            manageViewMode: 'table'
                        },
                        user: {
                            autoClose: false,
                            manageViewMode: 'table'
                        },
                        service: {
                            autoClose: false,
                            manageViewMode: 'table'
                        }
                    }
                };
            }
        }
    }])

    // This intercepts outgoing http calls.  Checks for restricted verbs from config
    // and tunnels them through a POST if necessary
    .factory('httpVerbInterceptor', ['$q', 'SystemConfigDataService', function ($q, SystemConfigDataService) {

        return {

            request: function (config) {

                if (SystemConfigDataService.getSystemConfig().restricted_verbs.length <= 0) return config;

                var restricted_verbs = SystemConfigDataService.getSystemConfig().restricted_verbs,
                    i = 0,
                    currMethod = config.method;

                while (i < restricted_verbs.length) {

                    if (currMethod === restricted_verbs[i]) {
                        config.method = "POST";
                        config.headers['X-HTTP-METHOD'] = currMethod;
                        break;
                    }

                    i++
                }

                return config;
            }
        }
    }])


    .factory('httpWrapperInterceptor', [ 'SystemConfigDataService',
        function (SystemConfigDataService) {
            return {
                request: function (config) {

                    var environment = SystemConfigDataService.getSystemConfig() || {};

                    if (!environment.config) {
                        return config;
                    }

                    if (config.data instanceof Array && environment.config.alway_wrap_resources) {
                        // wrap the data with always_wrap_resources
                        var data = {};
                        data[environment.config.resource_wrapper] = angular.copy(config.data);
                        config.data = data;
                    }

                    return config;
                },

                response: function (response) {

                    var environment = SystemConfigDataService.getSystemConfig() || {};

                    if (typeof(response.data) !== 'object' || !environment.config) {
                        return response;
                    }


                    var keys = Object.keys(response.data);

                    if (environment.config.always_wrap_resources && keys.length === 1 && response.data[keys[0]] instanceof Array && keys[0] === environment.config.resource_wrapper) {
                        response.data = response.data[environment.config.resource_wrapper];
                    }

                    return response;
                }
            }
        }
    ])

    // Intercepts outgoing http calls.  Checks for valid session.  If 401 will trigger a pop up login screen.
    .factory('httpValidSession', ['$q', '$rootScope', '$location', 'INSTANCE_URL', '$injector', '$cookies', function ($q, $rootScope, $location, INSTANCE_URL, $injector, $cookies) {


        var putSession = function (reject) {
            var $http = $injector.get('$http');
            var UserDataService = $injector.get('UserDataService');
            var user = UserDataService.getCurrentUser();
            var deferred = $injector.get('$q').defer();

            var url = user.is_sys_admin ? '/api/v2/system/admin/session' : '/api/v2/user/session';

            $http({
                method: 'PUT',
                url: INSTANCE_URL + url
            }).then(function (result) {
                $http.defaults.headers.common['X-DreamFactory-Session-Token'] = result.data.session_token;
                $cookies.PHPSESSID = $cookies.PHPSESSID === result.data.session_token ? $cookies.PHPSESSID : result.data.session_token
                UserDataService.setCurrentUser(result.data);
                retry(reject.config, deferred);
            }, function () {
                refreshSession(reject, deferred)
            });

            return deferred.promise;
        };

        var retry = function (config, deferred) {

            var request = {
                method: config.method,
                url: config.url
            };
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

        var refreshSession = function (reject, deferred) {
            //Clear cookies.
            $cookies.PHPSESSID = '';

            //Clear current header.
            var $http = $injector.get('$http');
            $http.defaults.headers.common['X-DreamFactory-Session-Token'] = '';

            //Clear current user.
            var UserDataService = $injector.get('UserDataService');
            UserDataService.unsetCurrentUser();

            var UserEventsService = $injector.get('UserEventsService');
            var deferred = deferred || $injector.get('$q').defer();

            $rootScope.$$childHead.openLoginWindow(reject);
            $rootScope.$on('user:login:success', function () {
                retry(reject.config, deferred);
            });

            return deferred.promise
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


                // If we get an error from any of the
                // login / register pages, ignore it.
                // No need to pop up a login.
                switch ($location.path()) {

                    case '/login':
                    case '/user-invite':
                    case '/admin-invite':
                    case '/register-confirm':
                    case '/register':
                    case '/register-complete':
                        break;

                    default:
                        if (reject.status !== 401) break;
                        if (reject.config.ignore401) break;

                        if ((reject.status === 401 || reject.data.error.code === 401)  && reject.config.url.indexOf('/session') === -1) {
                            if (reject.data.error.message === 'Token has expired' || reject.config.url.indexOf('/profile') !== -1) {
                                //  put session
                                return putSession(reject);
                            }
                            else {
                                // refresh session
                                return refreshSession(reject);
                            }
                        }
                }


                return $q.reject(reject);
            }
        }
    }])

    // paginates tables
    .directive('dfPaginateTable', ['MOD_UTILITY_ASSET_PATH', 'INSTANCE_URL', '$http', 'dfApplicationData', 'dfNotify',
        function (MOD_UTILITY_ASSET_PATH, INSTANCE_URL, $http, dfApplicationData, dfNotify) {

            return {

                restrict: 'E',
                scope: {
                    api: '=',
                    linkedData: '=',
                    prepFunc: '&'
                },
                templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-paginate-table.html',
                link: function (scope, elem, attrs) {


                    scope.totalCount = dfApplicationData.getApiRecordCount(scope.api);
                    scope.pagesArr = [];
                    scope.currentPage = {};
                    scope.isInProgress = false;


                    // PUBLIC API
                    scope.getPrevious = function () {

                        if (scope._isFirstPage() || scope.isInProgress) {
                            return false;
                        } else {

                            scope._getPrevious();

                        }
                    };

                    scope.getNext = function () {

                        if (scope._isLastPage() || scope.isInProgress) {
                            return false;
                        } else {

                            scope._getNext();

                        }
                    };

                    scope.getPage = function (pageObj) {

                        scope._getPage(pageObj);
                    };


                    // PRIVATE API


                    // Data
                    scope._getDataFromServer = function (offset) {

                        return dfApplicationData.getDataSetFromServer(scope.api, {
                            params: {
                                offset: offset
                            }
                        }).$promise
                    };

                    // Pagination
                    scope._calcTotalPages = function (totalCount, numPerPage) {

                        return Math.ceil(totalCount / numPerPage);
                    };

                    scope._createPageObj = function (_pageNum) {

                        return {
                            number: _pageNum + 1,
                            value: _pageNum,
                            offset: _pageNum * _getApiPrefs().data[scope.api].limit,
                            stopPropagation: false
                        }
                    };

                    scope._createPagesArr = function (_totalCount) {


                        scope.pagesArr = [];

                        for (var i = 0; i < _totalCount; i++) {

                            scope.pagesArr.push(scope._createPageObj(i));
                        }
                    };

                    scope._setCurrentPage = function (pageDataObj) {

                        scope.currentPage = pageDataObj;
                    };

                    scope._getCurrentPage = function () {

                        if (!scope.currentPage && scope.pagesArr.length > 0) {
                            scope.currentPage = scope.pagesArr[0];
                        } else if (!scope.currentPage && !scope.pagesArr.length) {

                            scope.pagesArr.push(scope._createPageObj(0));
                            scope.currentPage = scope.pagesArr[0];
                        }

                        return scope.currentPage;
                    };

                    scope._isFirstPage = function () {

                        return scope._getCurrentPage().value === 0;
                    };

                    scope._isLastPage = function () {

                        return scope.currentPage.value === scope.pagesArr.length - 1
                    };

                    scope._previousPage = function () {

                        scope.currentPage = scope.pagesArr[scope.currentPage.value - 1]
                    };

                    scope._nextPage = function () {

                        scope.currentPage = scope.pagesArr[scope.currentPage.value + 1]
                    };

                    scope._calcPagination = function (newValue) {

                        scope.pagesArr = [];

                        if (scope.totalCount == 0) {
                            scope.pagesArr.push(scope._createPageObj(0));
                            return false;
                        }

                        scope._createPagesArr(scope._calcTotalPages(scope.totalCount, _getApiPrefs().data[newValue].limit));
                    };


                    // COMPLEX IMPLEMENTATION
                    scope._getPrevious = function () {

                        if (scope.isInProgress) return false;

                        scope.isInProgress = true;

                        var offset = scope.pagesArr[scope.currentPage.value - 1].offset

                        scope._getDataFromServer(offset).then(
                            function (result) {

                                scope.linkedData = scope.prepFunc({dataArr: result.resource});
                                scope._previousPage();
                            },

                            function (reject) {

                                var messageOptions = {
                                    module: 'DreamFactory Paginate Table',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    message: reject
                                };

                                dfNotify.error(messageOptions);
                            }
                        ).finally(
                            function () {

                                scope.isInProgress = false;
                            }
                        )
                    };

                    scope._getNext = function () {

                        if (scope.isInProgress) return false;

                        scope.isInProgress = true;

                        var offset = scope.pagesArr[scope.currentPage.value + 1].offset

                        scope._getDataFromServer(offset).then(
                            function (result) {
                                scope.linkedData = scope.prepFunc({dataArr: result.resource});
                                scope._nextPage();
                            },

                            function (reject) {

                                var messageOptions = {
                                    module: 'DreamFactory Paginate Table',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    message: reject
                                };

                                dfNotify.error(messageOptions);
                            }
                        ).finally(
                            function () {

                                scope.isInProgress = false;
                            }
                        )
                    };

                    scope._getPage = function (pageObj) {

                        if (scope.isInProgress) return false;

                        scope.isInProgress = true;

                        scope._getDataFromServer(pageObj.offset).then(
                            function (result) {

                                scope.linkedData = scope.prepFunc({dataArr: result.resource});
                                scope._setCurrentPage(pageObj);
                            },

                            function (reject) {

                                var messageOptions = {
                                    module: 'DreamFactory Paginate Table',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    message: reject
                                };

                                dfNotify.error(messageOptions);
                            }
                        ).finally(
                            function () {

                                scope.isInProgress = false;
                            }
                        )

                    };


                    // WATCHERS
                    var watchApi = scope.$watch('api', function (newValue, oldValue) {

                        if (!newValue) return false;
                        scope._calcPagination(newValue);
                        scope._setCurrentPage(scope.pagesArr[0]);
                    });


                    // MESSAGES
                    scope.$on('dfPaginate:reset:' + scope.api, function (e) {

                        if (scope.isInProgress) return false;

                        scope.isInProgress = true;

                        var offset = 0;

                        scope._getDataFromServer(offset).then(
                            function (result) {
                                scope.linkedData = scope.prepFunc({dataArr: result.resource});
                                scope._setCurrentPage(scope.pagesArr[0]);
                            },

                            function (reject) {

                                var messageOptions = {
                                    module: 'DreamFactory Paginate Table',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    message: reject
                                };

                                dfNotify.error(messageOptions);
                            }
                        ).finally(
                            function () {

                                scope.isInProgress = false;
                            }
                        )
                    })
                }
            }
        }]);