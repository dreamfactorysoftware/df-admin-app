'use strict';

angular.module('dfETL', ['ngRoute'])
    .constant('MOD_PACKAGE_MANAGER_ROUTER_PATH', '/etl')
    .constant('MOD_PACKAGE_MANAGER_ASSET_PATH', 'admin_components/adf-etl/')
    .config(['$routeProvider', 'MOD_PACKAGE_MANAGER_ROUTER_PATH', 'MOD_PACKAGE_MANAGER_ASSET_PATH',
        function ($routeProvider, MOD_PACKAGE_MANAGER_ROUTER_PATH, MOD_PACKAGE_MANAGER_ASSET_PATH) {
            $routeProvider
                .when(MOD_PACKAGE_MANAGER_ROUTER_PATH, {
                    templateUrl: MOD_PACKAGE_MANAGER_ASSET_PATH + 'views/main.html',
                    controller: 'ETLCtrl',
                });
        }])

    .run([function () {

    }])

    .controller('ETLCtrl', ['UserDataService', '$http', function (UserDataService, $http) {

        // When the user comes to this page, we will make an api call to updates.dreamfactory.com
        // with their email address. This is only for the hosted environment.

        var data = {
            email: UserDataService.getCurrentUser().email,
        };

        var req = {
          method: 'POST',
          url: 'https://updates.dreamfactory.com/api/etl',
          data: JSON.stringify(data)
        };

        $http(req).then();
    }])
