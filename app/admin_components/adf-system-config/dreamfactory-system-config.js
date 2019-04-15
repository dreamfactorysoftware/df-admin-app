/**
 * This file is part of DreamFactory (tm)
 *
 * http://github.com/dreamfactorysoftware/dreamfactory
 * Copyright 2012-2017 DreamFactory Software, Inc. <dspsupport@dreamfactory.com>
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
                        checkUser:['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }])

    .run([function () {

    }])

    .controller('SystemConfigurationCtrl', ['$scope', 'dfApplicationData', 'SystemConfigEventsService', 'SystemConfigDataService', 'dfObjectService', 'dfNotify', 'UserDataService',
        function ($scope, dfApplicationData, SystemConfigEventsService, SystemConfigDataService, dfObjectService, dfNotify, UserDataService) {

            var currentUser = UserDataService.getCurrentUser();
            $scope.isSysAdmin = (currentUser && currentUser.is_sys_admin);

            $scope.$parent.title = 'Config';

            // CREATE SHORT NAMES
            $scope.es = SystemConfigEventsService.systemConfigController;

            // PUBLIC API

            $scope.buildLinks = function(checkData) {

                var links = [];

                if (!checkData || $scope.apiData.environment) {
                    links.push (
                        {
                            name: 'system-info',
                            label: 'System Info',
                            path: 'system-info',
                            active: links.length === 0
                        }
                    );
                }
                if (!checkData || $scope.apiData.cache) {
                    links.push (
                        {
                            name: 'cache',
                            label: 'Cache',
                            path: 'cache',
                            active: links.length === 0
                        }
                    );
                }
                if (!checkData || $scope.apiData.cors) {
                    links.push (
                        {
                            name: 'cors',
                            label: 'CORS',
                            path: 'cors',
                            active: links.length === 0
                        }
                    );
                }
                if (!checkData || $scope.apiData.email_template) {
                    links.push (
                        {
                            name: 'email-templates',
                            label: 'Email Templates',
                            path: 'email-templates',
                            active: links.length === 0
                        }
                    );
                }
                if (!checkData || $scope.apiData.lookup) {
                    links.push (
                        {
                            name: 'global-lookup-keys',
                            label: 'Global Lookup Keys',
                            path: 'global-lookup-keys',
                            active: links.length === 0
                        }
                    );
                }
                if (!checkData || $scope.apiData.custom) {
                    links.push (
                        {
                            name: 'live-chat',
                            label: 'Live Chat',
                            path: 'live-chat',
                            active: links.length === 0
                        }
                    );
                }
                return links;
            };

            $scope.links = $scope.buildLinks(false);
            $scope.$emit('sidebar-nav:view:reset');

            // MESSAGES
            // This works but we need to make sure our nav doesn't update
            // probably some kind of message needs to be fired to the navigation directive
            $scope.$on('$locationChangeStart', function (e) {

                if (!$scope.hasOwnProperty('systemConfig')) {
                    return;
                }

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
                },
                chatConfig: {
                    title: 'Live Chat',
                    text: 'Enable or disable live chat with the DreamFactory product support team. This setting applies to all admin users on this DreamFactory instance.'
                }
            };

            // load data

            $scope.apiData = {};

            $scope.loadTabData = function() {

                var apis = ['cache', 'environment', 'cors', 'lookup', 'email_template', 'custom'];

                // this tab is different. it loads as much as it can rather than failing on first error
                angular.forEach(apis, function(api) {
                    dfApplicationData.getApiData([api]).then(
                        function (response) {
                            $scope.apiData[api] = response[0].resource ? response[0].resource : response[0];
                        },
                        function (error) {

                        }
                    ).finally(function() {
                        $scope.links = $scope.buildLinks(true);
                        $scope.$emit('sidebar-nav:view:reset');
                    });
                });
            };

            $scope.loadTabData();
        }])

    .directive('dreamfactorySystemInfo', ['MODSYSCONFIG_ASSET_PATH', function (MODSYSCONFIG_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/system-info.html',
            link: function (scope, elem, attrs) {

                scope.upgrade = function () {

                    window.top.location = 'http://wiki.dreamfactory.com/';
                };

                var watchEnvironment = scope.$watchCollection('apiData.environment', function (newValue, oldValue) {

                    if (newValue) {

                        scope.systemEnv = newValue;
                    }
                });

                scope.$on('$destroy', function (e) {

                    watchEnvironment();
                });
            }
        };
    }])

    .directive('dreamfactoryCacheConfig', ['MODSYSCONFIG_ASSET_PATH', 'INSTANCE_URL', '$http', 'dfNotify', function (MODSYSCONFIG_ASSET_PATH, INSTANCE_URL, $http, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/cache-config.html',
            link: function (scope, elem, attrs) {
                if(scope.apiData.cache && scope.apiData.cache.length > 0){
                    scope.apiData.cache.sort(function(a, b) {
                        if (a.label > b.label) {
                            return 1; }
                        if (a.label < b.label) {
                            return -1; }
                        return 0;
                    });
                }

                scope.flushSystemCache = function () {

                    $http.delete(INSTANCE_URL.url + '/system/cache')
                        .then(function () {

                            var messageOptions = {
                                module: 'Cache',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'System-wide cache flushed.'
                            };

                            dfNotify.success(messageOptions);
                        }, function (error) {

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: error
                            };

                            dfNotify.error(messageOptions);
                        });

                };

                scope.flushServiceCache = function (index) {

                    $http.delete(INSTANCE_URL.url + '/system/cache/' + scope.apiData.cache[index].name)
                        .then(function () {

                            var messageOptions = {
                                module: 'Cache',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: scope.apiData.cache[index].label + ' service cache flushed.'
                            };

                            dfNotify.success(messageOptions);
                        }, function (error) {

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: error
                            };

                            dfNotify.error(messageOptions);
                        });
                };
            }
        };
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
                            path: 'NEW',
                            description: null,
                            origin: '*',
                            header: '*',
                            exposed_header: null,
                            max_age: 0,
                            method: [],
                            supports_credentials: false,
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
                        };
                    };


                    scope.corsEntries = null;
                    scope.selectedCorsEntry = null;


                    // PUBLIC API
                    scope.addCorsEntry = function () {

                        scope._addCorsEntry();
                    };

                    scope.deleteCorsEntry = function () {

                        if (dfNotify.confirm("Delete " + scope.selectedCorsEntry.record.path + "?")) {

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

                            if (template.record.path === 'NEW') {

                                var messageOptions = {
                                    module: 'CORS',
                                    type: 'warn',
                                    provider: 'dreamfactory',
                                    message: 'Entries should have a unique path pattern.  Please rename your entry to something other than the default \'new\' name.'
                                };

                                dfNotify.warn(messageOptions);

                                return;
                            }

                            if (template.record.path === undefined) {

                                var messageOptions = {
                                    module: 'CORS',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    message: 'Path is a required field.'
                                };

                                dfNotify.error(messageOptions);

                                return;
                            }

                            scope._saveCorsEntry(template);
                        } else {

                            scope._updateCorsEntry(template);
                        }
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

                                i++;
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


                        dfApplicationData.deleteApiData('cors', requestDataObj).$promise.then(

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
                        );
                    };

                    scope._saveCorsEntry = function (template) {


                        var requestDataObj = {
                            params: {
                                fields: '*'
                            },
                            data: template.record
                        };

                        dfApplicationData.saveApiData('cors', requestDataObj).$promise.then(

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

                                    if (scope.corsEntries[i].record.path === result.path) {

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
                        );
                    };

                    scope._updateCorsEntry = function (template) {


                        var requestDataObj = {
                            params: {
                                fields: '*'
                            },
                            data: template.record
                        };


                        dfApplicationData.updateApiData('cors', requestDataObj).$promise.then(

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
                        );
                    };

                    scope.helpTextCors = {
                        description: {
                            title: 'Description',
                            text: 'Enter a description for this entry.'
                        },
                        path: {
                            title: 'Path',
                            text: 'Enter an absolute path or a pattern to match against incoming requests. ' +
                            'Example: * allows any path, api/v2/* will allow any path with api/v2/ prefix. ' +
                                'Path is matched by most accurate, i.e. api/v2/system/environment will match api/v2/* before *.'
                        },
                        origins: {
                            title: 'Origin (Access-Control-Allow-Origin)',
                            text: 'Enter a comma-delimited list of origins that you would like to allow for this path. Enter * for allowing any origin.'
                        },
                        headers: {
                            title: 'Headers (Access-Control-Allow-Headers)',
                            text: 'Enter a comma-delimited list of allowed headers. Enter * to allow any header.'
                        },
                        exposed_headers: {
                            title: 'Exposed Headers (Access-Control-Expose-Headers)',
                            text: 'Enter a comma-delimited list of headers to expose.'
                        },
                        max_age: {
                            title: 'Max Age (Access-Control-Max-Age)',
                            text: 'Enter max age. This indicates how long (in seconds) the results of a pre-flight request can be cached. Enter 0 for no caching.'
                        },
                        methods: {
                            title: 'Methods (Access-Control-Allow-Methods)',
                            text: 'Select HTTP verbs/methods that are allowed.'
                        }
                    };

                    var watchCorsEntries = scope.$watchCollection('apiData.cors', function (newValue, oldValue) {

                        if (newValue) {

                            scope.corsEntries = [];
                            angular.forEach(newValue, function (cors) {
                                scope.corsEntries.push(new CorsEntry(cors));
                            });
                        }
                    });

                    scope.$on('$destroy', function (e) {

                        watchCorsEntries();
                    });
                }
            };
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
                            return Math.floor(Math.random() * 100000);
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
                        };
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

                            if (template.record.name === undefined) {

                                var messageOptions = {
                                    module: 'Email Templates',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    message: 'Template Name is a required field.'
                                };

                                dfNotify.error(messageOptions);

                                return;
                            }

                            scope._saveEmailTemplate(template);
                        } else {

                            scope._updateEmailTemplate(template);
                        }
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

                                i++;
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


                        dfApplicationData.deleteApiData('email_template', requestDataObj).$promise.then(

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
                        );
                    };

                    scope._saveEmailTemplate = function (template) {

                        var requestDataObj = {
                            params: {
                                fields: '*'
                            },
                            data: template.record
                        };

                        dfApplicationData.saveApiData('email_template', requestDataObj).$promise.then(

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
                        );
                    };

                    scope._updateEmailTemplate = function (template) {

                        var requestDataObj = {
                            params: {
                                fields: '*'
                            },
                            data: template.record
                        };


                        dfApplicationData.updateApiData('email_template', requestDataObj).$promise.then(

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
                        );
                    };

                    scope.helpText = {
                        recipient: {
                            title: 'Recipient',
                            text: 'Enter recipient address. Enter multiple addresses separated by comma.'
                        },
                        cc: {
                            title: 'Cc',
                            text: 'Enter cc address. Enter multiple addresses separated by comma.'
                        },
                        bcc: {
                            title: 'Bcc',
                            text: 'Enter bcc address. Enter multiple addresses separated by comma.'
                        },
                        reply_to_name: {
                            title: 'Reply to Name',
                            text: 'Enter reply to name.'
                        },
                        reply_to_email: {
                            title: 'Reply to Email',
                            text: 'Enter reply to email.'
                        },
                        attachment: {
                            title: 'Attachment',
                            text: 'You can enter URL for attachment. Enter multiple URLs separated by comma. You can use lookup keys here too. Example: {key1},{key2}.'
                        }
                    };

                    var watchEmailTemplates = scope.$watchCollection('apiData.email_template', function (newValue, oldValue) {

                        if (newValue) {

                            scope.emailTemplates = [];
                            angular.forEach(newValue, function (email) {
                                scope.emailTemplates.push(new EmailTemplate(email));
                            });
                        }
                    });

                    scope.$on('$destroy', function (e) {

                        watchEmailTemplates();
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
                        };
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

                            if (lookup.record.name === undefined) {

                                var messageOptions = {
                                    module: 'Global Lookup Keys',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    message: 'Lookup keys should have a unique name.  Please name your key.'
                                };

                                dfNotify.error(messageOptions);

                                return;
                            }

                            scope._saveLookup(lookup);
                        } else {

                            scope._updateLookup(lookup);
                        }
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

                                i++;
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


                        dfApplicationData.deleteApiData('lookup', requestDataObj).$promise.then(

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
                        );
                    };

                    scope._saveLookup = function (lookup) {


                        var requestDataObj = {
                            params: {
                                fields: '*'
                            },
                            data: lookup.record
                        };

                        dfApplicationData.saveApiData('lookup', requestDataObj).$promise.then(

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
                        );
                    };

                    scope._updateLookup = function (lookup) {


                        var requestDataObj = {
                            params: {
                                fields: '*'
                            },
                            data: lookup.record
                        };


                        dfApplicationData.updateApiData('lookup', requestDataObj).$promise.then(

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
                        );
                    };

                    var watchGlobalLookupKeys = scope.$watchCollection('apiData.lookup', function (newValue, oldValue) {

                        if (newValue) {

                            scope.globalLookups = [];
                            angular.forEach(newValue, function (lookup) {
                                scope.globalLookups.push(new Lookup(lookup));
                            });
                        }
                    });

                    scope.$on('$destroy', function (e) {

                        watchGlobalLookupKeys();
                    });
                }
            };
        }])

    .directive('dreamfactoryLiveChatConfig', ['MODSYSCONFIG_ASSET_PATH', 'INSTANCE_URL', '$http', 'dfApplicationData', 'dfNotify', function (MODSYSCONFIG_ASSET_PATH, INSTANCE_URL, $http, dfApplicationData, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/live-chat-config.html',
            link: function (scope, elem, attrs) {

                scope.saveChatConfig = function () {

                    var func, data;
                    // POST to create, PUT to update.
                    if (!scope.hasChatConfig) {
                        func = $http.post;
                    } else {
                        func = $http.put;
                    }
                    // There could be other name/value pairs. Only change the chat setting.
                    data = {"name": "chat", "value": scope.chatEnabled};
                    func(INSTANCE_URL.url + '/system/custom', {"resource":[data]})
                        .then(function () {

                            // next time use PUT
                            scope.hasChatConfig = true;

                            var messageOptions = {
                                module: 'Live Chat',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Live chat config updated.'
                            };

                            dfNotify.success(messageOptions);
                        }, function (reject) {

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                        })
                        .finally(function () {

                            Comm100API.showChat(scope.chatEnabled);
                            // scope.chatEnabled tracks the state while on the Config tab
                            dfApplicationData.deleteApiDataFromCache('custom');
                        });
                };

                // The purpose of this watcher is to init scope.chatEnabled and
                // scope.hasChatConfig after /system/custom is loaded.
                //
                // scope.chatEnabled is the model value that stores the checkbox state
                // while on the config tab. scope.hasChatConfig is used to select POST
                // or PUT when changing the value.
                //
                // When an admin user logs in the watcher for currentUser will do a GET on
                // /system/custom to determine whether or not to show the chat UI. If the
                // admin then clicks the Config tab, it loads /system/custom as part of the
                // normal tab data loading mechanism. The data is returned from cache since
                // it was already loaded at login.
                //
                // When you change the value the dfApplicationData cache is cleared. The chat
                // visibility will be maintained at the last saved value. Reloading the app,
                // logging in again, or selecting the Config tab again will reload /system/custom
                // from the server.

                var watchCustom = scope.$watchCollection('apiData.custom', function (newValue, oldValue) {

                    if (newValue) {

                        // Enable/disable chat. Default to enabled in case nothing is set in db or there's an error.
                        var chatEnabled = true;
                        var custom = newValue.filter(function(obj) {
                            return (obj.name === 'chat');
                        });
                        if (custom.length > 0) {
                            chatEnabled = Boolean(custom[0].value);
                        }
                        scope.hasChatConfig = (custom.length > 0);
                        scope.chatEnabled = chatEnabled;
                    }
                });

                scope.$on('$destroy', function (e) {

                    watchCustom();
                });
            }
        };
    }])

    .service('SystemConfigEventsService', [function () {

        return {
            systemConfigController: {
                updateSystemConfigRequest: 'update:systemconfig:request',
                updateSystemConfigSuccess: 'update:systemconfig:success',
                updateSystemConfigError: 'update:systemconfig:error'
            }
        };
    }])

    .service('SystemConfigDataService', ['dfApplicationData',  function (dfApplicationData) {

        return {

            getSystemConfig: function () {

                return dfApplicationData.getApiDataSync('environment');
            }
        };
    }
    ]);
