'use strict';

angular
    .module('dfServiceModule')
    .service('dfTutorialHandler', [function () {

        this.showStepAfterViewInit = function (currentStepId, stepToBeShown) {
            setTimeout(function () {
                if (Shepherd.activeTour && Shepherd.activeTour.getCurrentStep().id == currentStepId) {
                    Shepherd.activeTour.show(stepToBeShown);
                }
            }, 100)
        };


        this.subscribeHighlightingElement = function subscribeHighlightingElement(step) {
            var selector = step.options.attachTo.element;
            step.on('show', function () {
                angular.element(selector).addClass('highlighted-element');
            });
            step.on('before-hide', function () {
                angular.element(selector).removeClass('highlighted-element')
            });
        }

        this.subscribeDisableElement = function subscribeDisableElement(step) {
            var selector = step.options.attachTo.element;
            step.on('show', function () {
                angular.element(selector).addClass('disable-events-on-element');
            });
            step.on('before-hide', function () {
                angular.element(selector).removeClass('disable-events-on-element')
            });
        }

        this.subscribeDisableButtonNextForEmptyInputs = function subscribeDisableButtonNextForEmptyInputs(step) {
            var inputSelector = step.options.attachTo.element;
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

            unsubscribeDisableButtonNextForEmptyInputs(step);
        }

        function unsubscribeDisableButtonNextForEmptyInputs(step) {
            var buttonSelector = '.shepherd-element .shepherd-content footer .shepherd-buttons li:last-child .shepherd-button';
            step.on('before-hide', function () {
                $(buttonSelector).removeClass("tutorial-disabled-button")
            });
        }


        this.setFocusAfterShow = function setFocusAfterShow(step) {
            var selector = step.options.attachTo.element;
            step.on('show', function () {
                $(selector).focus();
            });
        }

    }]);