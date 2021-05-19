'use strict';

angular.module('dfWizard', ['ngRoute', 'dfApplication', 'dfUtility', 'ngCookies'])
    // Constant is used to pass down the html path to our directive.
    .constant('MOD_WIZARD_ASSET_PATH', 'admin_components/adf-wizard/')

    .controller('WizardCtrl', ['$rootScope', '$scope', '$cookies','$location', '$q', 'dfApplicationData', 'dfNotify', function($rootScope, $scope, $cookies, $location, $q, dfApplicationData, dfNotify) {
            
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
        // To open the modal manually, we need to remove the wizard cookie, so ng-if in adf-home will pick up the change
        // and fire it up.
        $scope.removeCookie = function() {
            $cookies.remove("Wizard");
        }

        $scope.hasCookie = function() {
                
            if ($cookies.get('Wizard')) {
                return true;
            }

            return false;
        };

        init();
    }])

    .directive('dfWizardLoading', [function() {
        return {
            restrict: 'E',
            template: "<div class='col-lg-12' ng-if='dataLoading'><span style='display: block; width: 100%; text-align: center; color: #A0A0A0; font-size: 50px; margin-top: 100px'><i class='fa fa-refresh fa-spin'></i></div>"
        };
    }])

    .directive('dfWizardCreateService', ['$rootScope', 'MOD_WIZARD_ASSET_PATH', 'dfApplicationData', 'dfNotify', '$cookies', '$q', '$location', function($rootScope, MOD_WIZARD_ASSET_PATH, dfApplicationData, dfNotify, $cookies, $q, $location) {

        return {
            
            restrict: 'E',
            scope: false,
            templateUrl: MOD_WIZARD_ASSET_PATH + 'views/df-wizard-create-service.html',
            link: function (scope, ele, attrs) {
                
                // This will automatically open the modal, rather than a button toggling it. The 
                // ng-if in the view will make sure that this only fires if a cookie is not set, or
                // if the user clicks on the api wizard button.
                $('#wizardModal').modal('show');

                scope.createService = {};

                scope.submitted = false;

                var closeEditor = function() {
    
                    // Reset values of the form fields
                    scope.createService = {};
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

                var removeModal = function () {
                    // There is an issue with angular and bootstrap where the .modal-open class is not removed
                    // when jumping to a new page from inside the modal. As a result it prevents the newly loaded page
                    // from being scrollable. The below removes the class if it exists
                    var body = document.getElementsByTagName('body');
                    if (body[0].classList.contains('modal-open')) body[0].classList.remove('modal-open');
                    // Closes the modal, and also removes the darkened background (otherwise this will still
                    // show when the new page renders)
                    $('#wizardModal').modal('hide');
                    $('.modal-backdrop').remove();
                }

                scope.setCookie = function() {
                    $cookies.put("Wizard", "Created");
                    removeModal();
                }

                scope.goToDocs = function() {
                    // Apply a cookie so that the modal will not automatically open on going to /home 
                    // the next time around.
                    scope.setCookie();
                    // reset the api wizard back to the first page (form input)
                    scope.submitted = false;
                    $location.url('/apidocs');
                }
            }
        };
    }])
