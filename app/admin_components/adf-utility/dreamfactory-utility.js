'use strict';


angular.module('dfUtility', ['dfApplication'])

    // Set a constant so we can access the 'local' path of our assets
    .constant('MOD_UTILITY_ASSET_PATH', 'admin_components/adf-utility/')

    // declare our directive and pass in our constant
    .directive('dfComponentTitle', ['MOD_UTILITY_ASSET_PATH', '$location', function (MOD_UTILITY_ASSET_PATH, $location) {

        return {

            // Only allow this directive to be used as an element
            restrict: 'E',

            replace: true,

            scope: false,

            template: '<h1 class="df-component-nav-title pull-left">{{$parent.title}}</h1>'
        }
    }])

    // declare our directive and pass in our constant
    .directive('dfTopLevelNavStd', ['MOD_UTILITY_ASSET_PATH', '$location', 'UserDataService', function (MOD_UTILITY_ASSET_PATH, $location, UserDataService) {

        return {

            // Only allow this directive to be used as an element
            restrict: 'E',

            // Use an isolate scope
            scope: {

                // pass in our links.  This will be an array of link objects
                options: '=?'
            },

            // tell the directive where our template is
            templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-top-level-nav-std.html',

            // link it all together.  We'll be putting some business logic in here to
            // handle updating the active link
            link: function (scope, elem, attrs) {

                scope.links = scope.options.links;
                scope.activeLink = null;

                scope.$watch(function() { return $location.path()}, function(newValue, oldValue) {

                    switch(newValue) {

                        case '/home':
                        case '/apps':
                        case '/admins':
                        case '/users':
                        case '/roles':
                        case '/services':
                        case '/schema':
                        case '/data':
                        case '/file-manager':
                        case '/scripts':
                        case '/config':
                        case '/package-manager':
                        case '/apidocs':
                        case '/downloads':

                            scope.activeLink = 'admin';
                            break;

                        case '/launchpad':
                            scope.activeLink = 'launchpad';
                            break;

                        case '/profile':
                            scope.activeLink = 'profile';
                            break;

                        case '/login':
                            scope.activeLink = 'login';
                            break;

                        case '/register':
                        case '/register-complete':
                        case '/register-confirm':
                            scope.activeLink = 'register';
                            break;



                    }
                })

            }
        }
    }])

    // declare our directive and pass in our constant
    .directive('dfComponentNav', ['MOD_UTILITY_ASSET_PATH', '$location', '$rootScope', function (MOD_UTILITY_ASSET_PATH, $location, $rootScope) {

        return {

            // Only allow this directive to be used as an element
            restrict: 'E',

            // Use an isolate scope
            scope: {

                // pass in our links.  This will be an array of link objects
                options: '=?'
            },

            // tell the directive where our template is
            templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-component-nav.html',

            // link it all together.  We'll be putting some business logic in here to
            // handle updating the active link
            link: function (scope, elem, attrs) {


                scope.activeLink = null;

                scope.links = scope.options.links;
                scope.toggleMenu = false;


                // PUBLIC API
                scope.openMenu = function () {

                    scope._openMenu();
                };

                scope.closeMenu = function () {

                    scope._closeMenu();
                };


                // COMPLEX IMPLEMENTATION
                scope._openMenu = function () {

                    scope.toggleMenu = true;
                };

                scope._closeMenu = function () {

                    scope.toggleMenu = false;
                };



                // WATCHERS
                scope.$watch('toggleMenu', function (n, o) {

                    if (n == true) {
                        $('#component-nav-flyout-mask').fadeIn(250);
                        $('#top-bar-mask').fadeIn(250);


                        $('#dreamfactoryApp').css({
                            position: 'fixed',
                            right: '0',
                            left: '0'
                        }).animate({
                            right: '+=300',
                            left: '-=300'
                        }, 250, function() {});

                        $('#component-nav-flyout-menu').animate({
                            right: '+=300'
                        }, 250, function() {});


                        return;
                    }

                    if (n === false && o) {

                        $('#dreamfactoryApp').animate({
                            right: '-=300',
                            left: '+=300'
                        }, 250, function() {})

                        $('#component-nav-flyout-menu').animate({
                            right: '-=300'
                        }, 250, function() {});


                        $('#dreamfactoryApp').css('position', 'relative');


                        $('#component-nav-flyout-mask').fadeOut(250);
                        $('#top-bar-mask').fadeOut(250);

                        return;
                    }
                });

                scope.$watch(function() { return $location.path()}, function(newValue, oldValue) {

                   if (!newValue) {
                       scope.activeLink = null;
                       return;
                   }

                    scope.activeLink = newValue.substr(1, newValue.length);
                });


                // MESSAGES
                $rootScope.$on('$routeChangeSuccess', function(e) {

                    // scope.activePath = $location.$$path;
                    scope.$broadcast('component-nav:view:change');
                    scope._closeMenu();

                });
            }
        }
    }])

    // declare our directive and pass in our constant
    .directive('dfSidebarNav', ['MOD_UTILITY_ASSET_PATH', '$rootScope', '$location', function (MOD_UTILITY_ASSET_PATH, $rootScope, $location) {

        return {

            // Only allow this directive to be used as an element
            restrict: 'E',

            // Inherit from parent scope
            scope: false,

            // tell the directive where our template is
            templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-sidebar-nav.html',

            // link it all together.  We'll be putting some business logic in here to
            // handle updating the active link
            link: function (scope, elem, attrs) {


                scope.activeView = scope.links[0];
                scope.toggleMenu = false;


                // PUBLIC API

                scope.setActiveView = function (linkObj) {

                    scope._setActiveView(linkObj)
                };

                scope.openMenu = function () {

                    scope._openMenu();
                };

                scope.closeMenu = function () {

                    scope._closeMenu();
                };


                // COMPLEX IMPLEMENTATION

                scope._setActiveView = function (linkObj) {

                    scope.activeView = linkObj;
                    scope._closeMenu();
                    scope.$broadcast('sidebar-nav:view:change');
                };

                scope._openMenu = function () {

                    scope.toggleMenu = true;
                };

                scope._closeMenu = function () {

                    scope.toggleMenu = false;
                };


                // WATCHERS
                scope.$watch('toggleMenu', function (n, o) {

                    if (n == true) {

                        $('#sidebar-nav-flyout-mask').css('z-index', 10).fadeIn(250);
                        $('#top-bar-mask').fadeIn(250);


                        $('#dreamfactoryApp').css({
                            position: 'fixed',
                            right: '0',
                            left: '0'
                        }).animate({
                            right: '-=300',
                            left: '+=300'
                        }, 250, function() {});


                        $('#sidebar-nav-flyout-menu').animate({
                            left: '+=300'
                        }, 250, function() {});

                        return;
                    }

                    if (n === false && o) {

                        $('#dreamfactoryApp').animate({
                            right: '+=300',
                            left: '-=300'
                        }, 250, function() {});

                        $('#sidebar-nav-flyout-menu').animate({
                            left: '-=300'
                        }, 250, function() {});

                        $('#dreamfactoryApp').css('position', 'relative');


                        $('#sidebar-nav-flyout-mask').fadeOut(250);
                        $('#top-bar-mask').fadeOut(250);
                        return;
                    }
                });

                scope.$watch('activeView', function (newValue, oldValue) {

                    if (!newValue) return false;

                    oldValue.active = false;
                    newValue.active = true;
                });


                // Have to set margin for title when this directive loads.
                // or resizes
                // Probably a better way
                function setMargin(location) {

                    switch(location) {

                        case '/schema':
                        case '/data':
                        case '/file-manager':
                        case '/scripts':
                        case '/apidocs':
                        case '/package-manager':
                        case '/downloads':

                            $('.df-component-nav-title').css({
                                marginLeft: 0
                            })
                            break;

                        case '/home':
                        case '/apps':
                        case '/admins':
                        case '/users':
                        case '/roles':
                        case '/services':
                        case '/config':

                            var _elem = $(document).find('#sidebar-open');

                            if (_elem && _elem.is(':visible')) {
                                $('.df-component-nav-title').css({
                                    marginLeft: 45 + 'px'
                                });
                            }
                            else {
                                $('.df-component-nav-title').css({
                                    marginLeft: 0
                                });
                            }
                            break;
                    }
                }

                $(window).resize(function () {

                    setMargin($location.path());
                });

                scope.$watch(function() { return $location.path()}, function(newValue, oldValue) {

                    setMargin(newValue);
                });


            }
        }
    }])

    // Need to fix this directive.  Kind of does what we want currently though
    .directive('dreamfactoryAutoHeight', ['$window', '$route', function ($window) {

        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {
                // Return jQuery window ref
                scope._getWindow = function () {
                    return $(window);
                };

                // Return jQuery document ref
                scope._getDocument = function () {
                    return $(document);
                };

                // Return jQuery window or document.  If neither just return the
                // string value for the selector engine
                scope._getParent = function (parentStr) {
                    switch (parentStr) {
                        case 'window':
                            return scope._getWindow();
                            break;

                        case 'document':
                            return scope._getDocument();
                            break;

                        default:
                            return $(parentStr);
                    }
                };

                // TODO: Element position/offset out of whack on route change.  Set explicitly.  Not the best move.
                scope._setElementHeight = function () {
                    angular.element(elem).css({height: scope._getParent(attrs.autoHeightParent).height() - 200 - attrs.autoHeightPadding});

                    /*console.log(scope._getParent(attrs.autoHeightParent).height());
                     console.log($(elem).offset().top)
                     console.log(angular.element(elem).height())*/
                };

                scope._setElementHeight();

                // set height on resize
                angular.element($window).on(
                    'resize', function () {
                        scope._setElementHeight();
                    }
                );
            }
        }
    }])

    // Another shot a resize.  I think the was ripped off of the internet
    .directive('resize', [function ($window) {
        return function (scope, element) {
            var w = angular.element($window);

            scope.getWindowDimensions = function () {
                return {'h': w.height(), 'w': w.width()};
            };

            scope.$watch(
                scope.getWindowDimensions, function (newValue, oldValue) {
                    scope.windowHeight = newValue.h;
                    scope.windowWidth = newValue.w;

                    angular.element(element).css(
                        {
                            width: (
                                newValue.w - angular.element('sidebar').css('width')
                                ) + 'px'
                        }
                    );

                    /*scope.style = function () {
                     return {
                     'height': (newValue.h - 100) + 'px',
                     'width': (newValue.w - 100) + 'px'
                     };
                     };*/

                }, true
            );

            /* w.bind('resize', function () {
             scope.$apply();
             });*/
        }
    }])

    // Used for setting the section heights
    .directive('dfFsHeight', ['$window', '$rootScope', function ($window, $rootScope) {

        return function (scope, elem, attrs) {

            var setSize = function () {


                var _elem = $(elem),
                    winHeight = $(window).height(),
                    winWidth = $(window).width();

                // If this is the swagger iframe
                if (_elem.is('#swagger')) {

                    _elem.attr('height', winHeight - 200 + 'px');
                }
                // If this is the swagger iframe
                else if (_elem.is('#file-manager')) {

                    _elem.attr('height', winHeight - 130 + 'px');
                    $rootScope.$emit('filemanager:sized');
                }
                else if (_elem.is('#scripting-sidebar-list')) {

                    _elem.css('height', winHeight - 280 + 'px');
                }

                // if this is the scripting ide
                else if (_elem.attr('id') === 'ide') {

                    _elem.css({
                        height: winHeight - 280 + 'px'
                    })
                }

                else if (_elem.hasClass('package-export-table')) {

                    _elem.css({
                        height: winHeight - 600
                    })
                }

                // else
                else {
                    if (winWidth >= 992) {
                        $(elem).css({
                            height:  winHeight - 120
                        })
                    }
                    else {
                        $(elem).css({
                            height: 'auto'
                        })
                    }
                }
            }

            // Respond to swagger loaded
            scope.$on('apidocs:loaded', function (e) {

                setSize();
            });

            // Respond to file manager loaded
            scope.$on('filemanager:loaded', function (e) {

                setSize();
            });

            // Respond to scripts loaded
            // @TODO: This does not work.  Fires but no elem?????
            scope.$on('script:loaded:success', function (e) {

                setSize();
            });


            // Respond to sidebar change
            scope.$on('sidebar-nav:view:change', function (e) {

               setSize();
            });

            // Respond to component nav change
            scope.$on('sidebar-nav:view:change', function (e) {

                setSize();
            });

            // Respond to component nav change
            $rootScope.$on('$routeChangeSuccess', function (e) {

                setSize();
            });

            $(document).ready(function () {

                setSize();
            });

            // Bind to resize
           $(window).on('resize', function () {

               setSize();
           })


        }
    }])

    // Used anywhere a admin/user has the ability to select what REST verbs to allow
    .directive('dfVerbPicker', [
        'MOD_UTILITY_ASSET_PATH', function (DF_UTILITY_ASSET_PATH) {

            return {
                restrict: 'E',
                scope: {
                    allowedVerbs: '=?',
                    allowedVerbMask: '=?',
                    description: '=?',
                    size: '@'
                },
                templateUrl: DF_UTILITY_ASSET_PATH + 'views/df-verb-picker.html',
                link: function (scope, elem, attrs) {

                    scope.verbs = {
                        GET: {name: 'GET', active: false, description: ' (read)', mask: 1},
                        POST: {name: 'POST', active: false, description: ' (create)', mask: 2},
                        PUT: {name: 'PUT', active: false, description: ' (replace)', mask: 4},
                        PATCH: {name: 'PATCH', active: false, description: ' (update)', mask: 8},
                        DELETE: {name: 'DELETE', active: false, description: ' (remove)', mask: 16}
                    };

                    scope.btnText = 'None Selected';
                    scope.description = true;

                    scope._setVerbState = function (nameStr, stateBool) {
                        var verb = scope.verbs[nameStr];
                        if (scope.verbs.hasOwnProperty(verb.name)) {
                            scope.verbs[verb.name].active = stateBool;
                        }
                    };

                    scope._toggleVerbState = function (nameStr, event) {
                        event.stopPropagation();

                        if (scope.verbs.hasOwnProperty(scope.verbs[nameStr].name)) {
                            scope.verbs[nameStr].active = !scope.verbs[nameStr].active;
                            scope.allowedVerbMask = scope.allowedVerbMask ^ scope.verbs[nameStr].mask;
                        }

                        scope.allowedVerbs = [];

                        angular.forEach(
                            scope.verbs, function (_obj) {
                                if (_obj.active) {
                                    scope.allowedVerbs.push(_obj.name);
                                }

                            }
                        );
                    };

                    scope._isVerbActive = function (verbStr) {

                        return scope.verbs[verbStr].active
                    };

                    scope._setButtonText = function () {

                        var verbs = [];

                        angular.forEach(scope.verbs, function (verbObj) {

                            if (verbObj.active) {
                                verbs.push(verbObj.name);
                            }

                        })

                        scope.btnText = '';

                        var max = 1;
                        if (verbs.length == 0) {
                            scope.btnText = 'None Selected';

                        } else if (verbs.length > 0 && verbs.length <= max) {

                            angular.forEach(
                                verbs, function (_value, _index) {
                                    if (scope._isVerbActive(_value)) {
                                        if (_index != verbs.length - 1) {
                                            scope.btnText +=
                                                (
                                                    _value + ', '
                                                    );
                                        } else {
                                            scope.btnText += _value
                                        }
                                    }
                                }
                            )

                        } else if (verbs.length > max) {
                            scope.btnText = verbs.length + ' Selected';
                        }
                    };

                    scope.$watch('allowedVerbs', function (newValue, oldValue) {

                        if (!newValue) {
                            return false;
                        }

                        Object.keys(scope.verbs).forEach(function (key) {
                            scope._setVerbState(key, false);
                        });
                        
                        angular.forEach(
                            scope.allowedVerbs, function (_value, _index) {

                                scope._setVerbState(_value, true);
                            }
                        );

                        scope._setButtonText();

                    });

                    scope.$watch('allowedVerbMask', function (n, o) {

                        if (n == null && n == undefined) return false;

                        angular.forEach(scope.verbs, function (verbObj) {

                            if (n & verbObj.mask) {
                                verbObj.active = true;
                            }
                        });

                        scope._setButtonText();
                    });

                    elem.css({
                        'display': 'inline-block', 'position': 'relative'
                    });

                }
            }
        }
    ])

    // Sets requestor in service/system accesses
    .directive('dfRequestorPicker', [
        'MOD_UTILITY_ASSET_PATH', function (DF_UTILITY_ASSET_PATH) {

            return {
                restrict: 'E',
                scope: {
                    allowedRequestors: '=?',
                    allowedRequestorMask: '=?',
                    size: '@'
                },
                templateUrl: DF_UTILITY_ASSET_PATH + 'views/df-requestor-picker.html',
                link: function (scope, elem, attrs) {

                    scope.requestors = {
                        API: {name: 'API', active: false, mask: 1},
                        SCRIPT: {name: 'SCRIPT', active: false, mask: 2}
                    };

                    scope.btnText = 'None Selected';

                    scope._setRequestorState = function (nameStr, stateBool) {
                        var requestor = scope.requestors[nameStr];
                        if (scope.requestors.hasOwnProperty(requestor.name)) {
                            scope.requestors[requestor.name].active = stateBool;
                        }
                    };

                    scope._toggleRequestorState = function (nameStr, event) {
                        event.stopPropagation();

                        if (scope.requestors.hasOwnProperty(scope.requestors[nameStr].name)) {
                            scope.requestors[nameStr].active = !scope.requestors[nameStr].active;
                            scope.allowedRequestorMask = scope.allowedRequestorMask ^ scope.requestors[nameStr].mask;
                        }

                        scope.allowedRequestors = [];

                        angular.forEach(
                            scope.requestors, function (_obj) {
                                if (_obj.active) {
                                    scope.allowedRequestors.push(_obj.name);
                                }
                            }
                        );
                    };

                    scope._isRequestorActive = function (requestorStr) {

                        return scope.requestors[requestorStr].active
                    };

                    scope._setButtonText = function () {

                        var requestors = [];

                        angular.forEach(scope.requestors, function (rObj) {

                            if (rObj.active) {
                                requestors.push(rObj.name);
                            }
                        });

                        scope.btnText = '';

                        if (requestors.length == 0) {
                            scope.btnText = 'None Selected';

                        } else {

                            angular.forEach(
                                requestors, function (_value, _index) {
                                    if (scope._isRequestorActive(_value)) {
                                        if (_index != requestors.length - 1) {
                                            scope.btnText +=
                                                (
                                                    _value + ', '
                                                    );
                                        } else {
                                            scope.btnText += _value
                                        }
                                    }
                                }
                            )

                        }
                    };

                    scope.$watch('allowedRequestors', function (newValue, oldValue) {

                        if (!newValue) {
                            return false;
                        }

                        angular.forEach(
                            scope.allowedRequestors, function (_value, _index) {

                                scope._setRequestorState(_value, true);
                            }
                        );

                        scope._setButtonText();

                    });

                    scope.$watch('allowedRequestorMask', function (n, o) {

                        if (n == null && n == undefined) return false;

                        angular.forEach(scope.requestors, function (requestorObj) {

                            if (n & requestorObj.mask) {
                                requestorObj.active = true;
                            }
                        });

                        scope._setButtonText();
                    });

                    elem.css(
                        {
                            'display': 'inline-block', 'position': 'absolute'
                        }
                    );

                }
            }
        }
    ])

    // Displays select box for dreamfactory services
    .directive('dfServicePicker', [
        'MOD_UTILITY_ASSET_PATH', 'INSTANCE_URL', '$http', function (MOD_UTILITY_ASSET_PATH, INSTANCE_URL, $http) {

            return {
                restrict: 'E',
                scope: {
                    services: '=?',
                    selected: '=?'
                },
                templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-service-picker.html', link: function (scope, elem, attrs) {

                    scope.resources = [];
                    scope.activeResource = null;
                    scope.activeService = null;

                    // PUBLIC API
                    scope.setServiceAndResource = function () {

                        if (scope._checkForActive()) {
                            scope._setServiceAndResource();
                        }
                    };

                    // PRIVATE API
                    scope._getResources = function () {
                        return $http(
                            {
                                method: 'GET', url: INSTANCE_URL + '/api/v2/' + scope.activeService
                            }
                        )
                    };

                    // COMPLEX IMPLEMENTATION
                    scope._setServiceAndResource = function () {
                        scope.selected = {
                            service: scope.activeService, resource: scope.activeResource
                        };
                    };

                    scope._checkForActive = function () {

                        return !!scope.activeResource && scope.activeService;
                    };

                    // WATCHERS AND INIT
                    scope.$watch(
                        'activeService', function (newValue, oldValue) {

                            if (!newValue) {
                                scope.resources = [];
                                scope.activeResource = null;
                                return false;
                            }

                            scope.resources = [];

                            scope._getResources().then(
                                function (result) {

                                    scope.resources = result.data.resource;
                                },

                                function (reject) {
                                    throw {
                                        module: 'DreamFactory Utility Module', type: 'error', provider: 'dreamfactory', exception: reject
                                    }
                                }
                            )
                        }
                    );

                    // MESSAGES
                }
            }
        }
    ])

    // Displays table select box for dreamfactory database services
    .directive('dfDbTablePicker', [
        'MOD_UTILITY_ASSET_PATH', 'INSTANCE_URL', '$http', 'dfApplicationData', function (MOD_UTILITY_ASSET_PATH, INSTANCE_URL, $http, dfApplicationData) {

            return {
                restrict: 'E',
                scope: {
                    services: '=?',
                    selected: '=?'
                },
                templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-db-table-picker.html', link: function (scope, elem, attrs) {

                    scope.resources = [];
                    scope.activeResource = null;
                    scope.activeService = null;

                    // PUBLIC API
                    scope.setServiceAndResource = function () {

                        if (scope._checkForActive()) {
                            scope._setServiceAndResource();
                        }
                    };

                    // PRIVATE API
                    scope._getResources = function () {
                        return dfApplicationData.getServiceComponents(scope.activeService, INSTANCE_URL + '/api/v2/' + scope.activeService + '/_table/',  {params: {fields: 'name,label'}})
                    };

                    // COMPLEX IMPLEMENTATION
                    scope._setServiceAndResource = function () {
                        scope.selected = {
                            service: scope.activeService, resource: scope.activeResource
                        };
                    };

                    scope._checkForActive = function () {

                        return !!scope.activeResource && scope.activeService;
                    };

                    // WATCHERS AND INIT
                    scope.$watch(
                        'activeService', function (newValue, oldValue) {

                            if (!newValue) {
                                scope.resources = [];
                                scope.activeResource = null;
                                return false;
                            }

                            scope.resources = [];

                            scope._getResources().then(
                                function (result) {

                                    scope.resources = result;
                                },

                                function (reject) {
                                    throw {
                                        module: 'DreamFactory Utility Module', type: 'error', provider: 'dreamfactory', exception: reject
                                    }
                                }
                            )
                        }
                    );

                    // MESSAGES
                }
            }
        }
    ])

    // Displays schema table select box for dreamfactory database services
    .directive('dfDbSchemaPicker', [
        'MOD_UTILITY_ASSET_PATH', 'INSTANCE_URL', '$http', function (MOD_UTILITY_ASSET_PATH, INSTANCE_URL, $http) {

            return {
                restrict: 'E',
                scope: {
                    services: '=?',
                    selected: '=?'
                },
                templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-db-schema-picker.html', link: function (scope, elem, attrs) {

                    scope.resources = [];
                    scope.activeResource = null;
                    scope.activeService = null;

                    // PUBLIC API
                    scope.setServiceAndResource = function () {

                        if (scope._checkForActive()) {
                            scope._setServiceAndResource();
                        }
                    };

                    // PRIVATE API
                    scope._getResources = function () {
                        return $http(
                            {
                                method: 'GET', url: INSTANCE_URL + '/api/v2/' + scope.activeService + '/_schema/'
                            }
                        )
                    };

                    // COMPLEX IMPLEMENTATION
                    scope._setServiceAndResource = function () {
                        scope.selected = {
                            service: scope.activeService, resource: scope.activeResource
                        };
                    };

                    scope._checkForActive = function () {

                        return !!scope.activeResource && scope.activeService;
                    };

                    // WATCHERS AND INIT
                    scope.$watch(
                        'activeService', function (newValue, oldValue) {

                            if (!newValue) {
                                scope.resources = [];
                                scope.activeResource = null;
                                return false;
                            }

                            scope.resources = [];

                            scope._getResources().then(
                                function (result) {

                                    scope.resources = result.data.resource;
                                },

                                function (reject) {
                                    throw {
                                        module: 'DreamFactory Utility Module', type: 'error', provider: 'dreamfactory', exception: reject
                                    }
                                }
                            )
                        }
                    );

                    // MESSAGES
                }
            }
        }
    ])

    // Creates an Ace Editor.  Currently specific to scripting and service definition stuff.
    .directive('dfAceEditor', ['INSTANCE_URL', 'MOD_UTILITY_ASSET_PATH', '$http', '$compile', function (INSTANCE_URL, MOD_UTILITY_ASSET_PATH, $http, $compile) {

        return {
            restrict: 'E',
            scope: {
                directData: '=?',
                currentEditor: '=?',
                serviceName: '=?',
                fileName: '=?',
                filePath: '=?',
                isUserCustom: '=?',
                isClean: '=?',
                isEditable: '=?'
            },
            templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-ace-editor.html',
            link: function (scope, elem, attrs) {


                var _elem = $(elem),
                    _rand = Math.floor((Math.random() * 100) + 1);

                _elem.children('.ide-attach').append($compile('<div id="ide_' + _rand + '" class="df-fs-height" style="height:400px"></div>')(scope))

                scope.editor = null;
                scope.currentScriptObj = '';
                scope.backupDoc = '';



                // PRIVATE API
                scope._getFileFromServer = function (requestDataObj) {

                    return $http({
                        method: 'GET',
                        url: INSTANCE_URL + '/rest' + requestDataObj.serviceName + '/' + requestDataObj.fileName,
                        cache: false,
                        params: requestDataObj.params
                    })
                };

                scope._saveFileOnServer = function (requestDataObj) {

                    return $http({
                        method: 'PUT',
                        url: INSTANCE_URL + '/rest' + requestDataObj.serviceName + '/' + requestDataObj.fileName,
                        headers: {
                            'Content-Type': 'text/plain'
                        },
                        data: {
                            post_body: requestDataObj.body
                        }
                    })
                };

                scope._deleteFileOnServer = function (requestDataObj) {

                    return $http({

                        method: 'DELETE',
                        url: INSTANCE_URL + '/rest' + requestDataObj.serviceName + '/' + requestDataObj.fileName,
                        params: {
                            script_id:requestDataObj.scriptId
                        }
                    })
                };

                scope._setEditorInactive = function (stateBool) {

                    if (stateBool) {

                        scope.editor.setOptions({
                            readOnly: true,
                            highlightActiveLine: false,
                            highlightGutterLine: false
                        })
                        scope.editor.renderer.$cursorLayer.element.style.opacity=0;
                    }else {
                        scope.editor.setOptions({
                            readOnly: false,
                            highlightActiveLine: true,
                            highlightGutterLine: true
                        })
                        scope.editor.renderer.$cursorLayer.element.style.opacity=100;
                    }
                };

                scope._loadEditor = function (contents, mode, inactive) {

                    inactive = inactive || false;



                    scope.editor = ace.edit('ide_' + _rand);

                    //scope.editor.setTheme("ace/theme/twilight");

                    if(mode){
                        scope.editor.session.setMode("ace/mode/json");
                    }else{
                        scope.editor.session.setMode("ace/mode/javascript");
                    }

                    scope._setEditorInactive(inactive);

                    scope.editor.session.setValue(contents);

                    scope.editor.focus();

                    scope.editor.on('input', function() {
                        scope.$apply(function() {
                            scope.isClean = scope.editor.session.getUndoManager().isClean();
                        });
                    });
                };

                scope._cleanEditor = function () {

                    scope.editor.session.getUndoManager().reset();
                    scope.editor.session.getUndoManager().markClean();
                };


                // WATCHERS AND INIT
                var watchScriptFileName = scope.$watch('fileName', function (newValue, oldValue) {

                    if (newValue === 'samples') return false;

                    if (!newValue) {
                        scope._loadEditor('', false, true);
                        return false;
                    }

                    var requestDataObj = {
                        serviceName: scope.serviceName,
                        fileName: newValue,
                        params: {
                            // is_user_script: scope.isUserCustom,
                            // include_body: true,
                            include_body: true
                        }
                    };

                    scope._getFileFromServer(requestDataObj).then(
                        function(result) {

                            scope.currentScript = result.data;
                            scope._loadEditor(result.data.script_body, false);
                        },
                        function(reject) {

                            scope._loadEditor('', false);
                        }
                    )
                });

                var watchDirectData = scope.$watch('directData', function (newValue, oldValue) {

                    if (!newValue) {
                        scope._loadEditor('', false, true);
                        return false;
                    }

                    // Format JSON
                    newValue = angular.fromJson(newValue);
                    newValue = angular.toJson(newValue, true);

                    scope._loadEditor(newValue, true, !scope.isEditable);
                    scope.backupDoc = angular.copy(newValue);
                    scope.currentEditor = scope.editor;

                }, true);


                // MESSAGES
                scope.$on('$destroy', function (e) {

                    watchScriptFileName();
                    watchDirectData();
                });

                scope.$on('save:script', function(e) {

                    var requestDataObj = {
                        serviceName: scope.serviceName,
                        fileName: scope.fileName,
                        body:  scope.editor.getValue() || " "
                    };

                    scope._saveFileOnServer(requestDataObj).then(
                        function(result) {

                            scope._cleanEditor();
                            // Needs to be replaced with angular messaging
                            $(function(){
                                new PNotify({
                                    title: 'Scripts',
                                    type:  'success',
                                    text:  'Script saved successfully.'
                                });
                            });

                        },
                        function(reject) {

                            throw {
                                module: 'DreamFactory System Config Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    )
                });

                scope.$on('delete:script', function (e) {

                    var requestDataObj = {
                        serviceName: scope.serviceName,
                        fileName: scope.fileName,
                        scriptId:  scope.currentScriptObj.script_id
                    };

                    scope._deleteFileOnServer(requestDataObj).then(
                        function(result) {

                            scope.editor.setValue('', false);
                            scope._cleanEditor();

                            $(function(){
                                new PNotify({
                                    title: 'Scripts',
                                    type:  'success',
                                    text:  'Script deleted successfully.'
                                });
                            });
                        },
                        function(reject) {

                            throw {
                                module: 'DreamFactory System Config Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    )
                });

                scope.$on('load:direct', function (e, dataObj) {

                    scope._loadEditor(dataObj, false);
                });

                scope.$on('reload:script', function (e, mode) {

                    scope._loadEditor(scope.backupDoc, mode);

                });

            }
        }
    }])

    // Helper for uploading a file.  Gets the file from an upload mechanism and sets
    // to an angular model
    .directive('fileModel', [
        '$parse', function ($parse) {
            return {
                restrict: 'A',
                scope: false,
                link: function (scope, element, attrs) {

                    var model = $parse(attrs.fileModel);
                    var modelSetter = model.assign;

                    element.on(
                        'change', function () {
                            scope.$apply(
                                function () {

                                    modelSetter(scope, element[0].files[0]);
                                }
                            );
                        }
                    );
                }
            };
        }
    ])

    .directive('fileModel2', [
        '$parse', function ($parse) {
            return {
                restrict: 'A',
                scope: false,
                link: function (scope, element, attrs) {

                    var model = $parse(attrs.fileModel);
                    var modelSetter = model.assign;

                    element.on(
                        'change', function () {
                            scope.$apply(
                                function () {

                                    modelSetter(scope, element[0].files[0]);
                                }
                            );
                        }
                    );
                }
            };
        }
    ])

    // Helper directive for tabbed interfaces
    .directive('showtab',[function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {

                element.click(function(e) {
                    e.preventDefault();
                    $(element).tab('show');
                });

                scope.activeTab = $(element).attr('id');
            }
        };
    }])

    // section tool bar for views
    .directive('dfSectionToolbar', ['MOD_UTILITY_ASSET_PATH', '$compile', function (MOD_UTILITY_ASSET_PATH, $compile) {


        return {
            restrict: 'E',
            scope: false,
            transclude: true,
            templateUrl : MOD_UTILITY_ASSET_PATH + 'views/df-toolbar.html',
            link: function (scope, elem, attrs) {




            }
        }
    }])

    // Adds view modes functionality for sections
    // ability to toggle between list, thumbnail, and table views of data
    .directive('dfToolbarViewModes', ['MOD_UTILITY_ASSET_PATH', function (MOD_UTILITY_ASSET_PATH) {


        return {
            restrict: 'E',
            scope: false,
            replace: true,
            templateUrl : MOD_UTILITY_ASSET_PATH + 'views/df-view-modes.html',
            link: function (scope, elem, attrs) {

                // Toolbar creates an unnecessary scope.
                // so we just bind to the $parent scope to bypass dfToolbar's scope
                scope = scope.$parent;

                scope.viewMode = ['list', 'thumbnails', 'table'];


                // PUBLIC API
                scope.toggleViewMode = function(mode) {
                    scope._toggleViewMode(mode);
                };


                // PRIVATE API
                scope._toggleViewMode = function(mode) {

                    scope.currentViewMode = scope.viewMode[mode];
                };


            }
        }
    }])

    // Used for section overview help
    .directive('dfToolbarHelp', ['MOD_UTILITY_ASSET_PATH', function (MOD_UTILITY_ASSET_PATH) {


        return {
            restrict: 'E',
            scope: false,
            replace: true,
            templateUrl : MOD_UTILITY_ASSET_PATH + 'views/df-toolbar-help.html',
            link: function (scope, elem, attrs) {

                // Toolbar creates an unnecessary scope.
                // so we just bind to the $parent scope to bypass dfToolbar's scope
                scope = scope.$parent;


            }
        }
    }])

    // Used for manage section pagination
    .directive('dfToolbarPaginate', ['MOD_UTILITY_ASSET_PATH', 'dfApplicationData', 'dfApplicationPrefs', 'dfNotify', '$location', function (MOD_UTILITY_ASSET_PATH, dfApplicationData, dfApplicationPrefs, dfNotify, $location) {


        return {
            restrict: 'E',
            scope: {
                api: '=',
                prepFunc: '=?'
            },
            replace: true,
            templateUrl : MOD_UTILITY_ASSET_PATH + 'views/df-toolbar-paginate.html',
            link: function (scope, elem, attrs) {

                scope.totalCount = dfApplicationData.getApiData(scope.api, 'meta').count;
                scope.pagesArr = [];
                scope.currentPage = {};
                scope.isInProgress = false;


                // PUBLIC API
                scope.getPrevious = function () {

                    if (scope._isFirstPage() || scope.isInProgress) {
                        return false;
                    } else {

                        scope._getPrevious();

                    }
                };

                scope.getNext = function () {

                    if (scope._isLastPage() || scope.isInProgress) {
                        return false;
                    } else {

                        scope._getNext();

                    }
                };

                scope.getPage = function (pageObj) {

                    scope._getPage(pageObj);
                }

                scope.prepFunc = function (data) {

                    return data;
                }



                // PRIVATE API

                // Data
                scope._getDataFromServer = function(offset) {

                    return dfApplicationData.getDataSetFromServer(scope.api, {
                        params: {
                            offset: offset,
                            include_count: true
                        }
                    }).$promise
                };


                // Pagination
                scope._calcTotalPages = function (totalCount, numPerPage) {

                    return Math.ceil(totalCount / numPerPage);
                };

                scope._createPageObj = function (_pageNum) {

                    return {
                        number: _pageNum + 1,
                        value: _pageNum,
                        offset: _pageNum * dfApplicationPrefs.getPrefs().data[scope.api].limit,
                        stopPropagation: false
                    }
                };

                scope._createPagesArr = function (_totalCount) {


                    scope.pagesArr = [];

                    for (var i = 0; i < _totalCount; i++) {

                        scope.pagesArr.push(scope._createPageObj(i));
                    }
                };

                scope._setCurrentPage = function (pageDataObj) {

                    scope.currentPage = pageDataObj;
                };

                scope._getCurrentPage = function () {

                    if (!scope.currentPage && scope.pagesArr.length > 0) {
                        scope.currentPage = scope.pagesArr[0];
                    } else if (!scope.currentPage && !scope.pagesArr.length) {

                        scope.pagesArr.push(scope._createPageObj(0));
                        scope.currentPage = scope.pagesArr[0];
                    }

                    return scope.currentPage;
                };

                scope._isFirstPage = function () {

                    return scope._getCurrentPage().value === 0;
                };

                scope._isLastPage = function () {

                    return scope.currentPage.value === scope.pagesArr.length - 1
                };

                scope._previousPage = function () {

                    scope.currentPage = scope.pagesArr[scope.currentPage.value - 1]
                };

                scope._nextPage = function () {

                    scope.currentPage = scope.pagesArr[scope.currentPage.value + 1]
                };

                scope._calcPagination = function (newValue) {

                    scope.pagesArr = [];

                    if (scope.totalCount == 0) {
                        scope.pagesArr.push(scope._createPageObj(0));
                        return false;
                    }

                    scope._createPagesArr(scope._calcTotalPages(scope.totalCount, dfApplicationPrefs.getPrefs().data[newValue].limit));
                };


                // COMPLEX IMPLEMENTATION
                scope._getPrevious = function () {

                    if (scope.isInProgress) return false;

                    scope.isInProgress = true;

                    var offset = scope.pagesArr[scope.currentPage.value - 1].offset

                    scope._getDataFromServer(offset).then(

                        function(result) {

                            scope.linkedData = scope.prepFunc({dataArr: result.record});
                            scope._previousPage();
                            scope.$emit('toolbar:paginate:' + scope.api + ':update');
                        },

                        function(reject) {

                            var messageOptions = {
                                module: 'DreamFactory Paginate Table',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            }

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function() {

                            scope.isInProgress = false;
                        }
                    )
                };

                scope._getNext = function () {

                    if (scope.isInProgress) return false;

                    scope.isInProgress = true;

                    var offset = scope.pagesArr[scope.currentPage.value + 1].offset

                    scope._getDataFromServer(offset).then(

                        function(result) {
                            scope.linkedData = scope.prepFunc({dataArr: result.record});
                            scope._nextPage();
                            scope.$emit('toolbar:paginate:' + scope.api + ':update');
                        },

                        function(reject) {
                            var messageOptions = {
                                module: 'DreamFactory Paginate Table',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            }

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function() {

                            scope.isInProgress = false;
                        }
                    )
                };

                scope._getPage = function (pageObj) {

                    if (scope.isInProgress) return false;

                    scope.isInProgress = true;

                    scope._getDataFromServer(pageObj.offset).then(

                        function(result) {

                            // scope.linkedData = scope.prepFunc({dataArr: result.record});
                            scope._setCurrentPage(pageObj);
                            scope.$emit('toolbar:paginate:' + scope.api + ':update');
                        },

                        function(reject) {

                            var messageOptions = {
                                module: 'DreamFactory Paginate Table',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            }

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function() {

                            scope.isInProgress = false;
                        }
                    )

                };

                // WATCHERS

                var watchApi = scope.$watch('api', function(newValue, oldValue) {

                    if (!newValue) return false;
                    scope._calcPagination(newValue);
                    scope._setCurrentPage(scope.pagesArr[0]);
                });

                // This is fired on $destroy in controllers that use this directive
                scope.$on('toolbar:paginate:' + scope.api + ':reset', function (e) {

                    // If we're logging out don't bother
                    // dfApplicationObj is being destroyed
                    if ($location.path() === '/logout') {
                        return;
                    }

                    // are we currently updating the model.
                    // yes.
                    if (scope.isInProgress) return false;


                    // We are about to update our data model.
                    // Block any more calls until we are done.
                    scope.isInProgress = true;

                    // We just want to reset back to the first page.
                    scope._getDataFromServer(0).then(
                        function(result) {

                            // reset everything.
                            scope.totalCount = dfApplicationData.getApiData(scope.api, 'meta').count;
                            scope._calcPagination(scope.api);
                            // scope.linkedData = scope.prepFunc({dataArr: result.record});
                            scope._setCurrentPage(scope.pagesArr[0]);

                            // We're done modifiying our data object and calcualting pagination
                            // if it was needed.  Let everyone know data is upto date.
                            scope.$emit('toolbar:paginate:' + scope.api + ':update');
                        },

                        function(reject) {

                            // There was an error
                            var messageOptions = {
                                module: 'DreamFactory Paginate Table',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            }

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function() {
                            // Stop our progress indicator
                            scope.isInProgress = false;
                        }
                    )
                });

                scope.$on('toolbar:paginate:' + scope.api + ':delete', function (e) {

                    // are we currently updating the model.
                    // yes.
                    if (scope.isInProgress) return;


                    // set up vars
                    var curOffset = scope.currentPage.offset,
                        recalcPagination = false;

                    // Are we on the last page and was the last record deleted
                    if (scope._isLastPage() && !dfApplicationData.getApiData(scope.api).length) {

                        // set var so we know to recalc our pagination
                        recalcPagination = true;

                        // We need to set the offset for pagination
                        if (scope.currentPage.number !== 1) {

                            // calc proper offset
                            curOffset = scope.currentPage.offset - dfApplicationPrefs.getPrefs().data[scope.api].limit
                        }
                    }

                    // We are about to update our data model.
                    // Block any more calls until we are done.
                    scope.isInProgress = true;

                    // This tells the dfApplicationObj to update it self and pull
                    // record with a specific offset
                    scope._getDataFromServer(curOffset).then(
                        function(result) {

                            // Total count will have been updated.  Grab our new record count
                            scope.totalCount = dfApplicationData.getApiData(scope.api, 'meta').count;

                            // did we need to recalc pagination
                            if (recalcPagination) {

                                // Yep.  Make it happen captin
                                scope._calcPagination(scope.api);
                                scope._setCurrentPage(scope.pagesArr[scope.pagesArr.length -1]);
                            }

                            // We're done modifiying our data object and calcualting pagination
                            // if it was needed.  Let everyone know data is upto date.
                            scope.$emit('toolbar:paginate:' + scope.api + ':update');
                        },

                        function(reject) {

                            // There was an error
                            var messageOptions = {
                                module: 'DreamFactory Paginate Table',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            }

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function() {

                            // Stop our progress indicator
                            scope.isInProgress = false;
                        }
                    )
                })
            }
        }
    }])

    // Details section headers
    .directive('dfDetailsHeader', ['MOD_UTILITY_ASSET_PATH', function (MOD_UTILITY_ASSET_PATH) {


        return {
            restrict: 'E',
            scope: {
                new: '=',
                name: '=?',
                apiName: '=?'
            },
            template: '<div class="df-section-header df-section-all-round"><h4 data-ng-if="new">Create {{apiName}}</h4><h4 data-ng-if="!new">Edit {{name}}</h4></div>',
            link: function (scope, elem, attrs) {}
        }
    }])

    // Standard section headers
    .directive('dfSectionHeader', [function () {

        return {

            restrict: 'E',
            scope: {
                title: '=?'
            },
            template: '<div class="df-section-header df-section-all-round"><h4>{{title}}</h4></div>',
            link: function (scope, elem, attrs){}


        }
    }])

    // allows user to set password with verify functionality
    .directive('dfSetUserPassword', ['MOD_USER_ASSET_PATH', '$compile', 'dfStringService', function(MOD_USER_ASSET_PATH, $compile, dfStringService) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_USER_ASSET_PATH + 'views/df-input-manual-password.html',
            link: function(scope, elem, attrs) {

                scope.verifyPassword = '';

                scope.updatePassword = false;
                scope.setPassword = false;
                scope.identical = true;

                // Test if our entered passwords are identical
                scope._verifyPassword = function (password) {

                    // did we pass a password to chekc against
                    // if not...assume the existence of a user object with a password prop
                    // this is terrible.  Do it better later.
                    password = password || scope.user.record.password;

                    scope.identical = dfStringService.areIdentical(password, scope.verifyPassword);
                };

                scope._resetUserPasswordForm = function () {

                    scope.verifyPassword = '';
                    scope.setPassword = false;
                }


                // WATCHERS AND INIT
                var watchSetPassword = scope.$watch('setPassword', function (newValue, oldValue) {

                    if (!newValue) return false;
                    var html = '';

                    if (!scope.updatePassword) {
                        html +=  '<div class="form-group" data-ng-class="{\'has-error\' : identical === false}">' +
                            '<input type="password" id="password" name="password" placeholder="Enter Password" data-ng-model="user.record.password" class="form-control" data-ng-required="true" data-ng-keyup="_verifyPassword()" >' +
                            '</div>' +
                            '<div class="form-group" data-ng-class="{\'has-error\' : identical === false}">' +
                            '<input type="password" id="verify-password" name="verify-password" placeholder="Verify Password" data-ng-model="verifyPassword" class="form-control" data-ng-required="true" data-ng-keyup="_verifyPassword()" >' +
                            '</div>';
                    }
                    else {

                        html += '<div class="form-group">' +
                            '<input type="password" id="old-password" class="form-control" data-ng-model="password.old_password" placeholder="Enter Old Password" />' +
                            '</div>';

                        html +=  '<div class="form-group" data-ng-class="{\'has-error\' : identical === false}">' +
                            '<input type="password" id="password" name="password" placeholder="Enter Password" data-ng-model="password.new_password" class="form-control" data-ng-required="true" data-ng-keyup="_verifyPassword(password.new_password)" >' +
                            '</div>' +
                            '<div class="form-group" data-ng-class="{\'has-error\' : identical === false}">' +
                            '<input type="password" id="verify-password" name="verify-password" placeholder="Verify Password" data-ng-model="verifyPassword" class="form-control" data-ng-required="true" data-ng-keyup="_verifyPassword(password.new_password)" >' +
                            '</div>';

                    }


                    var el = $compile(html)(scope);

                    angular.element('#set-password').append(el);
                });


                // MESSAGES
                // Listen for userForm clear message
                scope.$on('reset:user:form', function (e) {
                 scope._resetUserPasswordForm();
                 });

                scope.$on('$destroy', function (e) {

                    watchSetPassword();
                });
            }
        }
    }])

    // allows user to set security question and answer
    .directive('dfSetSecurityQuestion', ['MOD_UTILITY_ASSET_PATH', '$compile', function (MOD_UTILITY_ASSET_PATH, $compile) {


        return {

            restrict: 'E',
            scope: false,
            templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-set-security-question.html',
            link: function(scope, elem, attrs) {


                scope.setQuestion = false;


                var watchSetQuestion = scope.$watch('setQuestion', function (n, o) {

                    if (!n) return false;
                    var html = '';

                    html += '<div class="form-group"></div>' +
                        '<label for="user-security-question">Security Question</label>' +
                        '<input type="text" id="user-security-question" data-ng-model="user.record.security_question" class="form-control" placeholder="Enter security question" />' +
                        '</div>' +
                        '<div class="form-group"></div>' +
                        '<label for="user-security-answer">Security Answer</label>' +
                        '<input type="text" id="user-security-answer" data-ng-model="user.record.security_answer" class="form-control" placeholder="Enter security answer" />' +
                        '</div>' ;



                    angular.element('#set-question').append($compile(html)(scope));
                })
            }
        }
    }])

    // Creates a drop down button for the sdks
    .directive('dfDownloadSdk', ['MOD_UTILITY_ASSET_PATH', function (MOD_UTILITY_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: {
                btnSize: '=?'
            },
            templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-download-sdk.html',
            link: function (scope, elem, attrs) {



                scope.sdkLinks = [
                    {
                        label: 'Android',
                        href: 'https://github.com/dreamfactorysoftware/android-sdk',
                        icon: ''
                    },
                    {
                        label: 'iOS',
                        href: 'https://github.com/dreamfactorysoftware/ios-sdk',
                        icon: ''
                    },
                    {
                        label: 'AngularJS',
                        href: 'https://github.com/dreamfactorysoftware/angular-sdk',
                        icon: ''
                    },
                    {
                        label: 'JavaScript',
                        href: 'https://github.com/dreamfactorysoftware/javascript-sdk',
                        icon: ''
                    },
                    {
                        label: 'Titanium',
                        href: 'https://github.com/dreamfactorysoftware/titanium-sdk',
                        icon: ''
                    },
                    {
                        label: '.NET',
                        href: 'https://github.com/dreamfactorysoftware/.net-sdk',
                        icon: ''
                    }
                ]
            }
        }
    }])

    // if a section is empty show this
    // it will bind to data stored in the section controller $scope.emptySectionOptions
    // the template will call setActiveView() from <sidebar-nav> directive
    // all of these share the same scope
    .directive('dfEmptySection', ['MOD_UTILITY_ASSET_PATH', function (MOD_UTILITY_ASSET_PATH) {
        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-empty-section.html'
        }
    }])

    // Init loading screen
    .directive('__dfMainLoading', ['MOD_UTILITY_ASSET_PATH', 'dfApplicationData', '$interval', function (MOD_UTILITY_ASSET_PATH, dfApplicationData, $interval) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-main-loading.html',
            link: function (scope, elem, attrs) {


                scope.text = {
                    operation: "Loading",
                    module: null
                };

                scope.moduleNames = ['Services', 'Apps', 'Roles', 'System','Users', 'Config', 'Email Templates', 'Lookup Keys', 'CORS Config', 'App Groups', 'Events', 'Current User'];
                var loadingDots = null;



                // PUBLIC API
                scope.dfmlStart = function () {

                    scope._dfmlStart();
                };

                scope.dfmlUpdate = function() {

                    scope._dfmlUpdate();
                };

                scope.dfmlFinish = function() {

                    scope._dfmlFinish();
                };



                // PRIVATE API
                scope._setProgressBar = function (percent) {

                    $('.progress-bar').css({'width' :  percent + '%'});
                };

                scope._getModuleName = function (moduleStr) {


                    switch(moduleStr) {

                        case 'service':
                            return scope.moduleNames[0];
                        case 'app':
                            return scope.moduleNames[1];
                        case 'role':
                            return scope.moduleNames[2];
                        case 'system':
                            return scope.moduleNames[3];
                        case 'user':
                            return scope.moduleNames[4];
                        case 'config':
                            return scope.moduleNames[5];
                        case 'email_template':
                            return scope.moduleNames[6];
                        case 'lookup':
                            return scope.moduleNames[7];
                        case 'cors':
                            return scope.moduleNames[8];
                        case 'app_group':
                            return scope.moduleNames[9];
                        case 'event':
                            return scope.moduleNames[10];
                        case 'Current User':
                            return scope.moduleNames[11];


                    }

                };

                scope._getOpName = function (opStr) {
                    switch (opStr) {

                        case 'loading':
                            return "Loading";


                    }
                };

                scope._loadingDots = function () {

                    var counter = 0;

                    loadingDots = $interval(function () {

                        counter++;

                        if (counter <= 3) {
                            console.log(counter)
                            $('#loading-dots').append('.');
                        }
                        else {
                            $('#loading-dots').html('');
                            console.log('reset')
                            counter = 0;
                        }
                    }, 500, 0 , false);
                };



                // COMPLEX IMPLEMENTATION
                scope._dfmlStart = function () {

                    // Doesn't work during ajax calls for some reason.
                    // scope._loadingDots();
                    scope.text.module = scope._getModuleName(dfApplicationData.getMainLoadData().loadData.module);

                    // $(elem).find('h1').html(scope.text.operation);
                    $(elem).find('small').html(scope.text.module);
                    scope._setProgressBar(0);

                    $.each($(elem).children(), function (index, value) {

                        $(value).show();
                    });
                };

                scope._dfmlUpdate = function () {

                    var data = dfApplicationData.getMainLoadData().loadData;
                    scope.text.module = scope._getModuleName(data.module);
                    $(elem).find('h1').html(scope.text.operation);
                    $(elem).find('p').html(scope.text.module);
                    scope._setProgressBar(data.percent);
                };

                scope._dfmlFinish = function () {

                    $(elem).children().hide();
                    scope._setProgressBar(0);

                    $interval.cancel(loadingDots);
                };


                // MESSAGES
                scope.$on('dfml:start', function (e, dataObj) {

                    scope.dfmlStart();
                });

                scope.$on('dfml:update', function (e, dataObj) {

                    scope.dfmlUpdate();
                });

                scope.$on('dfml:finish', function (e, dataObj) {

                    scope.dfmlFinish();
                });

            }
        }
    }])

    // Init loading screen
    .service('dfMainLoading', ['$timeout', '$window', function ($timeout, $window) {

        var appendTo = 'dreamfactoryApp';
        var containerName = 'df-main-loading-container'
        var title = 'df-loading-title';

        var template = '<div id="' + containerName + '" class="col-xs-10 col-sm-6 col-md-4 col-xs-offset-1 col-sm-offset-3 col-md-offset-4 df-main-loading df-auth-container">' +
                            '<div class="panel panel-default">' +
                                '<div class="panel-heading">' +
                            '<span id="' + title + '"></span>&nbsp;<span id="loading-dots"></span>' +
                                '</div>' +
                                '<div class="panel-body">' +
                                    '<!--<h1 class="df-main-loading">{{text.operation}}</h1>-->' +
                                    '<p></p>' +
                                    '<div style="clear: both"></div>' +
                                    '<div class="progress">' +
                                        '<div class="progress-bar df-main-loading-bar progress-bar-striped active" role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100" >' +
                                            '<span class="sr-only"></span>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>';


        function calcPercent (totalApis) {

            return (100 / totalApis);
        }

        function setProgressBar (percent) {

            $('.progress-bar').css({'width' :  percent + '%'});
        };

        return {

            percentIncrease: 0,
            currentPercent: 0,

            start: function (totalApis) {

                this.percentIncrease = calcPercent(totalApis);
                $('#' + appendTo).append(template);
            },

            update: function (apiName) {

                this.currentPercent += this.percentIncrease;
                setProgressBar(this.currentPercent);
                $('#' + title).html(apiName.substr(0,1).toUpperCase() + apiName.substr(1, apiName.length).split('_').join(' '));
            },


            finish: function (apiName) {

                this.currentPercent += this.percentIncrease;
                setProgressBar(this.currentPercent);

                $('#' + containerName).remove();
                this.currentPercent = 0;
            }
        }
    }])

    // Pop up login screen for session time outs
    .directive('dfPopupLogin', ['MOD_UTILITY_ASSET_PATH', '$compile', '$location', 'UserEventsService', function (MOD_UTILITY_ASSET_PATH, $compile, $location, UserEventsService) {

        return {
            restrict: 'A',
            scope: false,
            // templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-popup-login.html',
            link: function (scope, elem, attrs) {

                scope.popupLoginOptions = {
                    showTemplate: true
                };


                // PUBLIC API
                scope.openLoginWindow = function (errormsg) {

                    scope._openLoginWindow(errormsg);
                };



                // PRIVATE API



                // COMPLEX IMPLEMENTATION
                scope._openLoginWindow = function (errormsg) {
                    var html = '<div id="df-login-frame" style="overflow: hidden; position: absolute; top:0; z-index:99999; background: rgba(0, 0, 0, .8); width: 100%; height: 100%"><div style="padding-top: 120px;"><dreamfactory-user-login data-in-err-msg="errormsg.data.error.message" data-options="popupLoginOptions"></dreamfactory-user-login></div></div>';
                    $('#popup-login-container').html($compile(html)(scope));
                };


                // WATCHERS



                //MESSAGES
                scope.$on(UserEventsService.login.loginSuccess, function(e, userDataObj) {

                    e.stopPropagation();
                    $('#df-login-frame').remove();
                });


                scope.$on(UserEventsService.login.loginError, function(e, userDataObj) {

                    $('#df-login-frame').remove();
                    $location.url('/logout');
                });
            }
        }
    }])

    // Display App Version
    .directive('dfCopyrightFooter', ['MOD_UTILITY_ASSET_PATH', 'APP_VERSION', function (MOD_UTILITY_ASSET_PATH, APP_VERSION) {

        return {

            // restrict to element tag
            restrict: 'E',

            // Shared scope
            scope: false,

            // duh
            templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-copyright-footer.html',

            link: function (scope, elem, attrs) {

                scope.version = APP_VERSION;
            }
        }
    }])

    // Check for session validity
    .service('dfRouteChecker', ['UserDataService', 'SystemConfigDataService', '$location', function(UserDataService, SystemConfigDataService, $location) {

        return function() {

            var currentUser = UserDataService.getCurrentUser(),
                systemConfig = SystemConfigDataService.getSystemConfig();

            // If there is no currentUser and we don't allow guest users
            if (!currentUser) {
                $location.url('/login')
            }

            // There is a currentUser but they are not an admin
            else if (currentUser && !currentUser.is_sys_admin) {

                $location.url('/launchpad')
            }
        }
    }])

    // Helps merge objects.  Supports deep merge.  Many modules
    // need this
    .service('dfObjectService', ['dfStringService',
        function (dfStringService) {

            return {

                mergeDiff: function (obj1, obj2) {

                    for (var key in obj1) {
                        if (!obj2.hasOwnProperty(key) && key.substr(0,1) !== '$') {

                            obj2[key] = obj1[key]
                        }
                    }

                    return obj2;
                },

                mergeObjects: function (obj1, obj2) {

                    for (var key in obj1) {
                        obj2[key] = obj1[key]
                    }

                    return obj2;
                },

                deepMergeObjects: function (obj1, obj2) {

                    var self = this;

                    for (var _key in obj1) {
                        if (obj2.hasOwnProperty(_key)) {

                            switch (Object.prototype.toString.call(obj2[_key])) {

                                case '[object Object]':
                                    obj2[_key] = self.deepMergeObjects(obj1[_key], obj2[_key]);
                                    break;

                                case '[object Array]':
                                    obj2[_key] = obj1[_key];
                                    //obj2[_key].concat(obj1[_key]);
                                    break;

                                default:
                                    obj2[_key] = obj1[_key];
                            }

                            /*    if(Object.prototype.toString.call(obj2[_key]) === '[object Object]') {

                             obj2[_key] = self.deepMergeObjects(obj1[_key], obj2[_key]);
                             }else {
                             obj2[_key] = obj1[_key];
                             }*/
                        }
                    }

                    return obj2;
                },

                compareObjectsAsJson: function(o, p) {

                    return dfStringService.areIdentical(angular.toJson(o), angular.toJson(p));
                },

                compareObjects: function (o, p) {

                    var i,
                        keysO = Object.keys(o).sort(),
                        keysP = Object.keys(p).sort();
                    if (keysO.length !== keysP.length){

                    console.log('not the same nr of keys')
                        return false;//not the same nr of keys
                    }

                    if (keysO.join('') !== keysP.join('')) {
                     console.log('different keys')
                        return false;//different keys
                    }

                    for (i=0;i<keysO.length;++i)
                    {
                        if (o[keysO[i]] instanceof Array)
                        {
                            if (!(p[keysO[i]] instanceof Array)) {
                                console.log('first array')

                                return false;
                            }

                            //if (compareObjects(o[keysO[i]], p[keysO[i]] === false) return false
                            //would work, too, and perhaps is a better fit, still, this is easy, too
                            if (p[keysO[i]].sort().join('') !== o[keysO[i]].sort().join('')) {
                                console.log('secound array')
                                return false;
                            }


                        }
                        else if (o[keysO[i]] instanceof Date)
                        {
                            if (!(p[keysO[i]] instanceof Date)) {

                            console.log('date 1');
                                return false;
                            }

                            if ((''+o[keysO[i]]) !== (''+p[keysO[i]])) {


                                console.log('date 2');
                                return false;
                            }
                        }
                        else if (o[keysO[i]] instanceof Function)
                        {
                            if (!(p[keysO[i]] instanceof Function)) {


                                console.log('func 1');
                                return false;
                            }
                            //ignore functions, or check them regardless?
                        }
                        else if (o[keysO[i]] instanceof Object)
                        {
                            if (!(p[keysO[i]] instanceof Object)) {


                                console.log('obj 1');
                                return false;
                            }

                            if (o[keysO[i]] === o)
                            {//self reference?
                                if (p[keysO[i]] !== p){
                                    console.log('date 2');
                                    return false;
                                }
                            }
                            else if (this.compareObjects(o[keysO[i]], p[keysO[i]]) === false) {
                                console.log('something else');
                                return false;//WARNING: does not deal with circular refs other than ^^
                            }
                        }


                        /*if (o[keysO[i]] != p[keysO[i]]) {//change !== to != for loose comparison

                            console.log(o[keysO[i]] + ' = ' + p[keysO[i]]);
                            return false;//not the same value
                        }*/
                    }
                    return true;

                }
            }
        }
    ])

    // Useful string operations
    .service('dfStringService', [function () {

        return {
            areIdentical: function (stringA, stringB) {

                stringA = stringA || '';
                stringB = stringB || '';

                function _sameLength(stringA, stringB) {
                    return stringA.length == stringB.length;
                }

                function _sameLetters(stringA, stringB) {

                    var l = Math.min(stringA.length, stringB.length);

                    for (var i = 0; i < l; i++) {
                        if (stringA.charAt(i) !== stringB.charAt(i)) {
                            return false;
                        }
                    }
                    return true;
                }

                if (_sameLength(stringA, stringB) && _sameLetters(stringA, stringB)) {
                    return true;
                }

                return false;
            }
        }
    }])

    // Stores our System Configuration.  May not need to define here as it
    // is contained in the SystemConfigModule
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

    // allows us to make synchronous ajax calls.  Not extensive enough in its
    // functionality to replace $http but helps with loading/bootstrapping data
    .service('XHRHelper', ['INSTANCE_URL', 'ADMIN_API_KEY', '$cookies', function (INSTANCE_URL, ADMIN_API_KEY, $cookies) {

        function _isEmpty(obj) {

            // null and undefined are "empty"
            if (obj == null) return true;

            // Assume if it has a length property with a non-zero value
            // that that property is correct.
            if (obj.length > 0)    return false;
            if (obj.length === 0)  return true;

            // Otherwise, does it have any properties of its own?
            // Note that this doesn't handle
            // toString and valueOf enumeration bugs in IE < 9
            for (var key in obj) {
                if (hasOwnProperty.call(obj, key)) return false;
            }

            return true;
        }

        // Set DreamFactory Headers as well as additional passed in headers
        function _setHeaders(_xhrObj, _headersDataObj) {

            // Setting Dreamfactory Headers
            _xhrObj.setRequestHeader("X-DreamFactory-API-Key", ADMIN_API_KEY);
            _xhrObj.setRequestHeader("X-DreamFactory-Session-Token", $cookies.PHPSESSID);

            // Set additional headers
            for (var _key in _headersDataObj) {

                _xhrObj.setRequestHeader(_key, _headersDataObj[_key]);
            }
        }

        // Create url params
        function _setParams(_paramsDataObj) {

            // Set a return var
            var params = '';

            // Check if we have any params
            if (!_isEmpty(_paramsDataObj)) {

                // We do.
                // begin query string
                params = '?';

                // Loop through object
                for (var _key in _paramsDataObj) {

                    // Create URL params out of object properties/values
                    params += _key + '=' + _paramsDataObj[_key] + '&';
                }
            }

            // Check if params is empty string
            // Did we have any params
            if (params !== '') {

                // We did so trim of the trailing '&' from building the string
                params = params.substring(0, params.length -1);

                // Encode the params
                encodeURI(params);
            }

            // Return our final params value
            return params;
        }


        function _makeRequest(_method, _url, _async, _params, _headers, _mimeType) {


            var xhr;

            // Create XHR object
            if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
                xhr = new XMLHttpRequest();
            }
            else {// code for IE6, IE5
                xhr = new ActiveXObject("Microsoft.XMLHTTP");
            }

            // set and encode params
            var params = _setParams(_params);


            // Do XHR
            xhr.open(_method, INSTANCE_URL + '/api/v2/' + _url + params, _async);

            // Set headers
            _setHeaders(xhr, _headers);

            // Set mime type override
            xhr.overrideMimeType(_mimeType);

            // Send our request
            xhr.send();


            if (xhr.readyState === 4) {
                return xhr;
            }
        }


        function _ajax(optionsDataObj) {

            // We need a valid URL
            // Do we have one?
            if (!optionsDataObj.url || optionsDataObj.url === '') {

                // No.  Throw an error
                throw {
                    module: 'DreamFactory Utility Module',
                    type: 'error',
                    provider: 'dreamfactory',
                    exception: 'XHRHelper Request Failure: No URL provided'
                }
            }

            // Default xhr options
            var defaults = {
                method: "GET",
                url: '',
                async: false,
                params: {},
                headers:{},
                mimeType: "application/json"
            };


            // Merge user xhr options object with default xhr options object
            for (var _key in defaults) {

                if (optionsDataObj.hasOwnProperty(_key)) {
                    defaults[_key] = optionsDataObj[_key];
                }
            }

            // Make the request with the merged object
            return _makeRequest(defaults.method, defaults.url, defaults.async, defaults.params, defaults.headers, defaults.mimeType);

        }


        return {

            ajax: function(requestOptions) {

                return _ajax(requestOptions);
            }
        }

    }])

    // browser storage mechanism
    .service('dfSessionStorage', [function() {

        return {


            setItem: function(key, value) {

                sessionStorage.setItem(key, value);
            },

            getItem: function(key) {

                if (sessionStorage.hasOwnProperty(key)) {

                    return sessionStorage.getItem(key);
                }

                return false;
            },

            removeItem: function(key) {

                if (sessionStorage.hasOwnProperty(key)) {

                    if (!sessionStorage.removeItem(key)) {
                        return true;
                    }
                }

                return false;
            }
        }
    }])

    // Notification service
    .service('dfNotify', ['dfApplicationPrefs', function(dfApplicationPrefs) {

        var stack_topleft = {"dir1": "down", "dir2": "right", "push": "top", "firstpos1": 25, "firstpos2": 25, "spacing1": 5, spacing2: 5};
        var stack_bottomleft = {"dir1": "right", "dir2": "up", "push": "top"};
        var stack_bar_top = {"dir1": "down", "dir2": "right", "push": "top", "spacing1": 0, "spacing2": 0};
        var stack_bar_bottom = {"dir1": "up", "dir2": "right", "spacing1": 0, "spacing2": 0};
        var stack_context = {"dir1": "down", "dir2": "left", "context": $("#stack-context")};


        function pnotify (messageOptions) {



            // Removed module title property as per Todd's request
            // title: messageOptions.module,

            (function() {



                // Set PNotify options
                PNotify.prototype.options.styling = "fontawesome";

                new PNotify({
                    title: messageOptions.module,
                    type:  messageOptions.type,
                    text:  messageOptions.message,
                    addclass: "stack_topleft",
                    animation: 'fade',
                    animate_speed: 150,
                    position_animate_speed: 150,
                    stack: stack_topleft,
                    mouse_reset: false
                })
            })();
        }

        function pnotifyConfirm (messageOptions) {


            (function () {

                // Set PNotify options
                PNotify.prototype.options.styling = "fontawesome";

                new PNotify({

                    title: messageOptions.module,
                    text: messageOptions.message,
                    icon: 'fa fa-question-circle',
                    hide: false,
                    confirm: {
                        confirm: true
                    },
                    buttons: {
                        closer: false,
                        sticker: false
                    },
                    history: {
                        history: false
                    }
                })
            })();

        }

        function parseDreamfactoryError (errorDataObj) {

            var i, error = "";

            // If the exception type is a string we don't need to go any further
            // This was thrown explicitly by the module due to a module error
            // unrelated to the server
            if (Object.prototype.toString.call(errorDataObj) === '[object String]') {

                // store the error
                // and we're done
                error = errorDataObj;

                // the exception is not a string
                // let's assume it came from the server
            } else {

                // add the message from the error obj to the error store
                error += errorDataObj.data.error.message;
            }

            // return message to display to the user
            return error;
        }

        function parseError (error, retValue) {

            switch (retValue) {

                case 'message':
                    return parseDreamfactoryError(error.message);
                default:
                    error.message = parseDreamfactoryError(error.message);
                    return error;
            }
        }

        return {

            success: function(options) {

                switch(dfApplicationPrefs.getPrefs().application.notificationSystem.success) {

                    case 'pnotify':
                        pnotify(options);
                        break;
                    case 'browserAlert':
                        alert(options.message);
                        break;
                    case 'browserLog':
                        // Need to make cross browser compatible
                        console.log(options.message);
                        break;
                    case 'dfModalNotify':
                        // Actually need to create this service
                        console.log('dfModalNotfiy');
                        break;

                    default:
                        console.log('browserAlert');

                }

            },

            error: function(options) {


                switch(dfApplicationPrefs.getPrefs().application.notificationSystem.error) {

                    case 'pnotify':
                        options.message = parseError(options, 'message');
                        pnotify(options);
                        break;
                    case 'browserAlert':
                        alert(parseError(options, 'message'));
                        break;
                    case 'browserLog':
                        // Need to make cross browser compatible
                        console.error(parseError(options, 'message'));
                        break;
                    case 'dfModalNotify':
                        // Actually need to create this service
                        console.log('dfModalNotfiy');
                        break;

                    default:
                        console.log('browserAlert');

                }

            },

            warn: function(options) {

                switch(dfApplicationPrefs.getPrefs().application.notificationSystem.warn) {

                    case 'pnotify':
                        pnotify(options);
                        break;
                    case 'browserAlert':
                        alert(options);
                        break;
                    case 'browserLog':
                        // Need to make cross browser compatible
                        console.error(options);
                        break;
                    case 'dfModalNotify':
                        // Actually need to create this service
                        console.log('dfModalNotfiy');
                        break;

                    default:
                        console.log('browserAlert');

                }
            },

            confirmNoSave: function () {

                return confirm('Continue without saving?');
            },

            confirm: function (msg) {

                switch(dfApplicationPrefs.getPrefs().application.notificationSystem.confirm) {

                    case 'pnotify':
                        return pnotify(options);
                        break;

                    default:
                        return confirm(msg);
                }
            },

            alert: function (msg) {
                alert(msg);
            }
        }
    }])

    // Icon Service
    .service('dfIconService', [function () {

        return function () {

            return {
                launchpad: 'fa fa-fw fa-bars',
                admin: 'fa fa-fw fa-cog',
                login: 'fa fa-fw fa-sign-in',
                logout: 'fa fa-fw fa-sign-out',
                register: 'fa fa-fw fa-group',
                profile: 'fa fa-fw fa-user'
            };
        }
    }])

    // ServerInfo Service
    .service('dfServerInfoService', ['$window', function ($window) {

        return {

            currentServer: function () {
                return $window.location.origin;
            }
        }

    }])

    // replace params in launch url service
    .service('dfReplaceParams', ['UserDataService', '$window', function (UserDataService, $window) {

        return function (appUrl, appName) {

            var newParams = "";
            var url = appUrl;
            if (appUrl.indexOf("?") !== -1) {
                var temp = appUrl.split("?");
                url = temp[0];
                var params = temp[1];
                params = params.split("&");
                $.each(
                    params, function(index, oneParam) {
                        if (oneParam) {
                            if ("" === newParams) {
                                newParams += "?";
                            } else {
                                newParams += "&";
                            }
                            var pieces = oneParam.split("=");
                            if (1 < pieces.length) {
                                var name = pieces.shift();
                                var value = pieces.join("=");

                                switch (value) {
                                    case "{session_id}":
                                    case "{ticket}":
                                    case "{first_name}":
                                    case "{last_name}":
                                    case "{display_name}":
                                    case "{email}":
                                        value = value.substring(1, value.length - 1);
                                        value =  UserDataService.getCurrentUser()[value];
                                        break;
                                    case "{user_id}":
                                        // value = top.CurrentSession.id;
                                        value = UserDataService.getCurrentUser().id;
                                        break;
                                    case "{app_name}":
                                        value = appName;
                                        break;
                                    case "{server_url}":
                                        value = $window.location.origin;
                                        break;
                                }

                                newParams += name + "=" + value;
                            } else {
                                newParams += oneParam;
                            }
                        }
                    }
                );
            }

            return url + newParams;
        }
    }])

    // Various Filters.  All used in dfTable.  Possibly elsewhere.
    // I'll find out if so.
    .filter('orderAndShowSchema', [function () {

        return function (items, fields, reverse) {

            var filtered = [];

            angular.forEach(
                fields, function (field) {

                    angular.forEach(
                        items, function (item) {
                            if (item.name === field.name && field.active == true) {

                                filtered.push(item);
                            }
                        }
                    );
                }
            );

            if (reverse) {
                filtered.reverse();
            }
            return filtered;
        }
    }
    ])

    .filter('orderAndShowValue', [function () {

        return function (items, fields, reverse) {

            // Angular sometimes throws a duplicate key error.
            // I'm not sure why.  We were just pushing values onto
            // an array.  So I use a counter to increment the key
            // of our data object that we assign our filtered values
            // to.  Now they are extracted into the table in the correct
            // order.

            var filtered = [];

            // for each field
            angular.forEach(
                fields, function (field) {

                    // search the items for that field
                    for (var _key in items) {

                        // if we find it
                        if (_key === field.name && field.active == true) {

                            // push on to
                            filtered.push(items[_key]);
                        }
                    }
                }
            );

            if (reverse) {
                filtered.reverse();
            }
            return filtered;
        }
    }
    ])

    .filter('orderObjectBy', [function () {
        return function (items, field, reverse) {

            var filtered = [];

            function cmp(a, b) {
                return a == b ? 0 : a < b ? -1 : 1;
            }

            angular.forEach(items, function (item) {
                    filtered.push(item);
                }
            );

            if (filtered.length === 0) {
                return filtered;
            }

            var filterOnThis = filtered[0].record ? filtered[0].record[field] : filtered[0][field]

            switch (typeof filterOnThis) {

                case 'number':

                    filtered.sort(
                        function numberCmp(a, b) {

                            // This checks if we have passed in a 'managed ui object'
                            // Pretty sure all the data that moves into any table
                            // that needs to be sorted will be wrapped in an object and
                            // the data we are looking for will be assigned to the record
                            // property of that object
                            if (a.hasOwnProperty('record') && b.hasOwnProperty('record')) {
                                a = a.record[field];
                                b = b.record[field]
                            }
                            else {
                                a = a[field];
                                b = b[field];
                            }

                            // if the value is null of undefined set to zero
                            a = a === null || a === undefined ? 0 : a;
                            b = b === null || b === undefined ? 0 : b;

                            return cmp(Number(a), Number(b));
                        }
                    )
                    break;

                case 'string':

                    filtered.sort(
                        function sortfn(a, b) {

                            if (a.hasOwnProperty('record') && b.hasOwnProperty('record')) {
                                a = a.record[field];
                                b = b.record[field]
                            }
                            else {
                                a = a[field];
                                b = b[field];
                            }

                            // if the value is null of undefined set to zero
                            a = a === null || a === undefined ? '' : a;
                            b = b === null || b === undefined ? '' : b;

                            var upA = a.toUpperCase();
                            var upB = b.toUpperCase();
                            return (
                                upA < upB
                                ) ? -1 : (
                                upA > upB
                                ) ? 1 : 0;
                        }
                    );
                    break;

                default:
                    filtered.sort(
                        function sortfn(a, b) {

                            if (a.hasOwnProperty('record') && b.hasOwnProperty('record')) {
                                a = a.record[field];
                                b = b.record[field]
                            }
                            else {
                                a = a[field];
                                b = b[field];
                            }

                            // if the value is null of undefined set to empty string
                            a = a === null || a === undefined ? '' : a;
                            b = b === null || b === undefined ? '' : b;

                            var upA = a
                            var upB = b
                            return (
                                upA < upB
                                ) ? -1 : (
                                upA > upB
                                ) ? 1 : 0;
                        }
                    );
            }

            if (reverse) {
                filtered.reverse();
            }
            return filtered;
        };
    }
    ])

    .filter('dfFilterBy', [function () {
        return function (items, options) {

            if (!options.on) {
                return items;
            }

            var filtered = [];

            // There is nothing to base a filter off of
            if (!options) {
                return items
            }
            ;

            if (!options.field) {
                return items
            }
            ;
            if (!options.value) {
                return items
            }
            ;
            if (!options.regex) {
                options.regex = new RegExp(options.value, "i");
            }

            angular.forEach(
                items, function (item) {
                    if (options.regex.test(item[options.field])) {

                        filtered.push(item)
                    }
                }
            );

            return filtered;
        }
    }
    ])

    .filter('dfOrderExplicit', [function () {

        return function (items, order) {

            var filtered = [], i = 0;

            angular.forEach(
                items, function (value, index) {

                    if (value.name === order[i]) {
                        filtered.push(value)

                    }
                    i++;
                }
            )

            return filtered;

        }
    }
    ]);