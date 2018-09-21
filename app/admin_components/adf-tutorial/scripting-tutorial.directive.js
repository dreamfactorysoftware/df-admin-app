'use strict';

angular.module('dfTutorial')

    .directive('dfScriptingTutorial',  ['MOD_TUTORIALS_ASSET_PATH', function (MOD_TUTORIALS_ASSET_PATH) {

        return {
            restrict: 'E',
            templateUrl: MOD_TUTORIALS_ASSET_PATH + 'views/scripting-tutorial.html',
            link: function (scope, elem, attrs) {

            }
        };
    }]);