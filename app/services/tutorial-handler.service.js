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

    }]);