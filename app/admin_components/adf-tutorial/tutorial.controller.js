'use strict';

angular.module('dfTutorial')

    .controller('TutorialController', ['$scope', function ($scope) {

        $scope.$parent.title = 'Tutorials';

        $scope.links = [
            {
                name: 'service',
                label: 'Service',
                path: 'service-tutorial'
            },
            {
                name: 'app',
                label: 'App',
                path: 'app-tutorial'
            }
        ];
    }])


