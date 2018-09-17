'use strict';

angular.module('dfTutorial')

    .directive('dfServiceTutorial', ['MOD_TUTORIALS_ASSET_PATH', '$location', function (MOD_TUTORIALS_ASSET_PATH, $location) {

        return {
            restrict: 'E',
            templateUrl: MOD_TUTORIALS_ASSET_PATH + 'views/service-tutorial.html',
            link: function (scope, elem, attrs) {


                scope.start = function () {
                    tour.start();
                };

                var tour = new Shepherd.Tour({
                    defaultStepOptions: {
                        classes: 'shepherd-theme-arrows',
                        scrollTo: true
                    }
                });

                tour.addStep('example1', {
                    title: 'Services Tab',
                    text: 'Settings related to services.',
                    attachTo: {element: '.tutorial-step-Services ', on: 'bottom'},
                    buttons: [

                        {
                            text: 'Thanks!',
                            action: tour.complete
                        },
                        {
                            text: 'Next',
                            action: function () {
                                scope.$apply($location.url('/services'))
                            }
                        }
                    ]

                })

                tour.addStep('example2', {
                    title: 'Table with services',
                    text: 'These are all services in the system.',
                    attachTo: {element: '.tutorial-table', on: 'bottom'},
                    buttons: [

                        {
                            text: 'Thanks!',
                            action: tour.complete
                        },
                        {
                            text: 'Next',
                            action: function () {
                                angular.element('#services_table_row_3_1').triggerHandler('click');
                                tour.next()
                            }
                        }
                    ]
                })

                tour.addStep('example3', {
                    title: 'Service type',
                    text: 'Service type which was selected during service creation.',
                    attachTo: {element: '.tutorial-dropdown', on: 'bottom'},
                    buttons: [

                        {
                            text: 'Thanks!',
                            action: tour.complete
                        }
                    ]
                })

            }
        };
    }])