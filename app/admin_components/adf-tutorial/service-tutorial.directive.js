'use strict';

angular.module('dfTutorial')

    .directive('dfServiceTutorial', ['MOD_TUTORIALS_ASSET_PATH', 'dfTutorial', function (MOD_TUTORIALS_ASSET_PATH, dfTutorial) {

        return {
            restrict: 'E',
            templateUrl: MOD_TUTORIALS_ASSET_PATH + 'views/service-tutorial.html',
            link: function (scope, elem, attrs) {


                scope.start = function () {

                    var tour = new Shepherd.Tour({
                        defaultStepOptions: {
                            classes: 'shepherd-theme-arrows',
                            scrollTo: true
                        }
                    });

                    dfTutorial.fillWithScenario(tour, createServiceScenario);

                    tour.start();
                };
            }
        };
    }]);