'use strict';

angular.module('dfLicenseExpired', ['ngRoute'])
    .config(['$routeProvider', setLicenseExpiredRoute]);

function setLicenseExpiredRoute($routeProvider) {
    $routeProvider
        .when('/license-expired', {
            templateUrl: 'admin_components/adf-license-expired/license-expired.html'
        });
}