'use strict';

angular.module('dfTutorial')

    .directive('dfServiceTutorial', ['MOD_TUTORIALS_ASSET_PATH', function (MOD_TUTORIALS_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: {
                apiData: '=?'
            },
            templateUrl: MOD_TUTORIALS_ASSET_PATH + 'views/service-tutorial.html',
            link: function (scope, elem, attrs) {

            }
        };
    }])