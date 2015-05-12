/**
 * This file is part of the DreamFactory Services Platform(tm) (DSP)
 *
 * DreamFactory Services Platform(tm) <http://github.com/dreamfactorysoftware/dsp-core>
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

    .run(['SystemConfigDataService', function (SystemConfigDataService) {

    }])

    .controller('SystemConfigurationCtrl', ['$scope', 'dfApplicationData', 'SystemConfigEventsService', 'SystemConfigDataService', 'dfObjectService', 'dfNotify',
        function ($scope, dfApplicationData, SystemConfigEventsService, SystemConfigDataService, dfObjectService, dfNotify) {


            var SystemConfig = function (systemConfigData) {

                return {
                    record: angular.copy(systemConfigData),
                    recordCopy: angular.copy(systemConfigData)
                }
            };

            $scope.$parent.title = 'Config';


            // CREATE SHORT NAMES
            $scope.es = SystemConfigEventsService.systemConfigController;

            // PUBLIC API
            // Config will always be the first in the array so we grab the 0th value
            $scope.systemConfig = new SystemConfig(dfApplicationData.getApiData('config')[0]);
            $scope.rolesData = dfApplicationData.getApiData('role');
            $scope.servicesData = dfApplicationData.getApiData('service');
            $scope.emailTemplatesData = dfApplicationData.getApiData('email_template');


            $scope.links = [

                {
                    name: 'system-info',
                    label: 'System Info',
                    path: 'system-info',
                    active: true
                },
                {
                    name: 'cors',
                    label: 'CORS',
                    path: 'cors',
                    active: false
                },
                {
                    name: 'guest-users',
                    label: 'Guest Users',
                    path: 'guest-users',
                    active: false
                },
                {
                    name: 'open-registration',
                    label: 'Open Registration',
                    path: 'open-registration',
                    active: false
                },
                {
                    name: 'user-invites',
                    label: 'User Invites',
                    path: 'user-invites',
                    active: false
                },
                {
                    name: 'password-reset',
                    label: 'Password Reset',
                    path: 'password-reset',
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

            $scope._prepareSystemConfigData = function() {

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
                    function(result) {

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
                    function(reject) {

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
                    text: 'Displays current system information. Use the cache clearing functions below to refresh any changes made to your system configuration values.'
                },
                corsConfig: {
                    title: 'CORS Overview',
                    text: 'Enter allowed hosts and HTTP verbs. You can enter * for all hosts. Use the * option for development to enable application code running locally on your computer to communicate directly with your DreamFactory instance.'
                },
                guestUsers: {
                    title: 'Guest Users Overview',
                    text: ' Enable Guest Users to allow access to applications and services without authentication. Guest User privileges are governed by the Guest Role.'
                },
                openRegistration: {
                    title: 'Open Registration Overview',
                    text: 'Turn on Open Registration to allow users to self-register for applications. Set a Role for newly registered users, select an email service to turn on email registration confirmation, and optionally select a custom email template.'+
                        '<span style="color: red;">  Make sure to configure an email service to prevent spam, bots, and scripts from abusing the Open Registration function.</span>'
                },
                userInvites: {
                    title: 'User Invites Overview',
                    text: 'Set an email service and optional custom template for User Invite.'
                },
                passwordReset: {
                    title: 'Password Reset Overview',
                    text: 'Set an email service and optional custom template for Password Reset.'
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

    .directive('dreamfactorySystemInfo', ['MODSYSCONFIG_ASSET_PATH', 'DSP_URL', 'APP_VERSION', '$http', 'dfNotify', function (MODSYSCONFIG_ASSET_PATH, DSP_URL, APP_VERSION, $http, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/system-info.html',
            link: function(scope, elem, attrs) {

                scope.upgrade = function() {

                    window.top.location = DSP_URL + '/web/upgrade';
                };

                scope.flushSystemCache = function () {

                    $http.get(DSP_URL + '/web/flush?cache=platform')
                        .success(
                            function () {

                            var messageOptions = {
                                module: 'Config',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Platform cache flushed.'
                            }

                            dfNotify.success(messageOptions);
                        })
                        .error(function (error) {


                        var messageOptions = {
                            module: 'Api Error',
                            type: 'error',
                            provider: 'dreamfactory',
                            message: error
                        }

                        dfNotify.error(messageOptions);
                    })

                };

                scope.flushSwaggerCache = function () {

                    $http.get(DSP_URL + '/web/flush?cache=swagger')
                        .success(
                        function () {

                            var messageOptions = {
                                module: 'Config',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Swagger cache flushed.'
                            }

                            dfNotify.success(messageOptions);
                        })
                        .error(function (error) {


                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: error
                            }

                            dfNotify.error(messageOptions);

                        })
                };

                scope.APP_VERSION = APP_VERSION;
            }
        }
    }])

    .directive('dreamfactoryCorsConfig', ['MODSYSCONFIG_ASSET_PATH', 'SystemConfigDataService',
        function (MODSYSCONFIG_ASSET_PATH, SystemConfigDataService) {

            return {
                restrict: 'E',
                templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/cors-config.html',
                scope: true,
                link: function (scope, elem, attrs) {

                    elem.bind('change', function(){
                        scope.systemConfig.record.allowed_hosts = scope.allowedHosts;
                    });

                    scope.allowedHosts = scope.systemConfig.record.allowed_hosts;

                    scope.supportedVerbs = [
                        'GET',
                        'POST',
                        'PUT',
                        'PATCH',
                        'MERGE',
                        'DELETE',
                        'COPY'
                    ];


                    // PUBLIC API
                    scope.addNewHost = function () {

                        scope._addNewHost();
                    };

                    scope.removeHost = function (hostDataObjIndex) {

                        scope._confirmRemoveHost(hostDataObjIndex) ? scope._removeHost(hostDataObjIndex) : false;
                    };


                    // PRIVATE API
                    scope._createNewHostModel = function () {

                        return {
                            host: null,
                            is_enabled: true,
                            verbs: []
                        }
                    };

                    scope._addNewHostData = function () {

                        scope.allowedHosts.push(scope._createNewHostModel());
                    };

                    scope._removeHostData = function (hostDataObjIndex) {

                        scope.allowedHosts.splice(hostDataObjIndex, 1);
                    };

                    scope._confirmRemoveHost = function (hostDataObjIndex) {

                        return confirm('Delete Host: ' + scope.allowedHosts[hostDataObjIndex].host)
                    };


                    // COMPLEX IMPLEMENTATION
                    scope._addNewHost = function () {

                        scope._addNewHostData();
                    };

                    scope._removeHost = function (hostDataObjIndex) {

                        scope._removeHostData(hostDataObjIndex);
                    };


                    // WATCHERS AND INIT

                }
            }
        }])

    .directive('dreamfactoryGuestUsersConfig', ['MODSYSCONFIG_ASSET_PATH',
        function (MODSYSCONFIG_ASSET_PATH) {

            return {
                restrict: 'E',
                templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/guest-users-config.html',
                scope: true
            }
        }])

    .directive('dreamfactoryOpenRegistrationConfig', ['MODSYSCONFIG_ASSET_PATH', function(MODSYSCONFIG_ASSET_PATH) {

        return {
            restrict: 'E',
            templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/open-registration-config.html',
            scope: true
        }
    }])

    .directive('dreamfactoryUserInvitesConfig', ['MODSYSCONFIG_ASSET_PATH', function(MODSYSCONFIG_ASSET_PATH) {

        return {
            restrict: 'E',
            templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/user-invites-config.html',
            scope: true

        }
    }])

    .directive('dreamfactoryPasswordResetConfig', ['MODSYSCONFIG_ASSET_PATH', function(MODSYSCONFIG_ASSET_PATH) {

        return {

            restrict: 'E',
            templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/password-reset-config.html',
            scope: true

        }


    }])

    .directive('dreamfactoryEmailTemplates', ['MODSYSCONFIG_ASSET_PATH', 'dfApplicationData', 'dfNotify', function(MODSYSCONFIG_ASSET_PATH, dfApplicationData, dfNotify) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/email-templates.html',
            link: function (scope, elem, attrs) {



                var EmailTemplate = function (emailTemplateData) {

                    function genTempId () {
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
                            module: 'Config',
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
                                module: 'Config',
                                type: 'warn',
                                provider: 'dreamfactory',
                                message: 'Email templates should have a unique name.  Please rename your email template to something other than the default \'new\' template name.'
                            };

                            dfNotify.warn(messageOptions);

                            return;
                        }
                        scope._saveEmailTemplate(template);
                    }else {

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

                    scope.selectedEmailTemplate = scope.emailTemplates[scope.emailTemplates.length -1];
                };

                scope._deleteEmailTemplate = function () {


                    // If this is a recently add/new template that hasn't been saved yet.
                    if (scope.selectedEmailTemplate.__dfUI.newTemplate) {

                        var i = 0;

                        while (i < scope.emailTemplates.length) {
                            if(scope.emailTemplates[i].__dfUI.tempId === scope.selectedEmailTemplate.__dfUI.tempId) {
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

                var watchdfApplicationData = scope.$watchCollection(function () {return dfApplicationData.getApiData('email_template')}, function(newValue, oldValue) {

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

    .directive('dreamfactoryGlobalLookupKeysConfig', ['MODSYSCONFIG_ASSET_PATH', function(MODSYSCONFIG_ASSET_PATH) {

        return {
            restrict: 'E',
            templateUrl: MODSYSCONFIG_ASSET_PATH + 'views/global-lookup-keys-config.html',
            scope: false,
            link: function (scope, elem, attrs) {


                var LookupKey = function (lookupKeyData) {

                    var _new = {
                        name: "",
                        value: "",
                        private: false
                    };


                    return {
                        __dfUI: {
                            unique: true
                        },
                        record: angular.copy(lookupKeyData || _new),
                        recordCopy: angular.copy(lookupKeyData || _new)
                    };
                }

                scope.lookupKeys = [];

                scope.sameKeys = [];


                // PUBLIC API
                scope.newKey = function () {

                    scope._newKey();
                };

                scope.removeKey = function(index) {

                    scope._removeKey(index);
                };



                // PRIVATE API

                scope._isUniqueKey = function () {

                    scope.sameKeys = [];

                    angular.forEach(scope.lookupKeys, function(value, index) {
                        angular.forEach(scope.lookupKeys, function (_value, _index) {

                            if (index === _index) return;

                            if (value.record.name === _value.record.name) {
                                scope.sameKeys.push(value);
                            }
                        })
                    });

                }

                scope._prepareLookupKeyData = function () {

                    var tempArr = [];

                    angular.forEach(scope.lookupKeys, function (lk) {

                        tempArr.push(lk.record);
                    });

                    scope.systemConfig.record.lookup_keys = tempArr;
                };




                // COMPLEX IMPLEMENTATION
                scope._newKey = function () {

                    scope.lookupKeys.push(new LookupKey());

                };

                scope._removeKey = function (index) {

                    scope.lookupKeys.splice(index, 1);
                };



                // WATCHERS AND INIT
                var watchUser = scope.$watch('systemConfig', function (newValue, oldValue) {

                    if (!newValue) return;

                    if (newValue.record.hasOwnProperty('lookup_keys') && newValue.record.lookup_keys.length > 0) {

                        scope.lookupKeys = [];

                        angular.forEach(newValue.record.lookup_keys, function (lookupKeyData) {

                            scope.lookupKeys.push(new LookupKey(lookupKeyData))

                        });
                    }
                });

                var watchSameKeys = scope.$watch('sameKeys', function (newValue, oldValue) {


                    if (newValue.length === 0) {

                        angular.forEach(scope.lookupKeys, function (lk) {

                            lk.__dfUI.unique = true;

                        })

                        return;
                    }


                    angular.forEach(scope.lookupKeys, function (lk) {

                        angular.forEach(newValue, function (_lk) {

                            if (lk.record.name === _lk.record.name) {
                                lk.__dfUI.unique = false;


                            }else {
                                lk.__dfUI.unique = true;
                            }
                        })
                    })
                })

                var watchLookupKeys = scope.$watchCollection('lookupKeys', function (newValue, oldValue) {

                    if (!newValue) return;

                    // we added or removed a key
                    // check if unique
                    scope._isUniqueKey();


                })


                // MESSAGES
                scope.$on('$destroy', function (e) {
                    watchUser();
                    watchSameKeys();
                    watchLookupKeys();
                });
            }
        }
    }])

    .directive('dfEditPreferences', ['MODSYSCONFIG_ASSET_PATH', 'dfApplicationData', 'dfApplicationPrefs', 'dfPrefFactory', 'dfNotify', function(MODSYSCONFIG_ASSET_PATH, dfApplicationData, dfApplicationPrefs, dfPrefFactory, dfNotify) {

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

                    angular.forEach(value, function(_value, _key) {

                        scope.prefs[key][_key] = [];

                        angular.forEach(_value, function(__value, __key) {

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

                        angular.forEach(value, function(_value, _key) {

                            _prefs[key][_key] = {};

                            angular.forEach(_value, function(obj) {

                                _prefs[key][_key][obj.key] = obj.value;
                            })
                        })
                    })

                    return _prefs;
                }



                scope._savePrefs = function () {

                    var requestDataObj = scope._formatPrefs();

                    scope._savePrefsToServer(requestDataObj).then(
                        function(result) {



                            var messageOptions = {
                                module: 'Preferences',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Preferences saved.'
                            };

                            dfNotify.success(messageOptions);

                            dfApplicationPrefs.setPrefs(requestDataObj);

                        },
                        function(reject) {

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


            switch(Object.prototype.toString.call(value)) {

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

    .service('SystemConfigEventsService', [function() {

        return {
            systemConfigController: {
                updateSystemConfigRequest: 'update:systemconfig:request',
                updateSystemConfigSuccess: 'update:systemconfig:success',
                updateSystemConfigError: 'update:systemconfig:error'
            }
        }
    }])

    .service('SystemConfigDataService', ['DSP_URL', function (DSP_URL) {

        var systemConfig = {};

        function _getSystemConfigFromServerSync() {

            var xhr;

            if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
                xhr = new XMLHttpRequest();
            } else {// code for IE6, IE5
                xhr = new ActiveXObject("Microsoft.XMLHTTP");
            }

            xhr.open("GET", DSP_URL + '/api/v2/system/config', false);
            xhr.setRequestHeader("X-DreamFactory-Application-Name", "admin");
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
