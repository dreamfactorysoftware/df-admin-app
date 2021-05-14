'use strict';

angular.module('dfWizard', ['ngRoute', 'dfApplication', 'dfUtility'])
    .constant('MOD_WIZARD_ROUTER_PATH', '/wizard')
    .constant('MOD_WIZARD_ASSET_PATH', 'admin_components/adf-wizard/')
    .config(['$routeProvider', 'MOD_WIZARD_ROUTER_PATH', 'MOD_WIZARD_ASSET_PATH',
        function ($routeProvider, MOD_WIZARD_ROUTER_PATH, MOD_WIZARD_ASSET_PATH) {
            $routeProvider
                .when(MOD_WIZARD_ROUTER_PATH, {
                    templateUrl: MOD_WIZARD_ASSET_PATH + 'views/main.html',
                    controller: 'WizardCtrl',
                    resolve: {
                        checkAdmin:['checkAdminService', function (checkAdminService) {
                            return checkAdminService.checkAdmin();
                        }],
                        checkUser:['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }])

    .run([function () {

    }])

    .controller('WizardCtrl', ['$rootScope', '$scope', '$q', '$location', 'dfApplicationData', 'dfNotify',
        function($rootScope, $scope, $location, $q, dfApplicationData, dfNotify) {

            var closeEditor = function() {

              // Reset values of the form fields
              $scope.namespace = '';
              $scope.label = '';
              $scope.description = '';
              $scope.database = '';
              $scope.host = '';
              $scope.username = '';
              $scope.password = '';

              console.log("API Saved!");
            }


            $scope.saveService = function(){

                var data = {
                    "id": null,
                    "name": $scope.namespace,
                    "label": $scope.label,
                    "description": $scope.description,
                    "is_active": true,
                    "type": "mysql",
                    "service_doc_by_service_id": null,
                    "config": {
                        "database": $scope.database,
                        "host": $scope.host,
                        "username": $scope.username,
                        "max_records": 1000,
                        "password": $scope.password
                    }
                }

                var requestDataObj = {
                    params: {
                        fields: '*',
                        related: 'service_doc_by_service_id'
                    },
                    data: data
                };

                dfApplicationData.saveApiData('service', requestDataObj).$promise.then(

                    function (result) {

                        var messageOptions = {
                            module: 'Services',
                            type: 'success',
                            provider: 'dreamfactory',
                            message: 'Service saved successfully.'
                        };

                        dfNotify.success(messageOptions);

                        closeEditor();
                    },

                    function (reject) {

                        var messageOptions = {
                            module: 'Api Error',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: reject
                        };

                        dfNotify.error(messageOptions);
                    }
                ).finally(
                    function () {

                    }
                );
            }
    }])
