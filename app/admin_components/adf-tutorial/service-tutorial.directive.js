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

                function subscribeHighlightingElement(step) {
                    var selector = step.options.attachTo.element;
                    step.on('show', function () {
                        angular.element(selector).addClass('highlighted-element');
                    });
                    step.on('before-hide', function () {
                        angular.element(selector).removeClass('highlighted-element')
                    });
                }

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
                    showCancelLink: true,
                    buttons: [

                        {
                            text: 'skip',
                            action: tour.complete
                        }
                    ]

                });

                subscribeHighlightingElement(step1);


                var step2 = tour.addStep('create-button', {
                    title: 'Button to create a service',
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
                });

                subscribeHighlightingElement(step2);

                var step3 = tour.addStep('selecting-service-type', {
                    title: 'Service type',
                    text: 'Select \'Database\' service type and choose MongoDB',
                    attachTo: {element: '.tutorial-step-selecting-service-type-dropdown', on: 'top'},
                    buttons: [

                        {
                            text: 'skip',
                            action: tour.complete
                        }
                    ]
                });

                step3.on('show', function () {
                    angular.element('.tutorial-step-selecting-service-type-dropdown-list').css('z-index', '1102');

                    $('.tutorial-step-service-type-selected').on('click', function (event) {
                        if ($('.tutorial-step-selecting-service-type-dropdown').text().indexOf('MongoDB') !== -1) {
                            tour.next()
                        }
                    });

                });

                subscribeHighlightingElement(step3);

                step3.on('before-hide', function () {
                    angular.element('.tutorial-step-selecting-service-type-dropdown-list').css('z-index', 'auto;');
                });

                var step4 = tour.addStep('service-name-input', {
                    title: 'Service name',
                    text: 'Select a name for making API requests, such as \'db\' in /api/v2/db.',
                    attachTo: {element: '.tutorial-service-name', on: 'top'},
                    buttons: [

                        {
                            text: 'skip',
                            action: tour.complete
                        },
                        {
                            text: 'next',
                            action: tour.next
                        }
                    ]
                });


                subscribeHighlightingElement(step4);


                var step5 = tour.addStep('service-label-input', {
                    title: 'Label',
                    text: 'The display name or label for the service.',
                    attachTo: {element: '.tutorial-service-label', on: 'top'},
                    scrollTo: true,
                    buttons: [

                        {
                            text: 'skip',
                            action: tour.complete
                        },
                        {
                            text: 'next',
                            action: tour.next
                        }
                    ]
                });

                subscribeHighlightingElement(step5);

                var step6 = tour.addStep('service-active-checkbox', {
                    title: 'The \'active\' checkbox',
                    text: 'You can make your service inactive when you need.',
                    attachTo: {element: '.tutorial-step-active-service-checkbox', on: 'bottom'},
                    scrollTo: true,
                    buttons: [

                        {
                            text: 'skip',
                            action: tour.complete
                        },
                        {
                            text: 'next',
                            action: tour.next
                        }
                    ]
                });

                subscribeHighlightingElement(step6);

                var step7 = tour.addStep('service-config-tab', {
                    title: 'Config tab',
                    text: 'Let\'s open config tab.',
                    attachTo: {element: '#config-tab', on: 'bottom'},
                    scrollTo: true,
                    buttons: [

                        {
                            text: 'skip',
                            action: tour.complete
                        }
                    ]
                });

                step7.on('show', function () {
                    $('#config-tab').on('click', function () {
                        tour.next()
                    });
                });

                subscribeHighlightingElement(step7);

                var step8 = tour.addStep('service-host-input', {
                    title: 'Host',
                    text: 'The name of the database host, i.e. localhost, 192.168.1.1, etc.',
                    attachTo: {element: '.tutorial-step-host-input', on: 'top'},
                    buttons: [
                        {
                            text: 'skip',
                            action: tour.complete
                        },
                        {
                            text: 'next',
                            action: tour.next
                        }
                    ]
                });


                subscribeHighlightingElement(step8);


                var step9 = tour.addStep('service-port-input', {
                    title: 'Port Number',
                    text: 'The number of the database host port, i.e. 27017',
                    attachTo: {element: '.tutorial-step-port', on: 'top'},
                    buttons: [

                        {
                            text: 'skip',
                            action: tour.complete
                        },
                        {
                            text: 'next',
                            action: tour.next
                        }
                    ]
                });
                subscribeHighlightingElement(step9);

                var step10 = tour.addStep('service-database-input', {
                    title: 'Database',
                    text: 'The name of the database to connect to on the given server.',
                    attachTo: {element: '.tutorial-step-database-input', on: 'top'},
                    scrollTo: true,
                    scrollToHandler: function(){
                        document.getElementById('scroll-element').scrollTop = 350;
                    },
                    buttons: [
                        {
                            text: 'skip',
                            action: tour.complete
                        },
                        {
                            text: 'next',
                            action: tour.next
                        }
                    ]
                });
                subscribeHighlightingElement(step10);

                var step11 = tour.addStep('service-username-input', {
                    title: 'Username',
                    text: 'The name of the database user.',
                    attachTo: {element: '.tutorial-step-username-input', on: 'top'},
                    buttons: [

                        {
                            text: 'skip',
                            action: tour.complete
                        },
                        {
                            text: 'next',
                            action: tour.next
                        }
                    ]
                });
                subscribeHighlightingElement(step11);

                var step12 = tour.addStep('service-user-password-input', {
                    title: 'User password',
                    text: 'Type password and click next.',
                    attachTo: {element: '.tutorial-step-password-input', on: 'top'},
                    buttons: [

                        {
                            text: 'skip',
                            action: tour.complete
                        },
                        {
                            text: 'next',
                            action: tour.next
                        }
                    ]
                });
                subscribeHighlightingElement(step12);

                var step13 = tour.addStep('service-dns-input', {
                    title: 'Service connecting string',
                    text: 'Type connecting string and click next.',
                    attachTo: {element: '.tutorial-step-dsn-input', on: 'top'},
                    scrollTo: true,
                    scrollToHandler: function(){
                        document.getElementById('scroll-element').scrollTop = 450;
                    },
                    buttons: [

                        {
                            text: 'skip',
                            action: tour.complete
                        },
                        {
                            text: 'next',
                            action: tour.next
                        }
                    ]
                });
                subscribeHighlightingElement(step13);

                var step14 = tour.addStep('service-save-button', {
                    title: 'Save the new service',
                    text: 'Click save.',
                    attachTo: {element: '#services_details_save   ', on: 'top'},
                    scrollTo: true,
                    buttons: [
                        {
                            text: 'skip',
                            action: tour.complete
                        }
                    ]
                });

                subscribeHighlightingElement(step14);

                // var step15 = tour.addStep('show-created-service', {
                //     title: 'Service which we have created',
                //     text: 'God job :)',
                //     attachTo: {element: '.tutorial-step-created-service', on: 'top'},
                //     scrollTo: true,
                //     buttons: [
                //         {
                //             text: 'skip',
                //             action: tour.complete
                //         }
                //     ]
                // });
                //
                // subscribeHighlightingElement(step15);
                //
                // step15.on('before-show', function () {
                //     console.log('before-show')
                //     document.getElementById('services-table').lastElementChild.lastElementChild.classList.add('tutorial-step-created-service')
                //
                // });


            }
        };
    }]);