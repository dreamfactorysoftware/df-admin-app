'use strict';

angular
    .module('dreamfactoryApp')
    .config(['$httpProvider', function ($httpProvider) {

        $httpProvider.defaults.headers.delete = {'Content-Type': 'application/json;charset=utf-8'};

        $httpProvider.interceptors.push('httpValidSession');
        $httpProvider.interceptors.push('globalHeaders');
    }]);