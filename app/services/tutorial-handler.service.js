'use strict';

angular
    .module('dfServiceModule')
    .service('dfTutorialHandler', [function () {

        this.showStep = function (currentStepId, nextStepId) {
            setTimeout(function () {
                if (Shepherd.activeTour && Shepherd.activeTour.getCurrentStep().id == currentStepId) {
                    Shepherd.activeTour.show(nextStepId);
                }
            }, 100)
        };

    }]);