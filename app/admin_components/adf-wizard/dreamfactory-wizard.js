'use strict';

angular.module('dfWizard', ['ngRoute', 'dfApplication', 'dfUtility', 'ngCookies'])
    // Constant is used to pass down the html path to our directive.
    .constant('MOD_WIZARD_ASSET_PATH', 'admin_components/adf-wizard/')

    .controller('WizardCtrl', ['$rootScope', '$scope', '$cookies', '$location', '$q', 'dfApplicationData', 'dfNotify', function ($rootScope, $scope, $cookies, $location, $q, dfApplicationData, dfNotify) {

        $scope.hasWizardCookie = function () {

            if ($cookies.get('Wizard')) {
                return true;
            }

            return false;
        };

        // There is a peculiar edgecase bug where if the user manually deletes the cookie
        // while on the "Home" page, moving to another tab or logging out will create a
        // a dark backdrop and lock the screen. The below will remove these backdrops when moving
        // away from Home.
        $scope.$on('$locationChangeStart', function () {
            var body = document.getElementsByTagName('body');
            if (body[0].classList.contains('modal-open')) body[0].classList.remove('modal-open');
            $('#wizardModal').modal('hide');
            $('.modal-backdrop').remove();
        });
    }])

    .directive('dfWizardLoading', [function () {
        return {
            restrict: 'E',
            template: "<div class='col-lg-12' ng-if='dataLoading'><span style='display: block; width: 100%; text-align: center; color: #A0A0A0; font-size: 50px; margin-top: 100px'><i class='fa fa-refresh fa-spin'></i></div>"
        };
    }])

    .directive('dfWizardCreateService', ['$rootScope', 'MOD_WIZARD_ASSET_PATH', 'dfApplicationData', 'dfNotify', '$cookies', '$q', '$http', 'INSTANCE_URL', '$location', function ($rootScope, MOD_WIZARD_ASSET_PATH, dfApplicationData, dfNotify, $cookies, $q, $http, INSTANCE_URL, $location) {

        return {

            restrict: 'E',
            scope: false,
            templateUrl: MOD_WIZARD_ASSET_PATH + 'views/df-wizard-create-service.html',
            link: function (scope, ele, attrs) {

                // This will automatically open the modal, rather than a button toggling it. The 
                // ng-if in the view will make sure that this only fires if a cookie is not set, or
                // if the user clicks on the api wizard button.
                $('#wizardModal').modal('show');

                scope.wizardData = {};

                scope.submitted = false;

                var closeEditor = function () {

                    // Reset values of the form fields
                    scope.wizardData = {};
                    // hide the form
                    scope.submitted = true;

                    $('.modal-wizard').removeClass('modal-wizard');

                    // force to manage view
                    scope.$emit('sidebar-nav:view:reset');
                }

                scope.saveService = function () {
                    var data = {
                        'id': null,
                        'name': scope.wizardData.namespace,
                        'label': scope.wizardData.label,
                        'description': scope.wizardData.description,
                        'is_active': true,
                        'type': 'mysql',
                        'service_doc_by_service_id': null,
                        'config': {
                            'database': scope.wizardData.database,
                            'host': scope.wizardData.host,
                            'username': scope.wizardData.username,
                            'max_records': 1000,
                            'password': scope.wizardData.password
                        }
                    }

                    var requestDataObj = {

                        params: {
                            fields: '*',
                            related: 'service_doc_by_service_id'
                        },
                        data: {'resource': [data]}
                    };
                    scope.dataLoading = true;

                    $http({
                        method: 'POST',
                        url: INSTANCE_URL.url + '/system/service',
                        params: requestDataObj.params,
                        data: requestDataObj.data
                    }).then(
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
                            scope.dataLoading = false;
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

                scope.setWizardCookie = function () {
                    $cookies.put('Wizard', 'Created');
                    removeModal();
                }

                scope.goToApiDocs = function () {
                    // Apply a cookie so that the modal will not automatically open on going to /home 
                    // the next time around.
                    scope.setWizardCookie();
                    // reset the api wizard back to the first page (form input)
                    scope.submitted = false;
                    $location.url('/apidocs');
                }
            }
        };
    }])
