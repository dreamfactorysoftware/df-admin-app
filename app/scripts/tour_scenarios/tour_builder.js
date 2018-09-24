var TourBuilder = {

    showStepAfterViewInit: function (currentStepId, stepToBeShown) {
        setTimeout(function () {
            if (Shepherd.activeTour && Shepherd.activeTour.getCurrentStep().id == currentStepId) {
                Shepherd.activeTour.show(stepToBeShown);
            }
        }, 100)
    },

    buildTour: function (scenario){

        var tour = new Shepherd.Tour({
            defaultStepOptions: {
                classes: 'shepherd-theme-arrows',
                scrollTo: true
            }
        });

        TourBuilder.fillTourWithScenario(tour, scenario);

        tour.start();
    },

    fillTourWithScenario: function (tour, scenario) {
        scenario.tour = tour;

        scenario.steps
            .forEach(function (step) {

                var createdStep = tour.addStep(step.name, step.options);

                TourBuilder.bindEventsByStepType(step, createdStep);

                TourBuilder.bindCustomEvents(step, createdStep);
            });
    },

    bindEventsByStepType: function (step, createdStep) {
        switch (step.type) {
            case 'click': {
                TourBuilder.bindHighlighting(createdStep);
                break;
            }
            case 'input': {
                TourBuilder.bindEmptyInputsValidation(createdStep);
                TourBuilder.bindFocus(createdStep);
                TourBuilder.bindHighlighting(createdStep);
                break;
            }
            case 'select': {
                TourBuilder.bindHighlighting(createdStep);
                break
            }
            case 'notice': {
                TourBuilder.bindHighlighting(createdStep);
            }
        }
    },

    bindCustomEvents: function (step, createdStep) {
        if (step.eventHandlers !== undefined) {
            step.eventHandlers.forEach(function (each) {
                createdStep.on(each.event, each.handler);
            })
        }
    },

    getSelector: function (step) {
        return step.options.attachTo.element;
    },

    bindHighlighting: function (step) {
        var selector = TourBuilder.getSelector(step);

        step.on('show', function () {
            angular.element(selector).addClass('highlighted-element');
        });
        step.on('before-hide', function () {
            angular.element(selector).removeClass('highlighted-element')
        });
    },

    bindEmptyInputsValidation: function (step) {
        var inputSelector = TourBuilder.getSelector(step);
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
    },

    bindFocus: function (step) {
        var selector = TourBuilder.getSelector(step);
        step.on('show', function () {
            $(selector).focus();
        });
    }

}