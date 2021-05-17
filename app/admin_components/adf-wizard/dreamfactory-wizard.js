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

    .controller('WizardCtrl', ['$rootScope', '$scope', '$cookies', '$q', '$location', 'dfApplicationData', 'dfNotify', function($rootScope, $scope, $cookies, $location, $q, dfApplicationData, dfNotify) {
            
        // In order to save a new service, dfApplicationObj which is in the dfApplicationData service, needs to 
        // contain a "service" property. This function will fire when the view is initialized and populate the object. so that
        // the saveAPIData function below can fire properly.
        
        var init = function() {
            // Makes the loading icon run, and prevents the form from loading in until it is finished. 
            $scope.dataLoading = true;

            var apis = ['service'];

            dfApplicationData.getApiData(apis).then(
                function (response) {
                    // We need this function even if it doesnt do anything so angularjs loads everything in properly.
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
            ).finally(function () {
                // remove loading icon
                $scope.dataLoading = false;
            });
        };

        $scope.removeCookie = function() {
            $cookies.remove("Wizard");
        }

        init();
    }])

    .directive('dfWizardLoading', [function() {
        return {
            restrict: 'E',
            template: "<div class='col-lg-12' ng-if='dataLoading'><span style='display: block; width: 100%; text-align: center; color: #A0A0A0; font-size: 50px; margin-top: 100px'><i class='fa fa-refresh fa-spin'></i></div>"
        };
    }])

    .directive('dfWizardCreateService', ['$rootScope', 'MOD_WIZARD_ASSET_PATH', 'dfApplicationData', 'dfNotify', '$cookies', '$q', function($rootScope, MOD_WIZARD_ASSET_PATH, dfApplicationData, dfNotify, $cookies, $q) {

        return {
            
            restrict: 'E',
            scope: false,
            templateUrl: MOD_WIZARD_ASSET_PATH + 'views/df-wizard-create-service.html',
            link: function (scope, ele, attrs) {
                
                scope.createService = {};

                scope.submitted = false;

                var closeEditor = function() {
    
                    // Reset values of the form fields
                    scope.createService = {};
        
                    console.log("API Saved!");
                    // We will use a cookie so that after login the router will know whether to go the wizard, or to the home page.
                    $cookies.put("Wizard", "Created");
                    // Reset the Application Data in dreamfactory-application.js to an empty object
                    dfApplicationData.resetApplicationObj();
                    // hide the form
                    scope.submitted = true;
                }

                scope.saveService = function(){         
                    
                    var data = {
                        "id": null,
                        "name": scope.createService.namespace,
                        "label": scope.createService.label,
                        "description": scope.createService.description,
                        "is_active": true,
                        "type": "mysql",
                        "service_doc_by_service_id": null,
                        "config": {
                            "database": scope.createService.database,
                            "host": scope.createService.host,
                            "username": scope.createService.username,
                            "max_records": 1000,
                            "password": scope.createService.password
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
            }
        };
    }])
