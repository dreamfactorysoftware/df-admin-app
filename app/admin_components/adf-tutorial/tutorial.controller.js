'use strict';

angular.module('dfTutorial')

    .controller('TutorialController', ['$scope', function ($scope) {

        $scope.$parent.title = 'Tutorials';

        $scope.startServiceTutorial = function () {
            TourBuilder.buildTour(createServiceScenario);
        };

    }]);


