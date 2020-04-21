'use strict';

angular
    .module('dreamfactoryApp')
    .constant('LICENSE_DATA_URL', 'https://updates.dreamfactory.com/check')
    .service('LicenseDataService', ['$http', '$location', '$q', 'SystemConfigDataService', 'LICENSE_DATA_URL', function ($http, $location, $q, SystemConfigDataService, LICENSE_DATA_URL) {

        this.licensesWithRequiredSubscription = ['GOLD', 'SILVER'];

        this.isLicenseRequiredSubscription = function (licence) {
            return this.licensesWithRequiredSubscription.indexOf(licence) !== -1;
        };

        this.getSubscriptionData = function () {

            var systemConfig = SystemConfigDataService.getSystemConfig();
            var licenseKey = systemConfig.platform.license_key;
            var awsInstanceId = systemConfig.platform.aws_instance_id;
            var awsProductCode = systemConfig.platform.aws_product_code;

            if (isLicenseKeyNotExist(licenseKey)) {
                if (awsInstanceId) {
                    return getAWSMarketplaceResponse(awsProductCode, awsInstanceId);
                }
                return getShowBannerResponse();
            } else {
                var headers = getHeadersForCheckingLicenseKey(licenseKey, awsInstanceId);
                return $http.get(LICENSE_DATA_URL, {headers: headers})
                    .then(function successCallback(response) {
                            return response.data;
                        },
                        function errorCallback(response) {
                            return response.data;
                        })
                    .then(function finallyCallback(data) {
                        return redirectToLicenseExpiredPageIfDisableUIEnabled(data);
                    });
            }

        };

        function getAWSMarketplaceResponse(awsProductCode, awsInstanceId) {
            var deferred = $q.defer();
            if (awsProductCode && awsProductCode.length === 25 && awsInstanceId.startsWith('i-')) {
                deferred.resolve({
                    'renewal_date': 'View in AWS Console',
                    message: '',
                    msg: 'Paid',
                    'status_code': 200,
                });
            } else {
                deferred.resolve({
                    'renewal_date': '',
                    message: 'License key is invalid.',
                    'status_code': 401,
                });
            }
            return deferred.promise;
        }

        function isLicenseKeyNotExist(licenseKey) {
            return licenseKey == '' || licenseKey == undefined
        }

        function redirectToLicenseExpiredPageIfDisableUIEnabled(data) {
            if (JSON.parse(data.disable_ui)) {
                $location.url('/license-expired');
            }
            return data;
        }

        function getShowBannerResponse() {
            var deferred = $q.defer();
            deferred.resolve({renewal_date: "", message: "License key is invalid.", status_code: 401});
            return deferred.promise;
        }

        function getHeadersForCheckingLicenseKey(licenseKey, awsInstanceId) {
            return {
                'Content-Type': 'application/json',
                'X-DreamFactory-License-Key': licenseKey,
                'X-DreamFactory-API-Key': undefined,
                'X-DreamFactory-Session-Token': undefined,
                'X-DreamFactory-Instance-Id': awsInstanceId || undefined
            };
        }
    }]);



