'use strict';
angular.module('dfApplication')
// Intercepts outgoing http calls.  Checks for valid session.  If 401 will trigger a pop up login screen.
    .factory('globalHeaders', ['$injector', function ($injector) {

        return {
            request: function (config) {

                if (config.url.indexOf('.html') == -1) {
                    var SystemConfigDataService = $injector.get('SystemConfigDataService');
                    if (SystemConfigDataService) {
                        var systemConfig = SystemConfigDataService.getSystemConfig();
                        if (systemConfig && systemConfig.platform) {
                            var key = systemConfig.platform.api_key;
                            config.headers['X-Dreamfactory-API-Key'] = key
                        }
                    }
                }
                return config;
            }
        };
    }]);
