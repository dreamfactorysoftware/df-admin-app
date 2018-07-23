'use strict';

angular
    .module('dreamfactoryApp')
    .constant('LICENSE_DATA_URL', 'http://updates.dreamfactory.com/check')
    .service('LicenseDataService', ['LICENSE_DATA_URL', '$http', 'SystemConfigDataService', function (LICENSE_DATA_URL, $http, SystemConfigDataService) {

        this.licensesWithRequiredSubscription = ['GOLD', 'SILVER'];

        this.isLicenseRequiredSubscription = function (licence) {
            return this.licensesWithRequiredSubscription.indexOf(licence) !== -1;
        };

        this.getSubscriptionData = function () {

            var systemConfig = SystemConfigDataService.getSystemConfig();

            var headerDict = {
                'Content-Type': 'application/json',
                'X-DreamFactory-License-Key': systemConfig.platform.license_key,
                'X-DreamFactory-API-Key': undefined,
                'X-DreamFactory-Session-Token': undefined
            };

            return $http.get(LICENSE_DATA_URL, {headers: headerDict})
                .then(function successCallback(response) {
                    return response.data;
                }, function errorCallback(response) {
                    return response.data;
                });
        }


    }])
;


