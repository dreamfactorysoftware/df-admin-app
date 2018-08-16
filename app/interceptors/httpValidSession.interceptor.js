'use strict';
angular.module('dfApplication')
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
                                if (reject.status === 401 || (reject.data && reject.data.error && reject.data.error.code === 401) ||
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
