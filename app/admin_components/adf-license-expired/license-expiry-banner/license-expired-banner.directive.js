'use strict';

angular.module('dfLicenseExpiredBanner', ['dfApplication'])
    .directive('dfLicenseExpiredBanner', ['SystemConfigDataService', 'LicenseDataService', function (SystemConfigDataService, LicenseDataService) {

        return {
            restrict: 'E',
            templateUrl: 'admin_components/adf-license-expired/license-expiry-banner/license-expiry-banner.html',
            link: function (scope) {

                scope.subscriptionData = {};

                scope.hasLicenseExpired = function () {
                    return scope.subscriptionData.status_code == 401;
                };

                scope.$watch(
                    function () {
                        return SystemConfigDataService.getSystemConfig().platform
                    }, function (platform) {
                        updateSubscriptionData(platform);
                    });

                function updateSubscriptionData(platform) {
                    if (platform && platform.hasOwnProperty('license') && LicenseDataService.isLicenseRequiredSubscription(platform.license)) {
                        LicenseDataService.getSubscriptionData()
                            .then(function (data) {
                                scope.subscriptionData = data;
                            });
                    } else {
                        scope.subscriptionData = {};
                    }

                }

            }
        };
    }]);

