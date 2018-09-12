'use strict';

angular.module('dfTutorial', [])
    .constant('MOD_SERVICES_ROUTER_PATH', '/tutorials')
    .constant('MOD_SERVICES_ASSET_PATH', 'admin_components/adf-tutorial/')
    .config(['$routeProvider', 'MOD_SERVICES_ROUTER_PATH', 'MOD_SERVICES_ASSET_PATH',
        function ($routeProvider, MOD_SERVICES_ROUTER_PATH, MOD_SERVICES_ASSET_PATH) {
            $routeProvider
                .when(MOD_SERVICES_ROUTER_PATH, {
                    templateUrl: MOD_SERVICES_ASSET_PATH + 'tutorial.html',
                    controller: 'TutorialController',
                    resolve: {
                        checkUser: ['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }])

    .run([function () {

    }])

    .controller('TutorialController', ['ngIntroService', function (ngIntroService) {
        console.log(ngIntroService)
    }])