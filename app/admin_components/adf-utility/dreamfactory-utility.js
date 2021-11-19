'use strict';


angular.module('dfUtility', ['dfApplication'])

// Set a constant so we can access the 'local' path of our assets
    .constant('MOD_UTILITY_ASSET_PATH', 'admin_components/adf-utility/')

    // declare our directive and pass in our constant
    .directive('dfGithubModal', ['MOD_UTILITY_ASSET_PATH', '$http', 'dfApplicationData', '$rootScope', function (MOD_UTILITY_ASSET_PATH, $http, dfApplicationData, $rootScope) {

        return {
            restrict: 'E',
            scope: {
                editorObj: '=?',
                accept: '=?',
                target: '=?'
            },
            templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-github-modal.html', link: function (scope, elem, attrs) {

                scope.modalError = {};
                scope.githubModal = {};

                scope.githubUpload = function () {

                    var url = angular.copy(scope.githubModal.url);

                    if (!url ) {
                        return;
                    }

                    var url_params = url.substr(url.indexOf('.com/') + 5);
                    var url_array = url_params.split('/');

                    var owner = '';
                    var repo = '';
                    var branch = '';
                    var path = '';

                    if (url.indexOf('raw.github') > -1) {
                        owner = url_array[0];
                        repo = url_array[1];
                        branch = url_array[2];
                        path = url_array.splice(3, url_array.length - 3).join('/');
                    }
                    else {
                        owner = url_array[0];
                        repo = url_array[1];
                        branch = url_array[3];
                        path = url_array.splice(4, url_array.length - 4).join('/');
                    }

                    var github_api_url = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + path + '?ref=' + branch;

                    var username = angular.copy(scope.githubModal.username);
                    var password = angular.copy(scope.githubModal.password);

                    var authdata = btoa(username + ':' + password);

                    if (username) {
                        $http.defaults.headers.common['Authorization'] = 'Basic ' + authdata;
                    }

                    $http.get(github_api_url, {

                        headers: {
                            'X-DreamFactory-API-Key': undefined,
                            'X-DreamFactory-Session-Token': undefined
                        },
                        ignore401: true
                    })
                        .then(function successCallback(response) {

                            var extension = path.substr(path.lastIndexOf('.') + 1, path.length - path.lastIndexOf('.'));

                            var mode = '';

                            switch (extension) {
                                case 'js':
                                    mode = 'javascript';
                                    break;
                                case 'php':
                                    mode = 'php';
                                    break;
                                case 'py':
                                    mode = 'python';
                                    break;
                                case 'json':
                                    mode = 'json';
                                    break;
                                default:
                                    mode = 'javascript';
                            }

                            if (scope.editorObj && scope.editorObj.editor) {
                                var decodedString = atob(response.data.content);
                                scope.editorObj.editor.session.setValue(decodedString);
                                scope.editorObj.editor.focus();
                            }

                            var element = angular.element('#' + scope['target']);

                            element.on('hidden.bs.modal', function(){
                                if ($(this).find('form')[0] !== undefined) {
                                    $(this).find('form')[0].reset();
                                }
                            });

                            scope.githubModal = { private: false };
                            scope.modalError = {};

                            element.appendTo("body").modal('hide');

                        }, function errorCallback(response) {

                            if (response.status === 401) {
                                scope.modalError = {
                                    visible: true,
                                    message: 'Error: Authentication failed.'
                                };
                            }

                            if (response.status === 404) {
                                scope.modalError = {
                                    visible: true,
                                    message: 'Error: The file could not be found.'
                                };
                            }
                        });
                };

                scope.githubModalCancel = function () {

                    scope.githubModal = { private: false };
                    scope.modalError = {};

                    var element = angular.element('#' + scope['target']);

                    element.on('hidden.bs.modal', function(){
                        if ($(this).find('form')[0] !== undefined) {
                            $(this).find('form')[0].reset();
                        }
                    });

                    element.appendTo("body").modal('hide');
                };

                var watchGithubCredUser = scope.$watch('githubModal.username', function (newValue, oldValue) {

                    if (!newValue) return false;

                    scope.modalError = {
                        visible: false,
                        message: ''
                    };
                });

                var watchGithubCredPass = scope.$watch('githubModal.password', function (newValue, oldValue) {

                    if (!newValue) return false;

                    scope.modalError = {
                        visible: false,
                        message: ''
                    };
                });

                var watchGithubURL = scope.$watch('githubModal.url', function (newValue, oldValue) {

                    if (!newValue) return false;

                    scope.modalError = {
                        visible: false,
                        message: ''
                    };

                    var file_ext = newValue.substring(newValue.lastIndexOf('.') + 1, newValue.length)

                    if (scope['accept'].indexOf(file_ext) > -1) {

                        var url = angular.copy(scope.githubModal.url);
                        var url_params = url.substr(url.indexOf('.com/') + 5);
                        var url_array = url_params.split('/');

                        var owner = url_array[0];
                        var repo = url_array[1];

                        var github_api_url = 'https://api.github.com/repos/' + owner + '/' + repo;

                        $http.get(github_api_url, {
                            headers: {
                                'X-DreamFactory-API-Key': undefined,
                                'X-DreamFactory-Session-Token': undefined
                            }
                        })
                            .then(function successCallback(response) {

                                scope.githubModal.private = response.data.private;
                            }, function errorCallback(response) {

                                scope.githubModal.private = true;
                            });
                    }
                    else {

                        var formats = scope['accept'].join(', ');
                        scope.modalError = {
                            visible: true,
                            message: 'Error: Invalid file format. Only ' + formats + ' file format(s) allowed'
                        };
                    }
                });

                scope.$on('githubShowModal',function(event, data){

                    if (data === undefined) return;

                    var element = angular.element('#' + data);

                    element.on('hidden.bs.modal', function(){
                        if ($(this).find('form')[0] !== undefined) {
                            $(this).find('form')[0].reset();
                        }
                    });

                    element.appendTo("body").modal('show');
                });
            }
        };
    }])

    // declare our directive and pass in our constant
    .directive('dfComponentTitle', ['MOD_UTILITY_ASSET_PATH', '$location', function (MOD_UTILITY_ASSET_PATH, $location) {

        return {

            // Only allow this directive to be used as an element
            restrict: 'E',

            replace: true,

            scope: false,

            template: '<i class="pull-left notify fa fa-fw fa-{{$parent.titleIcon}} df-menu-icon"></i>'
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
                        case '/limits':
                        case '/reports':
                        case '/scheduler':
                            scope.activeLink = 'admin';
                            break;

                        case '/launchpad':
                            scope.activeLink = 'launchpad';
                            break;

                        case '/profile':
                            scope.activeLink = 'user';
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
                });

            }
        };
    }])

    .directive('dfNavNotification', ['MOD_UTILITY_ASSET_PATH', '$http', function (MOD_UTILITY_ASSET_PATH, $http) {

        return {
            replace: true,
            templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-nav-notification.html',
            link: function (scope, elem, attrs) {

                $http.get('https://dreamfactory.com/in_product_v2/notifications.php')
                    .then(function (result) {
                        scope.notifications = result.data.notifications;
                    })
            }
        };
    }])

    // declare our directive and pass in our constant
    .directive('dfComponentNav', ['MOD_UTILITY_ASSET_PATH', '$location', '$route', '$rootScope', function (MOD_UTILITY_ASSET_PATH, $location, $route, $rootScope) {

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

                scope.toggleMenu = false;


                // PUBLIC API
                scope.openMenu = function () {

                    scope._openMenu();
                };

                scope.closeMenu = function () {

                    scope._closeMenu();
                };

                scope.reloadRoute = function (path) {
                    if (scope._activeTabClicked(path)) {
                        $route.reload();
                    }
                };

                scope._activeTabClicked = function (path) {
                    return $location.path() === path;
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
                        }, 250, function() {});

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
        };
    }])

    // declare our directive and pass in our constant
    .directive('dfSidebarNav', ['MOD_UTILITY_ASSET_PATH', '$rootScope', '$location', 'dfTestDbStatusService', function (MOD_UTILITY_ASSET_PATH, $rootScope, $location, dfTestDbStatusService) {

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

                // From the Services Dashboard, if there are no roles associated with that service, they have
                // the option to jump straight to the create role view. We use a hash location to jump to /roles,
                // and then when the sidebar initializes, it will check the current url, and change the view to
                // create.
                var init = function () {
                    var currentUrl = location.hash;
                    if (currentUrl === '#/roles#create') {
                        // links is the array of sidebar links on any given tab, and in the case
                        // of the roles tab, index 1 is equal to the "Create" Link.
                        scope.setActiveView(scope.links[1]);
                    }
                }


                scope.activeView = scope.links[0];
                scope.toggleMenu = false;
                scope.testDbStatuses = dfTestDbStatusService.getTestDbStatuses();

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


                scope.$on('sidebar-nav:view:reset', function(event) {

                    angular.forEach(scope.links, function(link, id) {
                        if (id === 0) {
                            scope.links[0].active = true;
                        }
                        else {
                            scope.links[id].active = false;
                        }
                    });

                    scope.setActiveView(scope.links[0])
                });


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
                            });
                            break;

                        case '/home':
                        case '/apps':
                        case '/admins':
                        case '/users':
                        case '/roles':
                        case '/services':
                        case '/config':
                        case '/reports':
                        case '/scheduler':

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

                init();
            }
        };
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
        };
    }])

    // Used for setting the section heights
    .directive('dfFsHeight', ['$window', '$rootScope', function ($window, $rootScope) {

        var defaultContainerPadding = 26;
        var dfFsHeight = {
            rules: [{
                comment: 'If this is the swagger iframe',
                order: 10,
                test: function (element, data) {
                    return element.is('#apidocs');
                },
                setSize: function (element, data) {
                    element.css({
                        minHeight: data.windowInnerHeight - data.menuBottomPosition - defaultContainerPadding
                    });
                },
            }, {
                comment: 'If this is the file manager iframe',
                order: 20,
                test: function (element, data) {
                    return element.is('#file-manager');
                },
                setSize: function (element, data) {
                    element.css({
                        minHeight: data.windowInnerHeight - data.menuBottomPosition - defaultContainerPadding
                    });
                    $rootScope.$emit('filemanager:sized');
                },
            }, {
                comment: 'If this is the scripting sidebar list',
                order: 30,
                test: function (element, data) {
                    return element.is('#scripting-sidebar-list');
                },
                setSize: function (element, data) {
                    element.css({
                        height: data.windowInnerHeight - element.offset().top - defaultContainerPadding
                    });
                },
            }, {
                comment: 'If this is the scripting IDE',
                order: 40,
                test: function (element, data) {
                    return element.attr('id') === 'ide';
                },
                setSize: function (element, data) {
                    element.css({
                        height: data.winHeight - element.offset().top - defaultContainerPadding
                    });
                }
            }, {
                comment: 'If any element on desktop screen',
                order: 50,
                test: function (element, data) {
                    return data.winWidth >= 992;
                },
                setSize: function (element, data) {
                    element.css({
                        minHeight: data.windowInnerHeight - data.menuBottomPosition
                    });
                },
            }],
            default: {
                setSize: function (element, data) {
                    element.css({
                        height: 'auto'
                    });
                }
            },
            rulesOrderComparator: function (a, b) {
                return a.order - b.order;
            },
        };

        var setSize = function (elem) {

            setTimeout(function () {
                var _elem = $(elem);
                var dfMenu = $('.df-menu')[0];
                var data = {
                    menuBottomPosition: dfMenu ? dfMenu.getBoundingClientRect().bottom : 0,
                    windowInnerHeight: window.innerHeight,
                    winWidth: $(document).width(),
                    winHeight: $(document).height(),
                };
                var rule = dfFsHeight.rules
                    .sort(dfFsHeight.rulesOrderComparator)
                    .find(function (value) {
                        return value.test(_elem, data);
                    });
                if (rule) {
                    rule.setSize(_elem, data);
                } else {
                    dfFsHeight.default.setSize(_elem, data);
                }
            }, 10);
        };

        return function (scope, elem, attrs) {
            var eventHandler = function (e) {
                setSize(elem);
            };
                // Respond to swagger loaded
            scope.$on('apidocs:loaded', eventHandler);
            // Respond to file manager loaded
            scope.$on('filemanager:loaded', eventHandler);
            // Respond to scripts loaded
            // @TODO: This does not work.  Fires but no elem?????
            scope.$on('script:loaded:success', eventHandler);
            // Respond to sidebar change
            scope.$on('sidebar-nav:view:change', eventHandler);
            // Respond to component nav change
            scope.$on('sidebar-nav:view:change', eventHandler);
            // Respond to component nav change
            $rootScope.$on('$routeChangeSuccess', eventHandler);

            $(document).ready(eventHandler);
            // Bind to resize
            $(window).on('resize', eventHandler);
        }
    }])

    .directive('dfGroupedPicklist', [
        'MOD_UTILITY_ASSET_PATH', function (DF_UTILITY_ASSET_PATH) {

            return {
                restrict: 'E',
                scope: {
                    selected: '=?',
                    options: '=?'
                },
                templateUrl: DF_UTILITY_ASSET_PATH + 'views/df-grouped-picklist.html',
                link: function (scope, elem, attrs) {
                    scope.selectedLabel = false;
                    scope.selectItem = function (item) {
                        scope.selected = item.name;
                    };

                    scope.$watch('selected', function (n, o) {
                        if (n == null && n == undefined) return false;

                        angular.forEach(scope.options, function (option) {
                            if(option.items) {
                                angular.forEach(option.items, function(item){
                                    if(n === item.name){
                                        scope.selectedLabel = item.label;
                                    }
                                });
                            }
                        });
                    });

                    elem.css({
                        'display': 'inline-block', 'position': 'relative'
                    });

                }
            };
        }
    ])

    .directive('dfEventPicker', [
        'MOD_UTILITY_ASSET_PATH', function (DF_UTILITY_ASSET_PATH) {

            return {
                restrict: 'E',
                scope: {
                    selected: '=?',
                    options: '=?'
                },
                templateUrl: DF_UTILITY_ASSET_PATH + 'views/df-event-picker.html',
                link: function (scope, elem, attrs) {

                    scope.selectItem = function (item) {
                        scope.selected = item.name;
                    };

                    scope.events = [];

                    // event list will load later, handle change here

                    scope.$watch('options', function (newValue, oldValue) {

                        var events = [];

                        if (newValue) {
                            angular.forEach(newValue, function (e) {
                                if (e.items) {
                                    if (events.length > 0) {
                                        // add divider before starting a new service type
                                        // class = 'divider' makes it a divider
                                        events.push({class: 'divider'});
                                    }
                                    angular.forEach(e.items, function (item) {
                                        // add menu item, class = '' means not a divider
                                        item.class = '';
                                        events.push(item);
                                    });
                                }
                            });
                            scope.events = events;
                        }
                    });
                }
            };
        }
    ])

    .directive('dfFileCertificate', [
        'MOD_UTILITY_ASSET_PATH', function (DF_UTILITY_ASSET_PATH) {
            return {
                restrict: 'E',
                scope: {
                    selected: '=?'
                },
                templateUrl: DF_UTILITY_ASSET_PATH + 'views/df-file-certificate.html',
                link: function (scope, elem, attrs){
                    var fileInput = elem.find('input');

                    fileInput.bind("change", function(event){
                        var file = event.target.files[0];
                        var reader = new FileReader();
                        reader.onload = function (readerEvt) {
                            var string = readerEvt.target.result;
                            scope.selected = string;
                            scope.$apply();
                        };
                        reader.readAsBinaryString(file);
                    });

                    elem.css({
                        'display': 'inline-block', 'position': 'relative'
                    });
                }
            };
        }
    ])

    .directive('dfMultiPicklist', [
        'MOD_UTILITY_ASSET_PATH', function (DF_UTILITY_ASSET_PATH) {

            return {
                restrict: 'E',
                scope: {
                    options: '=?',
                    selectedOptions: '=?',
                    cols: '=?',
                    legend: '=?'
                },
                templateUrl: DF_UTILITY_ASSET_PATH + 'views/df-multi-picklist.html',
                link: function (scope, elem, attrs) {

                    // init active flag for options, server does not provide this
                    angular.forEach(scope.options, function (option) {
                        option.active = false;
                    });

                    // model value for select all
                    scope.allSelected = false;

                    // formatting
                    if (!scope.cols) {
                        scope.cols = 3;
                    }
                    scope.width = (100/(scope.cols*1))-3;

                    scope.toggleSelectAll = function () {

                        // set or clear all based on 'select all' checkbox value

                        var selected = [];
                        if (scope.allSelected) {
                            angular.forEach(scope.options, function (option) {
                                selected.push(option.name);
                            });
                        }
                        scope.selectedOptions = selected;
                    };

                    scope.setSelectedOptions = function () {

                        // set selectedOptions based on checkbox values

                        var selected = [];
                        angular.forEach(scope.options, function (option) {
                            if(option.active) {
                                selected.push(option.name);
                            }
                        });
                        scope.selectedOptions = selected;
                    };

                    scope.$watch('selectedOptions', function (newValue, oldValue) {

                        // set checkbox values based on selectedOptions

                        if (newValue) {
                            angular.forEach(scope.options, function (option) {
                                option.active = (newValue.indexOf(option.name) >= 0);
                            });
                        }
                    });

                    elem.css({
                        'display': 'inline-block', 'position': 'relative'
                    });
                }
            };
        }
    ])

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

                    scope.checkAll = {
                        checked: false
                    };

                    scope._toggleSelectAll = function (event) {

                        if (event !== undefined) {
                            event.stopPropagation();
                        }

                        var verbsSet = [];

                        Object.keys(scope.verbs).forEach(function(key,index) {
                            if (scope.verbs[key].active === true) {
                                verbsSet.push(key);
                            }
                        });

                        if (verbsSet.length > 0) {
                            angular.forEach(verbsSet, function (verb) {
                                scope._toggleVerbState(verb, event);
                            });
                        }
                        else {
                            Object.keys(scope.verbs).forEach(function(key,index) {
                                scope._toggleVerbState(key, event);
                            });
                        }
                    };

                    scope._setVerbState = function (nameStr, stateBool) {
                        var verb = scope.verbs[nameStr];
                        if (scope.verbs.hasOwnProperty(verb.name)) {
                            scope.verbs[verb.name].active = stateBool;
                        }
                    };

                    scope._toggleVerbState = function (nameStr, event) {
                        if (event !== undefined) {
                            event.stopPropagation();
                        }

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

                        });

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

    // Used anywhere a admin/user has the ability to select what REST verbs to allow
    .directive('dfDbFunctionUsePicker', [
        'MOD_UTILITY_ASSET_PATH', function (DF_UTILITY_ASSET_PATH) {

            return {
                restrict: 'E',
                scope: {
                    allowedUses: '=?',
                    description: '=?',
                    size: '@'
                },
                templateUrl: DF_UTILITY_ASSET_PATH + 'views/df-db-function-use-picker.html',
                link: function (scope, elem, attrs) {

                    scope.uses = {
                        SELECT: {name: 'SELECT', active: false, description: " (get)"},
                        FILTER: {name: 'FILTER', active: false, description: ' (get)'},
                        INSERT: {name: 'INSERT', active: false, description: ' (post)'},
                        UPDATE: {name: 'UPDATE', active: false, description: ' (patch)'}
                    };

                    scope.btnText = 'None Selected';
                    scope.description = true;

                    scope._setDbFunctionUseState = function (nameStr, stateBool) {
                        if (scope.uses.hasOwnProperty(scope.uses[nameStr].name)) {
                            scope.uses[nameStr].active = stateBool;
                        }
                    };

                    scope._toggleDbFunctionUseState = function (nameStr, event) {
                        event.stopPropagation();

                        if (scope.uses.hasOwnProperty(scope.uses[nameStr].name)) {
                            scope.uses[nameStr].active = !scope.uses[nameStr].active;
                        }

                        scope.allowedUses = [];

                        angular.forEach(
                            scope.uses, function (_obj) {
                                if (_obj.active) {
                                    scope.allowedUses.push(_obj.name);
                                }

                            }
                        );
                    };

                    scope._isDbFunctionUseActive = function (nameStr) {

                        return scope.uses[nameStr].active
                    };

                    scope._setButtonText = function () {

                        var uses = [];

                        angular.forEach(scope.uses, function (useObj) {

                            if (useObj.active) {
                                uses.push(useObj.name);
                            }

                        });

                        scope.btnText = '';

                        var max = 1;
                        if (uses.length == 0) {
                            scope.btnText = 'None Selected';

                        } else if (uses.length > 0 && uses.length <= max) {

                            angular.forEach(
                                uses, function (_value, _index) {
                                    if (scope._isDbFunctionUseActive(_value)) {
                                        if (_index != uses.length - 1) {
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

                        } else if (uses.length > max) {
                            scope.btnText = uses.length + ' Selected';
                        }
                    };

                    scope.$watch('allowedUses', function (newValue, oldValue) {

                        if (!newValue) {
                            return false;
                        }

                        Object.keys(scope.uses).forEach(function (key) {
                            scope._setDbFunctionUseState(key, false);
                        });

                        angular.forEach(
                            scope.allowedUses, function (_value, _index) {

                                scope._setDbFunctionUseState(_value, true);
                            }
                        );

                        scope._setButtonText();

                    });

                    elem.css({
                        'display': 'inline-block', 'position': 'relative'
                    });

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
                                method: 'GET', url: INSTANCE_URL.url + '/' + scope.activeService
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
                        return dfApplicationData.getServiceComponents(scope.activeService, INSTANCE_URL.url + '/' + scope.activeService + '/_table/',  {params: {fields: 'name,label'}})
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
                                method: 'GET', url: INSTANCE_URL.url + '/' + scope.activeService + '/_schema/'
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

    .directive('dfAceEditor', ['MOD_UTILITY_ASSET_PATH', '$compile', function (MOD_UTILITY_ASSET_PATH, $compile) {

        return {
            restrict: 'E',
            scope: {
                inputType: '=?',
                inputContent: '=?',
                inputUpdate: '=?',
                inputFormat: '=?',
                isEditable: '=?',
                editorObj: '=?',
                targetDiv: '=?'
            },
            templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-ace-editor.html',
            link: function (scope, elem, attrs) {

                window.define = window.define || ace.define;

                $(elem).children('.ide-attach').append($compile('<div id="ide_' + scope.targetDiv + '" class="df-fs-height" style="height:400px"></div>')(scope));

                scope.editor = null;
                scope.currentContent = "";
                scope.verbose = false;

                // PRIVATE API

                scope._setEditorInactive = function (inactive) {

                    if (scope.verbose) {
                        console.log(scope.targetDiv, "_setEditorInactive", inactive);
                    }

                    if (inactive) {
                        scope.editor.setOptions({
                            readOnly: true,
                            highlightActiveLine: false,
                            highlightGutterLine: false
                        });
                        scope.editor.container.style.opacity=0.75;
                        scope.editor.renderer.$cursorLayer.element.style.opacity=0;
                    } else {
                        scope.editor.setOptions({
                            readOnly: false,
                            highlightActiveLine: true,
                            highlightGutterLine: true
                        });
                        scope.editor.container.style.opacity=1.0;
                        scope.editor.renderer.$cursorLayer.element.style.opacity=100;
                    }
                };

                scope._setEditorMode = function (mode) {

                    if (scope.verbose) {
                        console.log(scope.targetDiv, "_setEditorMode", mode);
                    }

                    // inline=true is required for PHP
                    // seems to have no effect on other editor modes
                    scope.editor.session.setMode({
                        path: "ace/mode/" + mode,
                        inline: true,
                        v: Date.now()
                    });
                };

                // we get json objects from schema editor, convert them to strings here
                // scripts and service defs will already be strings

                scope._loadEditor = function (newValue) {

                    if (scope.verbose) {
                        console.log(scope.targetDiv, '_loadEditor', newValue);
                    }
                    if (newValue !== null && newValue !== undefined) {
                        var content = newValue;
                        if (scope.inputType === 'object') {
                            content = angular.toJson(content, true);
                        }
                        scope.currentContent = content;
                        scope.editor = ace.edit('ide_' + scope.targetDiv);
                        scope.editorObj.editor = scope.editor;
                        scope.editor.renderer.setShowGutter(true);
                        scope.editor.session.setValue(content);
                    }
                };

                // WATCHERS AND INIT

                scope.$watch('inputContent', scope._loadEditor);

                // trigger an update of inputContent, even if it didn't change
                // typing in the editor does not change inputContent
                // inputUpdate effectively forces inputContent to update

                scope.$watch('inputUpdate', function (newValue) {

                    if (scope.verbose) {
                        console.log(scope.targetDiv, 'inputUpdate', newValue);
                    }
                    scope._loadEditor(scope.currentContent);
                });

                scope.$watch('inputFormat', function (newValue) {

                    if (scope.verbose) {
                        console.log(scope.targetDiv, 'inputFormat', newValue);
                    }
                    if (newValue) {
                        if (newValue === 'nodejs') {
                            newValue = 'javascript';
                        } else if(newValue === 'python3') {
                            newValue = 'python';
                        }
                        scope._setEditorMode(newValue);
                    }
                });

                scope.$watch('isEditable', function (newValue) {

                    if (scope.verbose) {
                        console.log(scope.targetDiv, 'isEditable', newValue);
                    }
                    scope._setEditorInactive(!newValue);
                });

                scope.$on('$destroy', function (e) {

                    if (scope.verbose) {
                        console.log(scope.targetDiv, '$destroy');
                    }
                    scope.editor.destroy();
                });
            }
        };
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
    .directive('dfSectionToolbar', ['MOD_UTILITY_ASSET_PATH', '$compile', 'dfApplicationData', '$location', '$timeout', '$route', function (MOD_UTILITY_ASSET_PATH, $compile, dfApplicationData, $location, $timeout, $route) {


        return {
            restrict: 'E',
            scope: false,
            transclude: true,
            templateUrl : MOD_UTILITY_ASSET_PATH + 'views/df-toolbar.html',
            link: function (scope, elem, attrs) {

                scope.changeFilter = function (searchStr) {
                    $timeout(function() {
                        // if searchStr is still the same..
                        // go ahead and retrieve the data
                        if (searchStr === scope.filterText || !scope.filterText) {
                            scope.filterText = scope.filterText || null;
                            $location.search('filter', scope.filterText);
                            return;
                        }
                    }, 1000);

                };

                scope.filterText = ($location.search() && $location.search().filter) ? $location.search().filter : '';
                if(elem.find('input')[0]) {
                    elem.find('input')[0].focus();
                }
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
    .directive('dfToolbarPaginate', ['MOD_UTILITY_ASSET_PATH', 'dfApplicationData', 'dfNotify', '$location', function (MOD_UTILITY_ASSET_PATH, dfApplicationData, dfNotify, $location) {


        return {
            restrict: 'E',
            scope: {
                api: '=',
                type: '=?'
            },
            replace: true,
            templateUrl : MOD_UTILITY_ASSET_PATH + 'views/df-toolbar-paginate.html',
            link: function (scope, elem, attrs) {

                scope.totalCount = dfApplicationData.getApiRecordCount(scope.api);
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
                };

                // PRIVATE API

                // Data
                scope._getDataFromServer = function(offset, filter) {

                    var params = {
                        offset: offset,
                        include_count: true
                    };

                    if(filter) {
                        params.filter = filter;
                    }

                    return dfApplicationData.getDataSetFromServer(scope.api, {
                        params: params
                    }).$promise;
                };


                // Pagination
                scope._calcTotalPages = function (totalCount, numPerPage) {

                    return Math.ceil(totalCount / numPerPage);
                };

                scope._createPageObj = function (_pageNum) {

                    return {
                        number: _pageNum + 1,
                        value: _pageNum,
                        offset: _pageNum * dfApplicationData.getApiPrefs().data[scope.api].limit,
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

                scope._calcPagination = function (api) {

                    scope.pagesArr = [];

                    if (scope.totalCount == 0) {
                        scope.pagesArr.push(scope._createPageObj(0));
                        return false;
                    }

                    scope._createPagesArr(scope._calcTotalPages(scope.totalCount, dfApplicationData.getApiPrefs().data[api].limit));
                };

                //local function for filter detection
                var detectFilter = function() {
                    // Checking if we have filters applied
                    var filterText = ($location.search() && $location.search().filter) ? $location.search().filter : '';

                    if(!filterText) return '';

                    // default array for search query (Users, Admins)
                    var arr = [ "first_name", "last_name", "name", "email" ];
                    
                    // and this will update the search queries to be used for other tabs.
                    if ($location.path().includes('apps')) {
                        arr = [ "name", "description" ];
                    }
                    
                    
                    if ($location.path().includes('roles')) {
                        arr = [ "name", "description" ];
                    }

                    if ($location.path().includes('services')) {
                        arr = [ "name", "label", "description", "type" ];
                    }


                    if ($location.path().includes('reports')) {
                        arr = ["id", "service_id", "service_name", "user_email", "action", "request_verb"];

                        return arr.map(function (item) {
                            if (item.includes('id')) {
                                return !Number.isNaN(parseInt(filterText)) ? '(' + item + ' like ' + parseInt(filterText) + ')' : ''
                            } else {
                                return '(' + item + ' like "%' + filterText + '%")'
                            }
                        }).filter(function (filter) {
                            return typeof filter === 'string' && filter.length > 0
                        }).join(' or ')
                    }

                    return arr.map(function(item) {
                        return '(' + item + ' like "%' + filterText + '%")'
                    }).join(' or ');
                };

                // COMPLEX IMPLEMENTATION
                scope._getPrevious = function () {

                    if (scope.isInProgress) return false;

                    scope.isInProgress = true;

                    var offset = scope.pagesArr[scope.currentPage.value - 1].offset;

                    scope._getDataFromServer(offset, detectFilter()).then(

                        function(result) {

                            scope._previousPage();
                            scope.$emit('toolbar:paginate:' + scope.api + ':update');
                        },

                        function(reject) {

                            var messageOptions = {
                                module: 'DreamFactory Paginate Table',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

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

                    var offset = scope.pagesArr[scope.currentPage.value + 1].offset;

                    scope._getDataFromServer(offset, detectFilter()).then(

                        function(result) {
                            scope._nextPage();
                            scope.$emit('toolbar:paginate:' + scope.api + ':update');
                        },

                        function(reject) {
                            var messageOptions = {
                                module: 'DreamFactory Paginate Table',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

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

                    scope._getDataFromServer(pageObj.offset, detectFilter()).then(

                        function(result) {

                            scope._setCurrentPage(pageObj);
                            scope.$emit('toolbar:paginate:' + scope.api + ':update');
                        },

                        function(reject) {

                            var messageOptions = {
                                module: 'DreamFactory Paginate Table',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: reject
                            };

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function() {

                            scope.isInProgress = false;
                        }
                    )

                };

                // WATCHERS

                // Here we have a watcher function and an event listener. The purpose of these
                // is to initialize pagination after all data is loaded. In the original app
                // design all data was loaded at startup. When you clicked on a tab the watcher
                // would fire and it would get the record count from cache to init pagination. Now we
                // load data as needed for each tab, either from the server or from cache. If from
                // cache the old way works fine. The data finishes loading before the watcher fires
                // and the watcher inits pagination. If the data comes from the server it will take
                // longer, and the data may not be available when the watcher fires. In this case
                // the controller broadcasts the 'load' event to init pagination. If data is loaded
                // from cache the listener for the event may not exist yet, but the watcher
                // will init pagination. If the data is loaded from the server the watcher might
                // find 0 records (data not loaded yet) but after all daata is loaded the event
                // listener will init pagination.
                var watchApi = scope.$watch('api', function(newValue, oldValue) {

                    if (!newValue) return false;
                    scope.totalCount = dfApplicationData.getApiRecordCount(newValue);
                    scope._calcPagination(newValue);
                    scope._setCurrentPage(scope.pagesArr[0]);
                });

                // If data for the tab is loaded after the watcher fires, this event will init
                // pagination.
                scope.$on('toolbar:paginate:' + scope.api + ':load', function (e) {

                    scope.totalCount = dfApplicationData.getApiRecordCount(scope.api);
                    scope._calcPagination(scope.api);
                    scope._setCurrentPage(scope.pagesArr[0]);
                });

                // This event is fired on $destroy in controllers that have pagination.
                // If you are not on the first page when you leave the tab, you need to
                // make sure the data for page 1 is loaded next time you go back to that
                // same tab. Deleting the data from cache forces a reload from server
                // and inits pagination to page 1.
                scope.$on('toolbar:paginate:' + scope.api + ':destroy', function (e) {

                    if (scope.currentPage.number !== 1) {

                        dfApplicationData.deleteApiDataFromCache(scope.api);
                        scope.totalCount = 0
                        scope._calcPagination(scope.api);
                        scope._setCurrentPage(scope.pagesArr[0]);
                    }
                });

                // This event is fired from controllers that have pagination when selected
                // records are deleted. It loads records for page 1 and resets pagination.
                scope.$on('toolbar:paginate:' + scope.api + ':reset', function (e) {

                    // If we're logging out don't bother dfApplicationObj is being reset.
                    // If the tab you are leaving was not able to load data then dfApplicationObj won't have it so bail out.
                    if ($location.path() === '/logout' || dfApplicationData.getApiDataFromCache(scope.api) === undefined) {
                        return;
                    }

                    // are we currently updating the model.
                    // yes.
                    if (scope.isInProgress) return false;


                    // We are about to update our data model.
                    // Block any more calls until we are done.
                    scope.isInProgress = true;

                    // We just want to reset back to the first page.
                    scope._getDataFromServer(0, detectFilter()).then(

                        function(result) {

                            // reset everything.
                            scope.totalCount = dfApplicationData.getApiRecordCount(scope.api);
                            scope._calcPagination(scope.api);
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
                            };

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function() {
                            // Stop our progress indicator
                            scope.isInProgress = false;
                        }
                    )
                });

                // This event is fired from controllers that have pagination when a single
                // record is deleted. Unlike the reset event, it tries to keep the current page,
                // or load prevous page if last record on current page was deleted.
                scope.$on('toolbar:paginate:' + scope.api + ':delete', function (e) {

                    // are we currently updating the model.
                    // yes.
                    if (scope.isInProgress) return;


                    // set up vars
                    var curOffset = scope.currentPage.offset,
                        recalcPagination = false;

                    // Are we on the last page and was the last record deleted
                    if (scope._isLastPage() && !dfApplicationData.getApiDataFromCache(scope.api).length) {

                        // set var so we know to recalc our pagination
                        recalcPagination = true;

                        // We need to set the offset for pagination
                        if (scope.currentPage.number !== 1) {

                            // calc proper offset
                            curOffset = scope.currentPage.offset - dfApplicationData.getApiPrefs().data[scope.api].limit
                        }
                    }

                    // We are about to update our data model.
                    // Block any more calls until we are done.
                    scope.isInProgress = true;

                    // This tells the dfApplicationObj to update itself and pull
                    // records with a specific offset
                    scope._getDataFromServer(curOffset, detectFilter()).then(

                        function(result) {

                            // Total count will have been updated.  Grab our new record count
                            scope.totalCount = dfApplicationData.getApiRecordCount(scope.api);

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
                            };

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
    .directive('dfSetUserPassword', ['MOD_UTILITY_ASSET_PATH', '$compile', function(MOD_USER_ASSET_PATH, $compile) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_USER_ASSET_PATH + 'views/df-input-manual-password.html',
            link: function(scope, elem, attrs) {

                scope.requireOldPassword = false;
                scope.password = null;
                scope.setPassword = false;
                scope.identical = true;

                // Test if our entered passwords are identical
                scope._verifyPassword = function () {

                    scope.identical = (scope.password.new_password === scope.password.verify_password);
                };

                scope._resetUserPasswordForm = function () {

                    scope.password = null;
                    scope.setPassword = false;
                    scope.identical = true;
                };

                // WATCHERS AND INIT
                scope.$watch('setPassword', function (newValue) {

                    if (newValue) {
                        var html = '';

                        html += '<div class="form-group" ng-if="requireOldPassword">' +
                            '<input type="password" id="setpassword-old-password" name="setpassword-old-password" class="form-control" data-ng-model="password.old_password" placeholder="Enter Old Password" data-ng-required="true" />' +
                            '</div>';

                        html +=  '<div class="form-group" data-ng-class="{\'has-error\' : identical === false}">' +
                            '<input type="password" id="setpassword-password" name="setpassword-password" placeholder="Enter Password" data-ng-model="password.new_password" class="form-control" data-ng-required="true" data-ng-keyup="_verifyPassword()" >' +
                            '</div>' +
                            '<div class="form-group" data-ng-class="{\'has-error\' : identical === false}">' +
                            '<input type="password" id="setpassword-verify-password" name="setpassword-verify-password" placeholder="Verify Password" data-ng-model="password.verify_password" class="form-control" data-ng-required="true" data-ng-keyup="_verifyPassword()" >' +
                            '</div>';

                        var el = $compile(html)(scope);

                        angular.element('#set-password').append(el);
                    }
                });

                // MESSAGES
                // Listen for userForm clear message
                scope.$on('reset:user:form', function (e) {

                    scope._resetUserPasswordForm();
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

                scope.$watch('setQuestion', function (newValue) {

                    if (newValue) {
                        var html = '';

                        html += '<div class="form-group"></div>' +
                            '<label for="user-security-question">Security Question</label>' +
                            '<input type="text" id="user-security-question" data-ng-model="user.security_question" class="form-control" placeholder="Enter security question" />' +
                            '</div>' +
                            '<div class="form-group"></div>' +
                            '<label for="user-security-answer">Security Answer</label>' +
                            '<input type="text" id="user-security-answer" data-ng-model="user.security_answer" class="form-control" placeholder="Enter security answer" />' +
                            '</div>' ;

                        angular.element('#set-question').append($compile(html)(scope));
                    }
                });
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

                scope.sampleAppLinks = [
                    {
                        label: 'Android',
                        href: 'https://github.com/dreamfactorysoftware/android-sdk',
                        icon: ''
                    },
                    {
                        label: 'iOS Objective-C',
                        href: 'https://github.com/dreamfactorysoftware/ios-sdk',
                        icon: ''
                    },
                    {
                        label: 'iOS Swift',
                        href: 'https://github.com/dreamfactorysoftware/ios-swift-sdk',
                        icon: ''
                    },
                    {
                        label: 'JavaScript',
                        href: 'https://github.com/dreamfactorysoftware/javascript-sdk',
                        icon: ''
                    },
                    {
                        label: 'AngularJS',
                        href: 'https://github.com/dreamfactorysoftware/angular-sdk',
                        icon: ''
                    },
                    {
                        label: 'Angular 2',
                        href: 'https://github.com/dreamfactorysoftware/angular2-sdk',
                        icon: ''
                    },
                    {
                        label: 'Ionic',
                        href: 'https://github.com/dreamfactorysoftware/ionic-sdk',
                        icon: ''
                    },
                    {
                        label: 'Titanium',
                        href: 'https://github.com/dreamfactorysoftware/titanium-sdk',
                        icon: ''
                    },
                    {
                        label: 'ReactJS',
                        href: 'https://github.com/dreamfactorysoftware/reactjs-sdk',
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

    .directive('dfEmptySearchResult', ['MOD_UTILITY_ASSET_PATH', '$location', function (MOD_UTILITY_ASSET_PATH, $location) {
        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-empty-search-result.html',
            link: function (scope, elem, attrs) {
                if($location.search() && $location.search().filter) {
                    scope.$parent.filterText = ($location.search() && $location.search().filter) ? $location.search().filter : null;
                }
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
                scope.currentYear = new Date().getFullYear();
            }
        }
    }])

    .directive('dfPaywall', ['MOD_UTILITY_ASSET_PATH', function (MOD_UTILITY_ASSET_PATH) {
        return {
            restrict: 'E',
            scope: {
                serviceName: '=?',
                licenseType: '=?'
            },
            templateUrl: MOD_UTILITY_ASSET_PATH + 'views/df-paywall.html',

            link: function (scope, elem, attrs) {
                scope.$watch('serviceName', function (newValue, oldValue) {
                    if (scope.serviceName) {
                        scope.$emit('hitPaywall', newValue);

                    }
                });

                Calendly.initInlineWidget({
                  url: 'https://calendly.com/dreamfactory-platform/unlock-all-features',
                  parentElement: document.querySelector('.calendly-inline-widget'),
                  autoLoad: false,
                });
            }
        }
    }])

    // Helps merge objects.  Supports deep merge.  Many modules
    // need this
    .service('dfObjectService', [
        function () {

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

                    return angular.toJson(o) === angular.toJson(p);
                }
            }
        }
    ])

    // allows us to make synchronous ajax calls.  Not extensive enough in its
    // functionality to replace $http but helps with loading/bootstrapping data
    .service('XHRHelper', ['INSTANCE_URL', 'APP_API_KEY', '$cookies', function (INSTANCE_URL, APP_API_KEY, $cookies) {

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
            _xhrObj.setRequestHeader("X-DreamFactory-API-Key", APP_API_KEY);
            var currentUser = UserDataService.getCurrentUser();
            if (currentUser && currentUser.session_tpken) {
                xhrObj.setRequestHeader("X-DreamFactory-Session-Token", currentUser.session_token);
            }

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
            xhr.open(_method, INSTANCE_URL.url + '/' + _url + params, _async);

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

    // Notification service
    .service('dfNotify', ['dfApplicationData', function(dfApplicationData) {

        var stack_topleft = {"dir1": "down", "dir2": "right", "push": "top", "firstpos1": 25, "firstpos2": 25, "spacing1": 5, spacing2: 5};
        var stack_bottomleft = {"dir1": "right", "dir2": "up", "push": "top"};
        var stack_bar_top = {"dir1": "down", "dir2": "right", "push": "top", "spacing1": 0, "spacing2": 0};
        var stack_bar_bottom = {"dir1": "up", "dir2": "right", "spacing1": 0, "spacing2": 0};
        var stack_context = {"dir1": "down", "dir2": "left", "context": $("#stack-context")};


        function pnotify (messageOptions) {

            (function() {

                PNotify.removeAll();

                // Set PNotify options
                PNotify.prototype.options.styling = "fontawesome";

                new PNotify({
                    title: messageOptions.module,
                    type:  messageOptions.type,
                    text:  messageOptions.message,
                    addclass: "stack_topleft",
                    animation: 'fade',
                    animate_speed: 'normal',
                    hide: true,
                    delay: 3000,
                    stack: stack_topleft,
                    mouse_reset: true
                })
            })();
        }

        function parseDreamfactoryError (errorDataObj) {

            var result, error, resource, message;

            // If the exception type is a string we don't need to go any further
            // This was thrown explicitly by the module due to a module error
            // unrelated to the server
            if (Object.prototype.toString.call(errorDataObj) === '[object String]') {

                // store the error
                // and we're done
                result = errorDataObj;

                // the exception is not a string
                // let's assume it came from the server
            } else {

                // parse the message from the error obj
                // for batch error use error.context.resource[].message
                // if not batch error use top level error
                result = "The server returned an unknown error.";
                if (errorDataObj.data) {
                    error = errorDataObj.data.error;
                } else {
                    error = errorDataObj.error;
                }
                if (error) {
                    // default to top level error
                    message = error.message;
                    if (message) {
                        result = message;
                    }
                    if (error.code === 1000 && error.context) {
                        resource = error.context.resource;
                        error = error.context.error;
                        if (resource && error) {
                            result = '';
                            angular.forEach(error, function (index) {
                                if (result) {
                                    result += '\n';
                                }
                                result += resource[index].message;
                            });
                        }
                    }
                }
            }
            // return message to display to the user
            return result;
        }

        return {

            success: function(options) {

                pnotify(options);
            },

            error: function(options) {

                // sometimes options.message is a string, sometimes it's an object
                options.message = parseDreamfactoryError(options.message);
                pnotify(options);
            },

            warn: function(options) {

                pnotify(options);
            },

            confirmNoSave: function () {

                return confirm('Continue without saving?');
            },

            confirm: function (msg) {

                return confirm(msg);
            }
        }
    }])

    // Icon Service
    .service('dfIconService', [function () {

        return function () {

            return {
                upgrade: 'fa fa-fw fa-level-up',
                support: 'fa fa-fw fa-support',
                launchpad: 'fa fa-fw fa-bars',
                admin: 'fa fa-fw fa-cog',
                login: 'fa fa-fw fa-sign-in',
                register: 'fa fa-fw fa-group',
                user: 'fa fa-fw fa-user'
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

    // convert service type to service group
    // caller must provide the serviceTypes array
    .service('serviceTypeToGroup', [function () {

        return function (type, serviceTypes) {
            var i, length, result = null;
            if (type && serviceTypes) {
                length = serviceTypes.length;
                for (i = 0; i < length; i++) {
                    if (serviceTypes[i].name === type) {
                        result = serviceTypes[i].group;
                        break;
                    }
                }
            }
            return result;
        }
    }])

    .service('dfTestDbStatusService', [function () {

        var testDbStatuses = [];

        return {
            // hello
            setTestDbStatus: function(databaseTest) {

                var indexOfExistingTest = testDbStatuses.map(function(testStatus) { return testStatus.serviceName; }).indexOf(databaseTest.serviceName);
                if (indexOfExistingTest !== -1) {
                    testDbStatuses[indexOfExistingTest].status = databaseTest.status;
                    testDbStatuses.push(testDbStatuses.splice(indexOfExistingTest, 1)[0]);
                } else {
                    testDbStatuses.push(databaseTest);
                }
            },

            getTestDbStatuses: function() {
                return testDbStatuses;
            }

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
                    );
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
                return items;
            }


            if (!options.field) {
                return items;
            }

            if (!options.value) {
                return items;
            }

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
            );

            return filtered;

        }
    }
    ]);
