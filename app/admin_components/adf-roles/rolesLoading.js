(function(app) {

  var rolesLoading = function($rootScope) {
    return {
      restrict: 'E',
      template: "<div class='col-lg-12' ng-if='isRouteLoading'><span style='display: block; width: 100%; text-align: center; color: #A0A0A0; font-size: 50px; margin-top: 100px'><i class='fa fa-refresh fa-spin'></i></div>"
    };
  };
  rolesLoading.$inject = ['$rootScope'];

  app.directive('rolesLoading', rolesLoading);

}(angular.module('dfRoles')));
