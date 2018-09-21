'use strict';

angular.module('dfTutorial')

    .directive('dfScriptingTutorial', ['MOD_TUTORIALS_ASSET_PATH', 'dfTutorialHandler', function (MOD_TUTORIALS_ASSET_PATH, dfTutorialHandler) {

        return {
            restrict: 'E',
            templateUrl: MOD_TUTORIALS_ASSET_PATH + 'views/scripting-tutorial.html',
            link: function (scope, elem, attrs) {


                scope.start = function () {
                    tour.start();
                };

                var tour = new Shepherd.Tour({
                    defaultStepOptions: {
                        classes: 'shepherd-theme-arrows',
                        scrollTo: true
                    }
                });

                var step1 = tour.addStep('scripts-tab', {
                    title: 'Scripts Tab',
                    text: 'Tab with settings related to scripts. Let\'s open it.',
                    attachTo: {element: '.tutorial-step-scripts-tab', on: 'bottom'},
                    advanceOn: {element: '.tutorial-step-scripts-tab', on: 'click'},
                    buttons: [

                        {
                            text: 'skip',
                            classes: 'shepherd-button-secondary',
                            action: tour.complete
                        }
                    ]

                });

                dfTutorialHandler.subscribeHighlightingElement(step1);

                var step2 = tour.addStep('scripts-table', {
                    title: 'Table with all available services for scripting.',
                    text: 'Here you can see all available services for which we can create a scripts.',
                    attachTo: {element: '#scripting-sidebar-list', on: 'right'},
                    scrollTo: true,
                    buttons: [
                        {
                            text: 'skip',
                            classes: 'shepherd-button-secondary',
                            action: tour.complete
                        }
                    ]
                });

                step2.on('show', function () {
                    $('#scripting-sidebar-list').children().css('pointer-events', 'none');
                });

                dfTutorialHandler.subscribeHighlightingElement(step2);
            }
        };
    }]);