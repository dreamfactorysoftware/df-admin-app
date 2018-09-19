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

                var step1 = tour.addStep('services-tab', {
                    title: 'Services Tab',
                    text: 'Tab with settings related to services. Let\'s open it.',
                    attachTo: {element: '.tutorial-step-services-tab', on: 'bottom'},
                    advanceOn: {element: '.tutorial-step-services-tab', on: 'click'},
                    buttons: [

                        {
                            text: 'skip',
                            action: tour.complete
                        }
                    ]

                });

                step1.on('show', function () {
                    angular.element('.tutorial-step-services-tab').addClass('highlighted-element');
                });
                step1.on('before-hide', function () {
                    angular.element('.tutorial-step-services-tab').removeClass('highlighted-element')
                });

                var step2 = tour.addStep('create-button', {
                    title: 'Button for service creating',
                    text: 'Let\'s create a service. Click on the button.',
                    attachTo: {element: '.tutorial-step-create-service-button', on: 'bottom'},
                    advanceOn: {element: '.tutorial-step-create-service-button', on: 'click'},
                    buttons: [
                        {
                            text: 'skip',
                            action: tour.complete
                        }
                    ]
                });

                step2.on('show', function () {
                    $('.tutorial-step-create-service-button').on('click', function (event) {
                        tour.next()
                    });
                    angular.element('.tutorial-step-create-service-button').addClass('highlighted-element');
                });

                step2.on('before-hide', function () {
                    angular.element('.tutorial-step-create-service-button').removeClass('highlighted-element')
                });

                var step3 = tour.addStep('selecting-service-type', {
                    title: 'Service type',
                    text: 'Select service type',
                    attachTo: {element: '.tutorial-step-selecting-service-type-dropdown', on: 'top'},
                    buttons: [

                        {
                            text: 'skip',
                            action: tour.complete
                        }
                    ]
                });

                step3.on('show', function () {
                    angular.element('.tutorial-step-selecting-service-type-dropdown').addClass('highlighted-element');
                    angular.element('.tutorial-step-selecting-service-type-dropdown-list').css('z-index', '1102');

                    $('.tutorial-step-service-type-selected').on('click', function (event) {
                        if ($('.tutorial-step-selecting-service-type-dropdown').text().indexOf('MongoDB') !== -1) {
                            tour.next()
                        }
                    });

                });

                step3.on('before-hide', function () {
                    angular.element('.tutorial-step-selecting-service-type-dropdown').removeClass('highlighted-element')
                    angular.element('.tutorial-step-selecting-service-type-dropdown-list').css('z-index', 'auto;');
                });

                var step4 = tour.addStep('service-name-input', {
                    title: 'Service name',
                    text: 'Type service name and click next.',
                    attachTo: {element: '.tutorial-service-name', on: 'top'},
                    buttons: [

                        {
                            text: 'skip',
                            action: tour.complete
                        },
                        {
                            text: 'next',
                            action: tour.next
                        },
                    ]
                });


                step4.on('show', function () {
                    angular.element('.tutorial-service-name').addClass('highlighted-element');

                });

                step4.on('before-hide', function () {
                    angular.element('.tutorial-service-name').removeClass('highlighted-element')
                });

                var step5 = tour.addStep('service-name-input', {
                    title: 'Service label',
                    text: 'Type service label and click next.',
                    attachTo: {element: '.tutorial-service-label', on: 'top'},
                    buttons: [

                        {
                            text: 'skip',
                            action: tour.complete
                        },
                        {
                            text: 'next',
                            action: tour.next
                        },
                    ]
                });


                step5.on('show', function () {
                    angular.element('.tutorial-service-label').addClass('highlighted-element');

                });

                step5.on('before-hide', function () {
                    angular.element('.tutorial-service-label').removeClass('highlighted-element')
                });

            }
        };
    }])