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
                        checkAppObj:['dfApplicationData', function (dfApplicationData) {

                            if (dfApplicationData.initInProgress) {

                                return dfApplicationData.initDeferred.promise;
                            }
                        }],

                        checkCurrentUser: ['UserDataService', '$location', '$q', function (UserDataService, $location, $q) {

                            var currentUser = UserDataService.getCurrentUser(),
                                defer = $q.defer();

                            // If there is no currentUser and we don't allow guest users
                            if (!currentUser) {

                                $location.url('/login');

                                // This will stop the route from loading anything
                                // it's caught by the global error handler in
                                // app.js
                                throw {
                                    routing: true
                                }
                            }

                            // There is a currentUser but they are not an admin
                            else if (currentUser && !currentUser.is_sys_admin) {

                                $location.url('/launchpad');

                                // This will stop the route from loading anything
                                // it's caught by the global error handler in
                                // app.js
                                throw {
                                    routing: true
                                }
                            }

                            defer.resolve();
                            return defer.promise;
                        }]
                    }
                });
        }])
    .run(['INSTANCE_URL', '$templateCache', function (INSTANCE_URL, $templateCache) {


    }])
    .controller('FileCtrl', ['$scope', 'INSTANCE_URL', 'dfApplicationData', function($scope, INSTANCE_URL, dfApplicationData) {



        $scope.$parent.title = 'Files';

        // Set module links
        $scope.links = [

            {
                name: 'manage-files',
                label: 'Manage',
                path: 'manage-files'
            }
        ];
    }])

    .directive('dfFileManager', ['MOD_FILE_MANAGER_ASSET_PATH', 'INSTANCE_URL', function(MOD_FILE_MANAGER_ASSET_PATH, INSTANCE_URL) {


        return {

            restrict: 'E',
            scope: false,
            templateUrl: MOD_FILE_MANAGER_ASSET_PATH + 'views/df-file-manager.html',
            link: function (scope, elem, attrs) {

                $( "#root-file-manager iframe" ).attr( "src", INSTANCE_URL + '/filemanager/?path=/&allowroot=true').show();

                scope.$broadcast('filemanager:loaded');


            }
        }
    }]);
