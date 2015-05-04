'use strict';


angular.module('dfHelp', [])
    .constant('MOD_HELP_ASSET_PATH', 'admin_components/adf-help/')
    .directive('dfSimpleHelp', [ 'MOD_HELP_ASSET_PATH', function(MOD_HELP_ASSET_PATH) {

        return {
            restrict: 'E',
            replace: true,
            scope: {
                options: '=?'
            },
            templateUrl: MOD_HELP_ASSET_PATH + 'views/simple-help.html',
            link: function (scope, elem, attrs) {


                // Let's get a ref to our help-box div
                var helpDiv = $(elem).children(".help-box");


                // PUBLIC API
                scope.showHelp = function () {

                    scope._showHelp();
                };

                scope.closeHelp = function () {

                    scope._closeHelp();
                };




                // PRIVATE API
                scope._setVisible = function () {

                    if (helpDiv.is(':hidden')) {
                        helpDiv.show();
                    }
                };

                scope._setHidden = function () {

                    if (helpDiv.is(':visible')) {
                        helpDiv.hide();
                    }
                };

                scope._setWidth = function () {
                    helpDiv.css({
                        width: $(window).outerWidth() / 3
                    });
                };




                // COMPLEX IMPLEMENTATION

                scope._showHelp = function () {

                    if (helpDiv.is(':visible')) {
                        scope.closeHelp();
                        return false;
                    }

                    helpDiv.addClass('dfp-right-bottom');
                    scope._setWidth();
                    scope._setVisible();
                };

                scope._closeHelp = function () {

                    if (helpDiv.is(':hidden')) {
                        return false;
                    }

                    helpDiv.removeClass('dfp-right-bottom');
                    scope._setHidden();
                };

                // MESSAGES

            }
        }
    }])
    .directive('dfLargeHelp', [ 'MOD_HELP_ASSET_PATH', '$compile', function(MOD_HELP_ASSET_PATH, $compile) {

        return {
            restrict: 'E',
            replace: true,
            scope: {
                options: '='
            },
            templateUrl: MOD_HELP_ASSET_PATH + 'views/df-large-help.html',
            link: function (scope, elem, attrs) {


                scope.$watch('options', function(newValue, oldValue) {

                    if (!newValue) return;


                    if (newValue.hasOwnProperty('title')) {

                        $(elem).children(".df-large-help-title").html(newValue.title);
                    };


                    if (newValue.hasOwnProperty('text')) {

                        $(elem).children(".df-large-help-text").html(newValue.text);
                    };
                })
            }
        }
    }]);
