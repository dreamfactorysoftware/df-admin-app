var FeatureTour = {
    current: undefined,
    scenarios: {},

    //This is a hack to show a step after the corresponding Angular's view was rendered
    showStep: function (currentStepId, stepToBeShown) {
        setTimeout(function () {
            if (FeatureTour.current && FeatureTour.current.getCurrentStep().id == currentStepId) {
                FeatureTour.current.show(stepToBeShown);
            }
        }, 100);

        return 'done';
    },

    start: function(scenarioName) {
        var scenario = this.scenarios[scenarioName]

        var tour = new Shepherd.Tour({
            defaultStepOptions: {
                classes: 'shepherd-theme-arrows',
                scrollTo: true
            }
        });

        this.current = tour;

        this.fillTourWithScenario(tour, scenario);

        tour.start();
    },

    fillTourWithScenario: function (tour, scenario) {
        var self = this;

        scenario.steps
            .forEach(function (stepTemplate) {

                var buttons = self.createButtons(stepTemplate, tour);

                var step = tour.addStep(stepTemplate.name, stepTemplate.options);
                step.options.buttons = buttons;

                self.bindEventsByStepType(stepTemplate, step);
                self.bindCustomEvents(stepTemplate, step);
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
                            action: function (){
                                FeatureTour.current.complete();
                                FeatureTour.current = undefined;
                            }
                        };
                        break;
                    }
                    case 'next': {
                        button = {
                            text: 'next',
                            action: FeatureTour.current.next
                        };
                        break;
                    }
                    case 'back': {
                        button = {
                            text: 'back',
                            action: FeatureTour.current.back
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

                if (preButton.action !== undefined) {
                    button.action = preButton.action;
                }
                buttons.push(button);
            });
        return buttons
    },

    bindEventsByStepType: function (step, createdStep) {
        switch (step.type) {
            case 'click': {
                this.bindHighlighting(createdStep);
                break;
            }
            case 'input': {
                this.bindEmptyInputsValidation(createdStep);
                this.bindFocus(createdStep);
                this.bindHighlighting(createdStep);
                break;
            }
            case 'select': {
                this.bindHighlighting(createdStep);
                break
            }
            case 'notice': {
                this.bindHighlighting(createdStep);
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
        var selector = this.getSelector(step);

        step.on('show', function () {
            $(selector).addClass('highlighted-element');
        });
        step.on('before-hide', function () {
            $(selector).removeClass('highlighted-element')
        });
    },

    bindEmptyInputsValidation: function (step) {
        var inputSelector = this.getSelector(step);
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
        var selector = this.getSelector(step);
        step.on('show', function () {
            $(selector).focus();
        });
    }
}
