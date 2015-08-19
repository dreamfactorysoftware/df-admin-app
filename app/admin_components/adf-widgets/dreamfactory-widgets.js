angular.module('dfWidgets', [])

    // Set a constant so we can access the 'local' path of our assets
    .constant('MOD_WIDGETS_ASSET_PATH', 'admin_components/adf-widgets/')

    .directive('dfTwitter', ['MOD_WIDGETS_ASSET_PATH', '$http', function (MOD_WIDGETS_ASSET_PATH, $http) {

        return {
            restrict: 'E',
            scope: {},
            templateUrl: MOD_WIDGETS_ASSET_PATH + 'views/df-twitter.html',
            link: function (scope, elem, attrs) {



                //@TODO: Need to setup a service to handle this on the server






            }
        }
    }])

    .directive('dfBlog', ['MOD_WIDGETS_ASSET_PATH', function (MOD_WIDGETS_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: {},
            templateUrl: MOD_WIDGETS_ASSET_PATH + 'views/df-blog.html',
            link: function (scope, elem, attrs) {


            }
        }
    }])
    .directive('dfEvents', ['MOD_WIDGETS_ASSET_PATH', function (MOD_WIDGETS_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: {},
            templateUrl: MOD_WIDGETS_ASSET_PATH + 'views/df-events.html',
            link: function (scope, elem, attrs) {


            }
        }
    }])

    .directive('dfNews', ['MOD_WIDGETS_ASSET_PATH', function (MOD_WIDGETS_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: {},
            templateUrl: MOD_WIDGETS_ASSET_PATH + 'views/df-news.html',
            link: function (scope, elem, attrs) {


            }
        }
    }]);
