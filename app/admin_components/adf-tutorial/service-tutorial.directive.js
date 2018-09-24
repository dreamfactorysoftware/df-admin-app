'use strict';

angular.module('dfTutorial')

    .directive('dfServiceTutorial', ['MOD_TUTORIALS_ASSET_PATH', '$location', function (MOD_TUTORIALS_ASSET_PATH, $location) {

        return {
            restrict: 'E',
            templateUrl: MOD_TUTORIALS_ASSET_PATH + 'views/service-tutorial.html',
            link: function (scope, elem, attrs) {


                scope.start = function () {

                    var tour = new Shepherd.Tour({
                        defaultStepOptions: {
                            classes: 'shepherd-theme-arrows',
                            scrollTo: true
                        }
                    });

                    allScenarios.createService.tour = tour;

                    allScenarios.createService.steps
                        .forEach(function (step) {
                            var createdStep = tour.addStep(step.name, step.options);

                            bindByType(step, createdStep);

                            step.customFunctionObjects.forEach(function (each) {
                                createdStep.on(each.event, each.handler);
                            })
                        });
                    tour.start();
                };

                function getSelector(step) {
                    return step.options.attachTo.element;
                }

                function bindHighlighting(step) {
                    var selector = getSelector(step);

                    step.on('show', function () {
                        angular.element(selector).addClass('highlighted-element');
                    });
                    step.on('before-hide', function () {
                        angular.element(selector).removeClass('highlighted-element')
                    });
                }

                function bindEmptyInputsValidation(step) {
                    var inputSelector = getSelector(step);
                    var buttonSelector = '.shepherd-element .shepherd-content footer .shepherd-buttons li:last-child .shepherd-button';
                    var disabledButtonClass = 'tutorial-disabled-button';

                    step.on('show', function () {
                        if ($(inputSelector).val() == '') {
                            $(buttonSelector).addClass(disabledButtonClass);
                        }

                        $(inputSelector).on('input', function (e) {
                            if ($(inputSelector).val() == '') {
                                $(buttonSelector).addClass(disabledButtonClass)
                            } else {
                                $(buttonSelector).removeClass(disabledButtonClass)
                            }
                        });

                    });

                    step.on('before-hide', function () {
                        $(buttonSelector).removeClass("tutorial-disabled-button")
                    });
                }

                function bindFocus(step) {
                    var selector = getSelector(step);
                    step.on('show', function () {
                        $(selector).focus();
                    });
                }

                function bindByType(step, createdStep) {
                    switch (step.type) {
                        case 'click': {
                            bindHighlighting(createdStep);
                            break;
                        }
                        case 'input': {
                            bindEmptyInputsValidation(createdStep);
                            bindFocus(createdStep);
                            bindHighlighting(createdStep);
                            break;
                        }
                        case 'select': {
                            bindHighlighting(createdStep);
                        }
                    }
                }


            }
        };
    }]);