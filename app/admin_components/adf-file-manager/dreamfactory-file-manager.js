angular.module('dfFileManager', ['ngRoute', 'dfUtility'])
    .constant('MOD_FILE_MANAGER_ROUTER_PATH', '/file-manager')
    .constant('MOD_FILE_MANAGER_ASSET_PATH', 'admin_components/adf-file-manager/')
    .config(['$routeProvider', 'MOD_FILE_MANAGER_ROUTER_PATH', 'MOD_FILE_MANAGER_ASSET_PATH',
        function ($routeProvider, MOD_FILE_MANAGER_ROUTER_PATH, MOD_FILE_MANAGER_ASSET_PATH) {
            $routeProvider
                .when(MOD_FILE_MANAGER_ROUTER_PATH, {
                    templateUrl: MOD_FILE_MANAGER_ASSET_PATH + 'views/main.html',
                    controller: 'FileCtrl',
                    resolve: {
                        checkUser:['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }])

    .run([function () {

    }])

    .controller('FileCtrl', ['$scope', function($scope) {

        $scope.$parent.title = 'Files';
        $scope.$parent.titleIcon = 'file-o';

        // Set module links
        $scope.links = [

            {
                name: 'manage-files',
                label: 'Manage',
                path: 'manage-files'
            }
        ];
    }])

    .directive('dfFileManager', ['MOD_FILE_MANAGER_ASSET_PATH', 'INSTANCE_BASE_URL', function(MOD_FILE_MANAGER_ASSET_PATH, INSTANCE_BASE_URL) {

        return {

            restrict: 'E',
            scope: false,
            templateUrl: MOD_FILE_MANAGER_ASSET_PATH + 'views/df-file-manager.html',
            link: function (scope, elem, attrs) {

                $( "#root-file-manager iframe" ).attr( "src", INSTANCE_BASE_URL + '/filemanager/index.html?path=/&allowroot=true').show();

                scope.$broadcast('filemanager:loaded');
            }
        };
    }]);
