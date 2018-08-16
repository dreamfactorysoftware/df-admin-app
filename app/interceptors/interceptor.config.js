'use strict';

angular
    .module('dreamfactoryApp')
    .config(['$httpProvider', function ($httpProvider) {

        $httpProvider.interceptors.push('httpValidSession');
        $httpProvider.interceptors.push('globalHeaders');
    }]);