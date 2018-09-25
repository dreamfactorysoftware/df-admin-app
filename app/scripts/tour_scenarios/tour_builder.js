var TourBuilder = {

    showStepAfterViewInit: function (currentStepId, stepToBeShown) {
        setTimeout(function () {
            if (Shepherd.activeTour && Shepherd.activeTour.getCurrentStep().id == currentStepId) {
                Shepherd.activeTour.show(stepToBeShown);
            }
        }, 100)
    },

    buildTour: function (scenario) {

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

                var stepButtons = TourBuilder.createButtons(step, tour);

                var createdStep = tour.addStep(step.name, step.options);
                createdStep.options.buttons = stepButtons;

                TourBuilder.bindEventsByStepType(step, createdStep);

                TourBuilder.bindCustomEvents(step, createdStep);
            });
    },

    createButtons: function (step, tour) {

        var buttons = [];

        step.options.buttons
            .forEach(function (preButton) {
                var button;
                switch (preButton.type) {

                    case 'skip': {
                        button = {
                            text: 'skip',
                            classes: 'shepherd-button-secondary',
                            action: tour.complete
                        };
                        break;
                    }
                    case 'next': {
                        button = {
                            text: 'next',
                            action: tour.next
                        };
                        break;
                    }
                    case 'back': {
                        button = {
                            text: 'back',
                            action: tour.back
                        };
                        break;
                    }
                    case 'done': {
                        button = {
                            text: 'done',
                            action: tour.complete
                        };
                    }
                }
                TourBuilder.buttonActionSetter(preButton, button);

                buttons.push(button);
            });
        return buttons
    },


    buttonActionSetter: function (preButton, button) {
        if (preButton.action !== undefined) {
            button.action = preButton.action;
        }
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
            $(selector).addClass('highlighted-element');
        });
        step.on('before-hide', function () {
            $(selector).removeClass('highlighted-element')
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

};