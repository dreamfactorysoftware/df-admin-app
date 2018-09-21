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
                        },
                        {
                            text: 'next',
                            action: tour.next
                        }
                    ]
                });

                step2.on('show', function () {
                    $('#scripting-sidebar-list').children().css('pointer-events', 'none');
                });

                step2.on('before-hide', function () {
                    $('#scripting-sidebar-list').children().css('pointer-events', '');
                });

                dfTutorialHandler.subscribeHighlightingElement(step2);


                var step3 = tour.addStep('selecting-service', {
                    title: 'Service for scripting',
                    text: '<p>Select \'service\' for which we you create a script.</p> <p>Choose \'user\' service to get next step.</p>',
                    attachTo: {element: '.tutorial-step-choose-user-service-for-script', on: 'top'},
                    buttons: [

                        {
                            text: 'skip',
                            classes: 'shepherd-button-secondary',
                            action: tour.complete
                        }
                    ]
                });

                step3.on('show', function () {
                    var a = $._data($('.tutorial-step-choose-user-service-for-script').get(0), 'events' ).click

                    $('.tutorial-step-choose-user-service-for-script').on('click',{name:"tutorialHandler"}, function (event) {
                        setTimeout(function () {
                            console.log("test")
                            tour.next()
                        }, 100)
                    });
                });

                // step3.on('hide', function () {
                //     $('.tutorial-step-choose-user-service-for-script').off('click');
                // });

                dfTutorialHandler.subscribeHighlightingElement(step3);

                var step4 = tour.addStep('selecting-endpoint', {
                    title: 'Endpoint for scripting',
                    text: '<p>Let\'s choose register endpoint.</p>',
                    attachTo: {element: '.tutorial-step-choose-user-register-resource', on: 'top'},
                    advanceOn: {element: '.tutorial-step-choose-user-register-resource', on: 'click'},
                    buttons: [

                        {
                            text: 'skip',
                            classes: 'shepherd-button-secondary',
                            action: tour.complete
                        },
                        {
                            text: 'back',
                            action: function () {
                                $(".back-button").trigger("click");
                                tour.back()
                            }
                        }
                    ]
                });

                dfTutorialHandler.subscribeHighlightingElement(step4);


            }
        };
    }]);