'use strict';

angular
    .module('dfServiceModule')
    .service('dfTutorial', [function () {

        this.showStepAfterViewInit = function (currentStepId, stepToBeShown) {
            setTimeout(function () {
                if (Shepherd.activeTour && Shepherd.activeTour.getCurrentStep().id == currentStepId) {
                    Shepherd.activeTour.show(stepToBeShown);
                }
            }, 100)
        };

        this.fillWithScenario = function (tour, scenario) {
            scenario.tour = tour;

            scenario.steps
                .forEach(function (step) {

                    var createdStep = tour.addStep(step.name, step.options);

                    bindEventsByStepType(step, createdStep);

                    bindCustomEvents(step, createdStep);
                });
        };

        function bindEventsByStepType(step, createdStep) {
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

        function bindCustomEvents(step, createdStep) {
            step.customFunctionObjects.forEach(function (each) {
                createdStep.on(each.event, each.handler);
            })
        }

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


    }]);