'use strict';

angular.module('dfLicense', ['dfApplication'])
    .directive('dfLicenseExpiryNotification', ['SystemConfigDataService', 'LicenseDataService', function (SystemConfigDataService, LicenseDataService) {

        return {
            restrict: 'E',
            templateUrl: 'admin_components/adf-utility/license-expiry-notification/license-expiry-notification.html',
            link: function (scope) {

                scope.subscriptionData = {};

                scope.licenseHasExpired = function () {
                    return scope.subscriptionData.status_code == 401;
                };

                scope.$watch(
                    function () {
                        return SystemConfigDataService.getSystemConfig().platform
                    }, function (platform) {

                        if (platform && platform.hasOwnProperty('license') && LicenseDataService.isLicenseRequiredSubscription(platform.license)) {
                            LicenseDataService.getSubscriptionData()
                                .then(function (data) {
                                    scope.subscriptionData = data;
                                });
                        } else {
                            scope.subscriptionData = {};
                        }

                    });

            }
        };
    }])

