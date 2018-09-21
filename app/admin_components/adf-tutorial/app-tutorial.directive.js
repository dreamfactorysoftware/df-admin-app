'use strict';

angular.module('dfTutorial')

    .directive('dfAppTutorial',  ['MOD_TUTORIALS_ASSET_PATH', function (MOD_TUTORIALS_ASSET_PATH) {

        return {
            restrict: 'E',
            templateUrl: MOD_TUTORIALS_ASSET_PATH + 'views/app-tutorial.html',
            link: function (scope, elem, attrs) {

            }
        };
    }]);