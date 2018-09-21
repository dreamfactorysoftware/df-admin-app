'use strict';

angular.module('dfTutorial', [])
    .constant('MOD_TUTORIALS_ROUTER_PATH', '/tutorials')
    .constant('MOD_TUTORIALS_ASSET_PATH', 'admin_components/adf-tutorial/')
    .config(['$routeProvider', 'MOD_TUTORIALS_ROUTER_PATH', 'MOD_TUTORIALS_ASSET_PATH',
        function ($routeProvider, MOD_TUTORIALS_ROUTER_PATH, MOD_TUTORIALS_ASSET_PATH) {
            $routeProvider
                .when(MOD_TUTORIALS_ROUTER_PATH, {
                    templateUrl: MOD_TUTORIALS_ASSET_PATH + 'views/main-tutorial.html',
                    controller: 'TutorialController',
                    resolve: {
                        checkUser: ['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }]);