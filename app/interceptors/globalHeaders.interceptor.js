'use strict';
angular.module('dfApplication')
    .factory('globalHeaders', ['$injector', function ($injector) {

        var isHTMLRequested = function (url) {
            return url.indexOf('.html') > -1;
        };
        return {
            request: function (config) {

                if (!isHTMLRequested(config.url)) {
                    var SystemConfigDataService = $injector.get('SystemConfigDataService');
                    var systemConfig = SystemConfigDataService.getSystemConfig();
                    if (systemConfig && systemConfig.platform) {
                        config.headers['X-Dreamfactory-API-Key'] = systemConfig.platform.api_key
                    }
                }
                return config;
            }
        };
    }]);
