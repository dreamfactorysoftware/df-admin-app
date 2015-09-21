/**
 * This file is part of DreamFactory (tm)
 *
 * http://github.com/dreamfactorysoftware/dreamfactory
 * Copyright 2012-2014 DreamFactory Software, Inc. <support@dreamfactory.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('dfSystemConfig', ['ngRoute', 'dfUtility', 'dfApplication'])

    .constant('MODSYSCONFIG_ROUTER_PATH', '/config')

    .constant('MODSYSCONFIG_ASSET_PATH', 'admin_components/adf-system-config/')

    .config(['$routeProvider', 'MODSYSCONFIG_ROUTER_PATH', 'MODSYSCONFIG_ASSET_PATH',
        function ($routeProvider, MODSYSCONFIG_ROUTER_PATH, MODSYSCONFIG_ASSET_PATH) {
            $routeProvider
                .when(MODSYSCONFIG_ROUTER_PATH, {
                    templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/main.html',
                    controller: 'SystemConfigurationCtrl',
                    resolve: {
                        checkAppObj: ['dfApplicationData', function (dfApplicationData) {

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

    .run(['SystemConfigDataService', function (SystemConfigDataService) {

    }])

    .controller('SystemConfigurationCtrl', ['$scope', 'dfApplicationData', 'SystemConfigEventsService', 'SystemConfigDataService', 'dfObjectService', 'dfNotify', 'INSTANCE_URL', '$http',
        function ($scope, dfApplicationData, SystemConfigEventsService, SystemConfigDataService, dfObjectService, dfNotify, INSTANCE_URL, $http) {


            var SystemConfig = function (systemConfigData) {

                return {
                    record: angular.copy(systemConfigData),
                    recordCopy: angular.copy(systemConfigData)
                }
            };

            $scope.getCacheEnabledServices = function () {

                $scope.cacheEnabledServices = [];

                $http.get(INSTANCE_URL + '/api/v2/system/cache?fields=*').then(

                    function (result) {

                        $scope.cacheEnabledServices = result.data.resource;
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

            $scope.$parent.title = 'Config';


            // CREATE SHORT NAMES
            $scope.es = SystemConfigEventsService.systemConfigController;

            // PUBLIC API
            $scope.systemEnv = dfApplicationData.getApiData('environment');
            // Config will always be the first in the array so we grab the 0th value
            $scope.systemConfig = new SystemConfig(dfApplicationData.getApiData('config')[0]);
            $scope.getCacheEnabledServices();
            $scope.corsEntriesData = dfApplicationData.getApiData('cors');
            $scope.globalLookupsData = dfApplicationData.getApiData('lookup');
            $scope.emailTemplatesData = dfApplicationData.getApiData('email_template');


            $scope.links = [

                {
                    name: 'system-info',
                    label: 'System Info',
                    path: 'system-info',
                    active: true
                },
                {
                    name: 'cache',
                    label: 'Cache',
                    path: 'cache',
                    active: false
                },
                {
                    name: 'cors',
                    label: 'CORS',
                    path: 'cors',
                    active: false
                },
                {
                    name: 'email-templates',
                    label: 'Email Templates',
                    path: 'email-templates',
                    active: false
                },
                {
                    name: 'global-lookup-keys',
                    label: 'Global Lookup Keys',
                    path: 'global-lookup-keys',
                    active: false
                },
                {
                    name: 'edit-preferences',
                    label: 'Preferences',
                    path: 'edit-preferences'
                }
            ];


            // PUBLIC API
            $scope.updateConfig = function () {
                $scope._updateConfig()
            };

            // PRIVATE API
            $scope._updateConfigData = function (requestDataObj) {

                return dfApplicationData.updateApiData('config', requestDataObj).$promise
            };

            $scope._updateSystemConfigService = function (systemConfigDataObj) {

                SystemConfigDataService.setSystemConfig(systemConfigDataObj);
            };

            $scope._prepareSystemConfigData = function () {

                $scope._prepareLookupKeyData();
            };


            // COMPLEX IMPLEMENTATION
            $scope._updateConfig = function () {

                $scope._prepareSystemConfigData();


                var requestDataObj = {
                    params: {
                        fields: '*'
                    },
                    data: $scope.systemConfig.record
                };

                $scope._updateConfigData(requestDataObj).then(
                    function (result) {

                        var systemConfigDataObj = result;

                        // We no longer store the system config in the SystemConfigDataService
                        // You can only get the config and then use as necessary.  The point
                        // being that you always have a fresh config in the event of a refresh.
                        // We used to store in a cookie for refresh.  Now we just get it and
                        // return the promise.

                        //$scope._updateCookie(systemConfigDataObj);
                        $scope._updateSystemConfigService(systemConfigDataObj);

                        $scope.systemConfig = new SystemConfig(result);


                        var messageOptions = {
                            module: 'Config',
                            type: 'success',
                            provider: 'dreamfactory',
                            message: 'System config updated successfully.'

                        };

                        dfNotify.success(messageOptions);


                        $scope.$emit($scope.es.updateSystemConfigSuccess, systemConfigDataObj);
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
            };


            // MESSAGES
            // This works but we need to make sure our nav doesn't update
            // probably some kind of message needs to be fired to the navigation directive
            $scope.$on('$locationChangeStart', function (e) {

                if (!dfObjectService.compareObjectsAsJson($scope.systemConfig.record, $scope.systemConfig.recordCopy)) {

                    if (!dfNotify.confirmNoSave()) {

                        e.preventDefault();
                    }
                }
            });


            // HELP
            $scope.dfLargeHelp = {

                systemInfo: {
                    title: 'System Info Overview',
                    text: 'Displays current system information.'
                },
                cacheConfig: {
                    title: 'Cache Overview',
                    text: 'Flush system-wide cache or per-service caches. Use the cache clearing buttons below to refresh any changes made to your system configuration values.'
                },
                corsConfig: {
                    title: 'CORS Overview',
                    text: 'Enter allowed hosts and HTTP verbs. You can enter * for all hosts. Use the * option for development to enable application code running locally on your computer to communicate directly with your DreamFactory instance.'
                },
                emailTemplates: {
                    title: 'Email Templates Overview',
                    text: 'Create and edit email templates for User Registration, User Invite, Password Reset, and your custom email services.'
                },
                globalLookupKeys: {
                    title: 'Global Lookup Keys Overview',
                    text: 'An administrator can create any number of "key value" pairs attached to DreamFactory. The key values are automatically substituted on the server. ' +
                    'For example, you can use Lookup Keys in Email Templates, as parameters in external REST Services, and in the username and password fields to connect ' +
                    'to a SQL or NoSQL database. Mark any Lookup Key as private to securely encrypt the key value on the server and hide it in the user interface.' +
                    '<span style="color: red;">  Note that Lookup Keys for REST service configuration and credentials must be private.</span>'
                }
            }
        }])

    .directive('dreamfactorySystemInfo', ['MODSYSCONFIG_ASSET_PATH', 'INSTANCE_URL', 'APP_VERSION', '$http', 'dfNotify', function (MODSYSCONFIG_ASSET_PATH, INSTANCE_URL, APP_VERSION, $http, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/system-info.html',
            link: function (scope, elem, attrs) {

                scope.upgrade = function () {

                    window.top.location = 'http://wiki.dreamfactory.com/';
                };

                scope.APP_VERSION = APP_VERSION;
            }
        }
    }])

    .directive('dreamfactoryCacheConfig', ['MODSYSCONFIG_ASSET_PATH', 'INSTANCE_URL', 'APP_VERSION', '$http', 'dfNotify', function (MODSYSCONFIG_ASSET_PATH, INSTANCE_URL, APP_VERSION, $http, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/cache-config.html',
            link: function (scope, elem, attrs) {

                scope.flushSystemCache = function () {

                    $http.delete(INSTANCE_URL + '/api/v2/system/cache')
                        .success(function () {

                            var messageOptions = {
                                module: 'Cache',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'System-wide cache flushed.'
                            };

                            dfNotify.success(messageOptions);
                        })
                        .error(function (error) {

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: {'data': {'error': [error.error]}}
                            };

                            dfNotify.error(messageOptions);
                        })

                };

                scope.flushServiceCache = function (index) {

                    $http.delete(INSTANCE_URL + '/api/v2/system/cache/' + scope.cacheEnabledServices[index].name)
                        .success(function () {

                            var messageOptions = {
                                module: 'Cache',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: scope.cacheEnabledServices[index].label + ' service cache flushed.'
                            };

                            dfNotify.success(messageOptions);
                        })
                        .error(function (error) {

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: {'data': {'error': [error.error]}}
                            };

                            dfNotify.error(messageOptions);
                        })
                };
            }
        }
    }])

    .directive('dreamfactoryCorsConfig', ['MODSYSCONFIG_ASSET_PATH', 'dfApplicationData', 'dfNotify',
        function (MODSYSCONFIG_ASSET_PATH, dfApplicationData, dfNotify) {

            return {
                restrict: 'E',
                scope: false,
                templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/cors-config.html',
                link: function (scope, elem, attrs) {


                    var CorsEntry = function (corsEntryData) {

                        function genTempId() {
                            return Math.floor(Math.random() * 100000)
                        }

                        var _new = {
                            id: null,
                            origin: 'NEW',
                            path: null,
                            method: [],
                            enabled: false
                        };

                        corsEntryData = corsEntryData || _new;

                        return {
                            __dfUI: {
                                newHost: corsEntryData.id === null,
                                tempId: genTempId()
                            },
                            record: angular.copy(corsEntryData),
                            recordCopy: angular.copy(corsEntryData)
                        }
                    };


                    scope.corsEntries = null;
                    scope.selectedCorsEntry = null;


                    // PUBLIC API
                    scope.addCorsEntry = function () {

                        scope._addCorsEntry();
                    };

                    scope.deleteCorsEntry = function () {

                        if (dfNotify.confirm("Delete " + scope.selectedCorsEntry.record.origin + "?")) {

                            scope._deleteCorsEntry();
                        }
                    };

                    scope.saveCorsEntry = function () {

                        var template = scope.selectedCorsEntry;

                        if (template == null) {

                            var messageOptions = {
                                module: 'CORS',
                                type: 'warn',
                                provider: 'dreamfactory',
                                message: 'No host selected.'
                            };

                            dfNotify.warn(messageOptions);

                            angular.element('#select-cors-host').focus();

                            return;
                        }

                        if (template.record.id === null) {

                            if (template.record.origin === 'NEW') {

                                var messageOptions = {
                                    module: 'CORS',
                                    type: 'warn',
                                    provider: 'dreamfactory',
                                    message: 'Entries should have a unique origin.  Please rename your origin to something other than the default \'new\' origin name.'
                                };

                                dfNotify.warn(messageOptions);

                                return;
                            }
                            scope._saveCorsEntry(template);
                        } else {

                            scope._updateCorsEntry(template);
                        }
                    };


                    // PRIVATE API
                    scope._saveCorsEntryToServer = function (requestDataObj) {

                        return dfApplicationData.saveApiData('cors', requestDataObj).$promise;
                    };

                    scope._updateCorsEntryToServer = function (requestDataObj) {

                        return dfApplicationData.updateApiData('cors', requestDataObj).$promise;
                    };

                    scope._deleteCorsEntryFromServer = function (requestDataObj) {

                        return dfApplicationData.deleteApiData('cors', requestDataObj).$promise;
                    };


                    // PRIVATE API
                    scope._addCorsEntry = function () {
                        scope.corsEntries.push(new CorsEntry());
                        scope.selectedCorsEntry = scope.corsEntries[scope.corsEntries.length - 1];
                    };

                    scope._deleteCorsEntry = function () {


                        // If this is a recently add/new template that hasn't been saved yet.
                        if (scope.selectedCorsEntry.__dfUI.newHost) {

                            var i = 0;

                            while (i < scope.corsEntries.length) {
                                if (scope.corsEntries[i].__dfUI.tempId === scope.selectedCorsEntry.__dfUI.tempId) {
                                    scope.corsEntries.splice(i, 1);
                                    break;
                                }

                                i++
                            }

                            var messageOptions = {
                                module: 'CORS',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'CORS entry deleted successfully.'

                            };

                            dfNotify.success(messageOptions);

                            scope.selectedCorsEntry = null;

                            return;
                        }

                        var requestDataObj = {
                            params: {
                                fields: '*'
                            },
                            data: scope.selectedCorsEntry.record
                        };


                        scope._deleteCorsEntryFromServer(requestDataObj).then(
                            function (result) {

                                var messageOptions = {
                                    module: 'CORS',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: 'CORS entry deleted successfully.'
                                };

                                dfNotify.success(messageOptions);

                                scope.selectedCorsEntry = null;

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
                        )
                    }

                    scope._saveCorsEntry = function (template) {


                        var requestDataObj = {
                            params: {
                                fields: '*'
                            },
                            data: template.record
                        };

                        scope._saveCorsEntryToServer(requestDataObj).then(
                            function (result) {


                                var messageOptions = {
                                    module: 'CORS',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: 'CORS entry created successfully.'

                                };

                                dfNotify.success(messageOptions);


                                // Reinsert into the matrix.....HA!
                                // No Seriously
                                // Find where this template is in the array of templates and
                                // replace with the new record sent back from server.
                                // also replace the selectedTemplate with the new record as well
                                var i = 0;

                                while (i < scope.corsEntries.length) {

                                    if (scope.corsEntries[i].record.origin === result.origin) {

                                        var _newHost = new CorsEntry(result);

                                        scope.corsEntries[i] = _newHost;
                                        scope.selectedCorsEntry = _newHost;
                                    }

                                    i++;
                                }
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
                        )
                    }

                    scope._updateCorsEntry = function (template) {


                        var requestDataObj = {
                            params: {
                                fields: '*'
                            },
                            data: template.record
                        };


                        scope._updateCorsEntryToServer(requestDataObj).then(
                            function (result) {

                                var messageOptions = {
                                    module: 'CORS',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: 'CORS entry updated successfully.'
                                };

                                dfNotify.success(messageOptions);


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
                        )
                    }


                    var watchcorsEntries = scope.$watch('corsEntries', function (newValue, oldValue) {

                        if (newValue === null) {

                            scope.corsEntries = [];
                            angular.forEach(dfApplicationData.getApiData('cors'), function (emailData) {

                                scope.corsEntries.push(new CorsEntry(emailData));
                            })
                        }
                    });

                    var watchdfApplicationData = scope.$watchCollection(function () {
                        return dfApplicationData.getApiData('cors')
                    }, function (newValue, oldValue) {

                        if (!newValue) return;


                        scope.corsEntries = [];
                        angular.forEach(newValue, function (hostData) {

                            scope.corsEntries.push(new CorsEntry(hostData));
                        })
                    });


                    scope.$on('$destroy', function (e) {

                        watchcorsEntries();
                        watchdfApplicationData();
                    });


                }
            }
        }])

    .directive('dreamfactoryEmailTemplates', ['MODSYSCONFIG_ASSET_PATH', 'dfApplicationData', 'dfNotify',
        function (MODSYSCONFIG_ASSET_PATH, dfApplicationData, dfNotify) {

            return {
                restrict: 'E',
                scope: false,
                templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/email-templates.html',
                link: function (scope, elem, attrs) {


                    var EmailTemplate = function (emailTemplateData) {

                        function genTempId() {
                            return Math.floor(Math.random() * 100000)
                        }

                        var _new = {
                            bcc: null,
                            body_html: null,
                            body_text: null,
                            cc: null,
                            defaults: [],
                            description: null,
                            from_email: null,
                            from_name: null,
                            id: null,
                            name: 'NEW EMAIL TEMPLATE',
                            replay_to_email: null,
                            replay_to_name: null,
                            subject: null,
                            to: null
                        };

                        emailTemplateData = emailTemplateData || _new;

                        return {
                            __dfUI: {
                                newTemplate: emailTemplateData.id === null,
                                tempId: genTempId()
                            },
                            record: angular.copy(emailTemplateData),
                            recordCopy: angular.copy(emailTemplateData)
                        }
                    };


                    scope.emailTemplates = null;
                    scope.selectedEmailTemplate = null;


                    // PUBLIC API
                    scope.addEmailTemplate = function () {

                        scope._addEmailTemplate();
                    };

                    scope.deleteEmailTemplate = function () {

                        if (dfNotify.confirm("Delete " + scope.selectedEmailTemplate.record.name + "?")) {

                            scope._deleteEmailTemplate();
                        }
                    };

                    scope.saveEmailTemplate = function () {

                        var template = scope.selectedEmailTemplate;

                        if (template == null) {

                            var messageOptions = {
                                module: 'Email Templates',
                                type: 'warn',
                                provider: 'dreamfactory',
                                message: 'No email template selected.'
                            };

                            dfNotify.warn(messageOptions);

                            angular.element('#select-email-template').focus();

                            return;
                        }

                        if (template.record.id === null) {

                            if (template.record.name === 'NEW EMAIL TEMPLATE') {

                                var messageOptions = {
                                    module: 'Email Templates',
                                    type: 'warn',
                                    provider: 'dreamfactory',
                                    message: 'Email templates should have a unique name.  Please rename your email template to something other than the default \'new\' template name.'
                                };

                                dfNotify.warn(messageOptions);

                                return;
                            }
                            scope._saveEmailTemplate(template);
                        } else {

                            scope._updateEmailTemplate(template);
                        }
                    };


                    // PRIVATE API
                    scope._saveEmailTemplateToServer = function (requestDataObj) {

                        return dfApplicationData.saveApiData('email_template', requestDataObj).$promise;
                    };

                    scope._updateEmailTemplateToServer = function (requestDataObj) {

                        return dfApplicationData.updateApiData('email_template', requestDataObj).$promise;
                    };

                    scope._deleteEmailTemplateFromServer = function (requestDataObj) {

                        return dfApplicationData.deleteApiData('email_template', requestDataObj).$promise;
                    };


                    // PRIVATE API
                    scope._addEmailTemplate = function () {

                        scope.emailTemplates.push(new EmailTemplate());

                        scope.selectedEmailTemplate = scope.emailTemplates[scope.emailTemplates.length - 1];
                    };

                    scope._deleteEmailTemplate = function () {


                        // If this is a recently add/new template that hasn't been saved yet.
                        if (scope.selectedEmailTemplate.__dfUI.newTemplate) {

                            var i = 0;

                            while (i < scope.emailTemplates.length) {
                                if (scope.emailTemplates[i].__dfUI.tempId === scope.selectedEmailTemplate.__dfUI.tempId) {
                                    scope.emailTemplates.splice(i, 1);
                                    break;
                                }

                                i++
                            }

                            var messageOptions = {
                                module: 'Email Templates',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Email template deleted successfully.'

                            };

                            dfNotify.success(messageOptions);

                            scope.selectedEmailTemplate = null;

                            return;
                        }

                        var requestDataObj = {
                            params: {
                                fields: '*'
                            },
                            data: scope.selectedEmailTemplate.record
                        };


                        scope._deleteEmailTemplateFromServer(requestDataObj).then(
                            function (result) {

                                var messageOptions = {
                                    module: 'Email Templates',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: 'Email template deleted successfully.'
                                };

                                dfNotify.success(messageOptions);

                                scope.selectedEmailTemplate = null;

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
                        )
                    }

                    scope._saveEmailTemplate = function (template) {


                        var requestDataObj = {
                            params: {
                                fields: '*'
                            },
                            data: template.record
                        };

                        scope._saveEmailTemplateToServer(requestDataObj).then(
                            function (result) {


                                var messageOptions = {
                                    module: 'Email Templates',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: 'Email template created successfully.'

                                };

                                dfNotify.success(messageOptions);


                                // Reinsert into the matrix.....HA!
                                // No Seriously
                                // Find where this template is in the array of templates and
                                // replace with the new record sent back from server.
                                // also replace the selectedTemplate with the new record as well
                                var i = 0;

                                while (i < scope.emailTemplates.length) {

                                    if (scope.emailTemplates[i].record.name === result.name) {

                                        var _newTemplate = new EmailTemplate(result);

                                        scope.emailTemplates[i] = _newTemplate;
                                        scope.selectedEmailTemplate = _newTemplate;
                                    }

                                    i++;
                                }
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
                        )
                    }

                    scope._updateEmailTemplate = function (template) {


                        var requestDataObj = {
                            params: {
                                fields: '*'
                            },
                            data: template.record
                        };


                        scope._updateEmailTemplateToServer(requestDataObj).then(
                            function (result) {

                                var messageOptions = {
                                    module: 'Email Templates',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: 'Email template updated successfully.'
                                };

                                dfNotify.success(messageOptions);


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
                        )
                    }


                    var watchEmailTemplates = scope.$watch('emailTemplates', function (newValue, oldValue) {

                        if (newValue === null) {

                            scope.emailTemplates = [];
                            angular.forEach(dfApplicationData.getApiData('email_template'), function (emailData) {

                                scope.emailTemplates.push(new EmailTemplate(emailData));
                            })
                        }
                    });

                    var watchdfApplicationData = scope.$watchCollection(function () {
                        return dfApplicationData.getApiData('email_template')
                    }, function (newValue, oldValue) {

                        if (!newValue) return;


                        scope.emailTemplates = [];
                        angular.forEach(newValue, function (emailData) {

                            scope.emailTemplates.push(new EmailTemplate(emailData));
                        })
                    });


                    scope.$on('$destroy', function (e) {

                        watchEmailTemplates();
                        watchdfApplicationData();
                    });


                }
            }
        }])

    .directive('dreamfactoryGlobalLookupKeys', ['MODSYSCONFIG_ASSET_PATH', 'dfApplicationData', 'dfNotify',
        function (MODSYSCONFIG_ASSET_PATH, dfApplicationData, dfNotify) {

            return {
                restrict: 'E',
                scope: false,
                templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/global-lookup-keys.html',
                link: function (scope, elem, attrs) {


                    var Lookup = function (lookupKeyData) {

                        function genTempId() {
                            return Math.floor(Math.random() * 100000)
                        }

                        var _new = {
                            id: null,
                            name: "NEW",
                            value: null
                        };

                        lookupKeyData = lookupKeyData || _new;

                        return {
                            __dfUI: {
                                newLookup: lookupKeyData.id === null,
                                tempId: genTempId()
                            },
                            record: angular.copy(lookupKeyData),
                            recordCopy: angular.copy(lookupKeyData)
                        }
                    };


                    scope.globalLookups = null;
                    scope.selectedLookup = null;


                    // PUBLIC API
                    scope.addLookup = function () {

                        scope._addLookup();
                    };

                    scope.deleteLookup = function () {

                        if (dfNotify.confirm("Delete " + scope.selectedLookup.record.name + "?")) {

                            scope._deleteLookup();
                        }
                    };

                    scope.saveLookup = function () {

                        var lookup = scope.selectedLookup;

                        if (lookup == null) {

                            var messageOptions = {
                                module: 'Global Lookup Keys',
                                type: 'warn',
                                provider: 'dreamfactory',
                                message: 'No lookup key selected.'
                            };

                            dfNotify.warn(messageOptions);

                            angular.element('#select-global-lookup').focus();

                            return;
                        }

                        if (lookup.record.id === null) {

                            if (lookup.record.name === 'NEW') {

                                var messageOptions = {
                                    module: 'Global Lookup Keys',
                                    type: 'warn',
                                    provider: 'dreamfactory',
                                    message: 'Lookup keys should have a unique name.  Please rename your key to something other than the default \'new\' key name.'
                                };

                                dfNotify.warn(messageOptions);

                                return;
                            }
                            scope._saveLookup(lookup);
                        } else {

                            scope._updateLookup(lookup);
                        }
                    };


                    // PRIVATE API
                    scope._saveLookupToServer = function (requestDataObj) {

                        return dfApplicationData.saveApiData('lookup', requestDataObj).$promise;
                    };

                    scope._updateLookupToServer = function (requestDataObj) {

                        return dfApplicationData.updateApiData('lookup', requestDataObj).$promise;
                    };

                    scope._deleteLookupFromServer = function (requestDataObj) {

                        return dfApplicationData.deleteApiData('lookup', requestDataObj).$promise;
                    };


                    // PRIVATE API
                    scope._addLookup = function () {

                        scope.globalLookups.push(new Lookup());

                        scope.selectedLookup = scope.globalLookups[scope.globalLookups.length - 1];
                    };

                    scope._deleteLookup = function () {


                        // If this is a recently add/new template that hasn't been saved yet.
                        if (scope.selectedLookup.__dfUI.newLookup) {

                            var i = 0;

                            while (i < scope.globalLookups.length) {
                                if (scope.globalLookups[i].__dfUI.tempId === scope.selectedLookup.__dfUI.tempId) {
                                    scope.globalLookups.splice(i, 1);
                                    break;
                                }

                                i++
                            }

                            var messageOptions = {
                                module: 'Global Lookup Keys',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Lookup key deleted successfully.'

                            };

                            dfNotify.success(messageOptions);

                            scope.selectedLookup = null;

                            return;
                        }

                        var requestDataObj = {
                            params: {
                                fields: '*'
                            },
                            data: scope.selectedLookup.record
                        };


                        scope._deleteLookupFromServer(requestDataObj).then(
                            function (result) {

                                var messageOptions = {
                                    module: 'Global Lookup Keys',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: 'Lookup key deleted successfully.'
                                };

                                dfNotify.success(messageOptions);

                                scope.selectedLookup = null;

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
                        )
                    }

                    scope._saveLookup = function (lookup) {


                        var requestDataObj = {
                            params: {
                                fields: '*'
                            },
                            data: lookup.record
                        };

                        scope._saveLookupToServer(requestDataObj).then(
                            function (result) {


                                var messageOptions = {
                                    module: 'Global Lookup Keys',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: 'Lookup key created successfully.'

                                };

                                dfNotify.success(messageOptions);


                                // Reinsert into the matrix.....HA!
                                // No Seriously
                                // Find where this template is in the array of templates and
                                // replace with the new record sent back from server.
                                // also replace the selectedTemplate with the new record as well
                                var i = 0;

                                while (i < scope.globalLookups.length) {

                                    if (scope.globalLookups[i].record.name === result.name) {

                                        var _newLookup = new Lookup(result);

                                        scope.globalLookups[i] = _newLookup;
                                        scope.selectedLookup = _newLookup;
                                    }

                                    i++;
                                }
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
                        )
                    }

                    scope._updateLookup = function (lookup) {


                        var requestDataObj = {
                            params: {
                                fields: '*'
                            },
                            data: lookup.record
                        };


                        scope._updateLookupToServer(requestDataObj).then(
                            function (result) {

                                var messageOptions = {
                                    module: 'Global Lookup Keys',
                                    type: 'success',
                                    provider: 'dreamfactory',
                                    message: 'Lookup key updated successfully.'
                                };

                                dfNotify.success(messageOptions);


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
                        )
                    }


                    var watchGlobalLookupKeys = scope.$watch('globalLookups', function (newValue, oldValue) {

                        if (newValue === null) {

                            scope.globalLookups = [];
                            angular.forEach(dfApplicationData.getApiData('lookup'), function (lookupData) {

                                scope.globalLookups.push(new Lookup(lookupData));
                            })
                        }
                    });

                    var watchdfApplicationData = scope.$watchCollection(function () {
                        return dfApplicationData.getApiData('lookup')
                    }, function (newValue, oldValue) {

                        if (!newValue) return;


                        scope.globalLookups = [];
                        angular.forEach(newValue, function (lookupData) {

                            scope.globalLookups.push(new Lookup(lookupData));
                        })
                    });


                    scope.$on('$destroy', function (e) {

                        watchGlobalLookupKeys();
                        watchdfApplicationData();
                    });


                }
            }
        }])

    .directive('dfEditPreferences', ['MODSYSCONFIG_ASSET_PATH', 'dfApplicationData', 'dfApplicationPrefs', 'dfPrefFactory', 'dfNotify', function (MODSYSCONFIG_ASSET_PATH, dfApplicationData, dfApplicationPrefs, dfPrefFactory, dfNotify) {

        return {

            restrict: 'E',
            scope: {},
            templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/df-edit-preferences.html',
            link: function (scope, elem, attrs) {


                scope.prefs = {};

                scope.viewModes = ['list', 'thumbnails', 'table'];

                // Init create pref objects
                angular.forEach(dfApplicationPrefs.getPrefs(), function (value, key) {

                    scope.prefs[key] = {};

                    angular.forEach(value, function (_value, _key) {

                        scope.prefs[key][_key] = [];

                        angular.forEach(_value, function (__value, __key) {

                            scope.prefs[key][_key].push(dfPrefFactory(__key, __value));

                        })
                    })

                });

                scope.savePrefs = function () {

                    scope._savePrefs();
                };


                scope._savePrefsToServer = function (requestDataObj) {

                    return dfApplicationData.saveAdminPrefs(requestDataObj);
                };

                scope._formatPrefs = function () {

                    var _prefs = {};

                    angular.forEach(scope.prefs, function (value, key) {

                        _prefs[key] = {};

                        angular.forEach(value, function (_value, _key) {

                            _prefs[key][_key] = {};

                            angular.forEach(_value, function (obj) {

                                _prefs[key][_key][obj.key] = obj.value;
                            })
                        })
                    })

                    return _prefs;
                }


                scope._savePrefs = function () {

                    var requestDataObj = scope._formatPrefs();

                    scope._savePrefsToServer(requestDataObj).then(
                        function (result) {


                            var messageOptions = {
                                module: 'Preferences',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Preferences saved.'
                            };

                            dfNotify.success(messageOptions);

                            dfApplicationPrefs.setPrefs(requestDataObj);

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
        }
    }])

    .factory('dfPrefFactory', [function () {

        return function (key, value) {
            var Pref = function (type, key, value) {
                return {
                    type: type,
                    key: key,
                    value: value
                }
            };


            switch (Object.prototype.toString.call(value)) {

                case '[object String]':
                    return new Pref('string', key, value);
                case '[object Array]':
                    return new Pref('array', key, value);
                case '[object Number]':
                    return new Pref('number', key, value);
                case '[object Boolean]':
                    return new Pref('boolean', key, value);
                case '[object Object':
                    return new Pref('object', key, value);

            }
        }
    }])

    .service('SystemConfigEventsService', [function () {

        return {
            systemConfigController: {
                updateSystemConfigRequest: 'update:systemconfig:request',
                updateSystemConfigSuccess: 'update:systemconfig:success',
                updateSystemConfigError: 'update:systemconfig:error'
            }
        }
    }])

    .service('SystemConfigDataService', ['INSTANCE_URL', function (INSTANCE_URL) {

        var systemConfig = {};

        function _getSystemConfigFromServerSync() {

            var xhr;

            if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
                xhr = new XMLHttpRequest();
            } else {// code for IE6, IE5
                xhr = new ActiveXObject("Microsoft.XMLHTTP");
            }

            xhr.open("GET", INSTANCE_URL + '/api/v2/system/environment', false);
            xhr.setRequestHeader("X-DreamFactory-API-Key", "6498a8ad1beb9d84d63035c5d1120c007fad6de706734db9689f8996707e0f7d");
            xhr.setRequestHeader("Content-Type", "application/json");

            //if (xhr.overrideMimeType) xhr.overrideMimeType("application/json");

            xhr.send();

            if (xhr.readyState == 4 && xhr.status == 200) {
                return angular.fromJson(xhr.responseText);
            } else {
                throw {
                    module: 'DreamFactory System Config Module',
                    type: 'error',
                    provider: 'dreamfactory',
                    exception: 'XMLHTTPRequest Failure:  _getSystemConfigFromServer() Failed retrieve config.  Please contact your system administrator.'
                }
            }
        }

        function _getSystemConfig() {

            return systemConfig;
        }

        function _setSystemConfig(userDataObj) {

            systemConfig = userDataObj;
        }

        return {

            getSystemConfigFromServerSync: function () {

                return _getSystemConfigFromServerSync();
            },

            getSystemConfig: function () {

                return _getSystemConfig();
            },

            setSystemConfig: function (systemConfigDataObj) {

                _setSystemConfig(systemConfigDataObj);
            }
        }
    }
    ])
