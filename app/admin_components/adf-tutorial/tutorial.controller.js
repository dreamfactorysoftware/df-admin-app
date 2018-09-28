'use strict';

angular.module('dfTutorial')

    .controller('TutorialController', ['$scope', function ($scope) {

        $scope.$parent.title = 'Tutorials';

        $scope.startTutorial = function (scenarioName) {
            FeatureTour.start(scenarioName);
        };

        $scope.dfLargeHelp = {
            manageSchema: {
                title: 'Learn How To',
                text: 'This section includes interactive tutorials. The below list covers basic ' +
                    'workflows of DreamFactory. You can find here the information about how to start with DreamFactory.'
            }
        };

    }]);
