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

    .directive('dfWizardCreateService', ['$rootScope', 'MOD_WIZARD_ASSET_PATH', 'dfApplicationData', 'dfNotify', '$cookies', '$q', '$http', 'INSTANCE_URL', '$location', 'UserDataService', function ($rootScope, MOD_WIZARD_ASSET_PATH, dfApplicationData, dfNotify, $cookies, $q, $http, INSTANCE_URL, $location, UserDataService) {

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
                scope.dataLoading = false;
                scope.namespaceDone = false;
                scope.apiCreated = false;
                scope.permissionsCreated = false;
                scope.serviceId = null;
                scope.apiKey = '';
                scope.serviceTypes = ['MySQL', 'SQL Server'];
                // Used for creating example curl request.
                scope.baseUrl = $location.protocol() + '://' + $location.host() + '/api/v2/';

                var closeEditor = function () {

                    // hide the form
                    scope.apiCreated = true;

                    $('.modal-wizard').removeClass('modal-wizard');

                    // force to manage view
                    scope.$emit('sidebar-nav:view:reset');
                }

                var sendWizardProgressStatus = function (message) {
                    var data = {
                        email: UserDataService.getCurrentUser().email,
                        message: UserDataService.getCurrentUser().name + message,
                    };

                    var req = {
                        method: 'POST',
                        url: 'https://dashboard.dreamfactory.com/api/wizard',
                        data: JSON.stringify(data)
                    };

                    $http(req).then();
                }

                scope.saveService = function () {

                    var data = {
                        'id': null,
                        'name': scope.wizardData.namespace,
                        'label': scope.wizardData.label,
                        'description': scope.wizardData.description,
                        'is_active': true,
                        //there's only two types at the moment for the wizard, but the below should let it grow a bit easier in future.
                        'type': (scope.wizardData.type === 'SQL Server' ? 'sqlsrv' : scope.wizardData.type.toLowerCase()),
                        'service_doc_by_service_id': null,
                        'config': {
                            'database': scope.wizardData.database,
                            'host': scope.wizardData.host,
                            'username': scope.wizardData.username,
                            'max_records': 1000,
                            'password': scope.wizardData.password,
                            'schema': scope.wizardData.schema
                        }
                    }

                    var requestDataObj = {

                        params: {
                            fields: '*',
                            related: 'service_doc_by_service_id'
                        },
                        data: data
                    };
                    scope.dataLoading = true;

                    dfApplicationData.saveApiData('service', requestDataObj, true).$promise.then(
                        function (result) {

                            var messageOptions = {
                                module: 'Services',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Service saved successfully.'
                            };

                            // We need the id the service is assigned to so we can create a role if the user wishes to do so.
                            // Result returns an array of length 1, we need the id from it.
                            scope.serviceId = result.resource[0].id;
                            dfNotify.success(messageOptions);
                            sendWizardProgressStatus(' created a ' + scope.wizardData.type + ' service!');
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

                /*
                requestor_mask: 1 -> API
                requestor_mask: 2 -> Script
                requestor_mask: 3 -> API, Script
                */

                /*
                verb_mask: 1 -> GET
                verb_mask: 2 -> POST
                verb_mask: 4 -> PUT
                verb_mask: 8 -> PATCH
                verb_mask: 16 -> DELETE
                Add these together for the permission value you want. Eg GET + POST = 3, ALL = 31 
                */

                scope.createReadOnlyPermissions = function () {
                    // Build our data to send to the backend to create a role:
                    var roleDescription = scope.wizardData.namespace + ' read only';
                    var data = {
                        default_app_id: null,
                        description: roleDescription,
                        id: null,
                        is_active: true,
                        lookup_by_role_id: [],
                        name: scope.wizardData.namespace,
                        role_service_access_by_role_id: [{
                            component: '*',
                            filter_op: 'AND',
                            filters: [],
                            requestor_mask: 1,
                            service_id: scope.serviceId,
                            verb_mask: 1
                        }]
                    };

                    var requestDataObj = {
                        params: {
                            api: 'role',
                            fields: '*',
                            related: 'role_service_access_by_role_id,lookup_by_role_id'
                        },
                        data: data
                    };

                    // Create the Role with access of GET, all components and active, followed by creating an
                    // app to generate the api key.
                    scope.dataLoading = true;
                    $('.modal-wizard').removeClass('modal-wizard');

                    // First create the role. This gets a little bit chainy / callback helly, but not too bad. We will
                    // defer the promise so that a rejection will break the promise, until the very end.
                    dfApplicationData.saveApiData('role', requestDataObj, true).$promise.then(
                        function (result) {

                            // if successful, generate the api key
                            var roleId = result.resource[0].id;
                            var appDescription = scope.wizardData.namespace + ' read only';
                            var data = {
                                description: appDescription,
                                is_active: true,
                                name: scope.wizardData.namespace,
                                role_id: roleId,
                                type: 0
                            };
                            var requestDataObj = {
                                params: {
                                    api: 'app',
                                    fields: '*',
                                    related: 'role_by_role_id'
                                },
                                data: data
                            };

                            return dfApplicationData.saveApiData('app', requestDataObj, true).$promise;
                        }).then(
                        function (result) {

                            // Everything's come back great, so get that api key, and pass it to the view to present a
                            // curl example to the user.
                            scope.apiKey = result.resource[0].api_key;

                            var messageOptions = {
                                module: 'Wizard',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'API saved successfully.'
                            };

                            dfNotify.success(messageOptions);
                            sendWizardProgressStatus(' created a role and app for their ' + scope.wizardData.type + ' service!');
                            scope.permissionsCreated = true;
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

                scope.closeWizard = function () {
                    // Reset values of the form fields
                    scope.wizardData = {};
                    // reset the api wizard back to the first page (form input)
                    scope.apiCreated = false;
                    scope.permissionsCreated = false;
                    scope.namespaceDone = false;
                    // Apply a cookie so that the modal will not automatically open on going to /home
                    // the next time around.
                    scope.setWizardCookie();
                }

                scope.pageLink = function (link) {
                    sendWizardProgressStatus(' completed the wizard and went to ' + link);
                    scope.closeWizard();
                    $location.url(link);
                }
            }
        };
    }])
