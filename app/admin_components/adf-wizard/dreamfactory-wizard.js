'use strict';

angular.module('dfWizard', ['ngRoute', 'dfApplication', 'dfUtility', 'ngCookies'])
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

    .controller('WizardCtrl', ['$rootScope', '$scope', '$cookies', '$q', '$location', 'dfApplicationData', 'dfNotify',
        function($rootScope, $scope, $cookies, $location, $q, dfApplicationData, dfNotify) {
            
            // In order to save a new service, dfApplicationObj which is in the dfApplicationData service, needs to 
            // contain a "service" property. This function will fire when the view is initialized and populate the object. so that
            // the saveAPIData function below can fire properly.
            var init = function() {
                var apis = ['service'];

                dfApplicationData.getApiData(apis).then(
                    function (response) {
                        // TODO, perhaps some kind of functionality to only show the form once this stuff has loaded first
                        // Perhaps a little spinny wheel thing
                        console.log("finished loading");
                    },
                    function (error) {
                        var msg = 'There was an error loading the required data for the wizard to function. Please try logging out and back in';
                        if (error && error.error && (error.error.code === 401 || error.error.code === 403)) {
                            msg = 'To use the Wizard your role must allow GET access to system/service and system/service_type. To create, update, or delete services you need POST, PUT, DELETE access to /system/service and/or /system/service/*.';
                            $location.url('/home');
                        }
                        var messageOptions = {
                            module: 'Services',
                            provider: 'dreamfactory',
                            type: 'error',
                            message: msg
                        };
                        dfNotify.error(messageOptions);
                    }
                );
                // TODO: Here we can probably chain a .finally function that will get rid of some kind of spinny loady icon thing.
            }

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
              $cookies.put("Wizard", "Created");
              // Reset the Application Data in dreamfactory-application.js to an empty object
              dfApplicationData.resetApplicationObj();
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
                );
            }

            $scope.removeCookie = function() {
                $cookies.remove("Wizard");
            }

            init();
    }])
