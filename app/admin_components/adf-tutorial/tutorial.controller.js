'use strict';

angular.module('dfTutorial')

    .controller('TutorialController', ['ngIntroService', '$scope', function (ngIntroService, $scope) {

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

        $scope.IntroOptions = {
            steps: [
                {
                    element: document.querySelector('#step1'),
                    intro: "This is the first tooltip."
                },
                {
                    element: document.querySelectorAll('#step2')[0],
                    intro: "<strong>You</strong> can also <em>include</em> HTML",
                    position: 'right'
                },
                {
                    element: '#step3',
                    intro: 'More features, more fun.',
                    position: 'left'
                },
                {
                    element: '#step4',
                    intro: "Another step.",
                    position: 'bottom'
                },
                {
                    element: '#step5',
                    intro: 'Get it, use it.'
                }
            ],
            showStepNumbers: false,
            showBullets: false,
            exitOnOverlayClick: true,
            exitOnEsc: true,
            nextLabel: 'next',
            prevLabel: '<span style="color:green">Previous</span>',
            skipLabel: 'Exit',
            doneLabel: 'Thanks'
        };

        $scope.CompletedEvent = function () {
            console.log('[directive] completed Event')
        }
        $scope.ExitEvent = function () {
            console.log('[directive] exit Event')
        }
        $scope.ChangeEvent = function (element) {
            console.log('[directive] change Event')
            console.info(element);
        }
        $scope.BeforeChangeEvent = function (element) {
            console.log('[directive] beforeChange Event')
            console.info(element);
        }
        $scope.AfterChangeEvent = function (element) {
            console.log('[directive] after change Event')
            console.info(element);
        }
        $scope.clearAndStartNewIntro = function () {
            $scope.IntroOptions = {
                steps: [
                    {
                        element: document.querySelector('#step1'),
                        intro: "After being cleared, step 1"
                    },
                    {
                        element: '#step2',
                        intro: 'Setup and details :)',
                        position: 'right'
                    },
                    {
                        element: '.jumbotron',
                        intro: 'We added a small feature, adding <pre>ng-intro-disable-button</pre> your buttons will be disabled when introJs is open :) <br><p style="color:red">if you\'re using anchor tags, you should prevent ng-click manually. </p> <p> <a target="_blank" href="https://github.com/mendhak/angular-intro.js/wiki/How-to-prevent-a-ng-click-event-when-a-tag--a--is-disabled%3F">click here for more details.</a></p>'
                    }
                ],
                showStepNumbers: true,
                showBullets: true,
                exitOnOverlayClick: false,
                exitOnEsc: false,
                nextLabel: '<strong style="color:green">Next!</strong>',
                prevLabel: '<span style="color:red">Previous</span>',
                skipLabel: 'Skip',
                doneLabel: 'Done'
            };


            ngIntroService.clear();
            ngIntroService.setOptions($scope.IntroOptions);

            ngIntroService.onComplete(function () {
                console.log('update some cookie or localstorage.')
                console.log(arguments)
            })

            ngIntroService.onExit(function () {
                console.log("[service] exit");
            })

            ngIntroService.onBeforeChange(function (element) {
                console.log("[service] before change");
                console.info(element);
            })

            ngIntroService.onChange(function (element) {
                console.log("[service] on change");
                console.info(element);

            })

            ngIntroService.onAfterChange(function (element) {
                console.log("[service] after Change");
                console.info(element);
            })

            ngIntroService.start();
        }
    }])


