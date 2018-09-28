FeatureTour.scenarios.scripting = {
    steps: [
        {
            name: 'scripts-tab',
            type: 'click',
            options: {
                title: 'Scripts Tab',
                text: 'Click on this tab to go to the scripts page.',
                attachTo: {element: '[data-tutorial=scripting][data-step=scripts-tab]', on: 'bottom'},
                advanceOn: {element: '[data-tutorial=scripting][data-step=scripts-tab]', on: 'click'},
                buttons: [
                    {
                        type: 'skip'
                    }
                ]
            }
        },

        {
            name: 'choose-system-service',
            type: 'click',
            options: {
                title: 'System Service',
                text: 'Select system service',
                attachTo:  { element: '[data-tutorial=scripting][data-step=select-service-system]', on: 'bottom'},
                advanceOn: { element: '[data-tutorial=scripting][data-step=select-service-system]', on: 'click'},
                buttons: [
                    {
                        type: 'skip'
                    }
                ]
            }
        },

        {
            name: 'choose-system-admin',
            type: 'click',
            options: {
                title: 'Admin',
                text: 'Select system.admin',
                attachTo: {element: '[data-tutorial=scripting][data-step=choose-system-admin]', on: 'bottom'},
                buttons: [
                    {
                        type: 'skip'
                    }
                ]
            }
        },

        {
            name: 'choose-admin-post-process',
            type: 'click',
            options: {
                title: 'Post Process',
                text: 'Select system.admin.get.post_process',
                attachTo: {element: '[data-tutorial=scripting][data-step=system-admin-get-post_process]', on: 'bottom'},
                buttons: [
                    {
                        type: 'skip'
                    }
                ]
            }
        },

        {
            name: 'again-choose-admin-post-process',
            type: 'click',
            options: {
                title: 'Post Process',
                text: 'Select system.admin.get.post_process again',
                attachTo: {element: '[data-tutorial=scripting][data-step=system-admin-get-post_process-again]', on: 'bottom'},
                buttons: [
                    {
                        type: 'skip'
                    }
                ]
            },
            eventHandlers: [
                {
                    event: 'show',
                    handler:
                        function () {
                            $('[data-tutorial=scripting][data-step=system-admin-get-post_process-again]').on('click', function () {
                                setTimeout(function(){
                                    FeatureTour.current.next();
                                }, 100)
                            });
                        }
                }
            ]
        },

        {
            name: 'choose-language',
            type: 'select',
            options: {
                title: 'Select Language',
                text: 'Open the list above and select PHP',
                attachTo: {element: '[data-tutorial=scripting][data-step=choose-language]', on: 'bottom'},
                buttons: [
                    {
                        type: 'skip'
                    }
                ]
            },
            eventHandlers: [
                {
                    event: 'show',
                    handler:
                        function () {
                            var $select = $('[data-tutorial=scripting][data-step=choose-language]');
                            $select.on('change', function (e) {
                                if ($select.find('option').filter(':selected').val() === "string:php") {
                                    FeatureTour.current.next();
                                }
                            });
                        }
                }
            ]
        },

        {
            name: 'activate-script',
            type: 'click',
            options: {
                title: 'Activate Script',
                text: 'Check the checkbox to make a script active. You can later turn it off by unchecking this checkbox.',
                attachTo: {element: '[data-tour=scripting][data-step=activate-script]', on: 'bottom'},
                advanceOn: {element: '[data-tour=scripting][data-step=activate-script]', on: 'click'},
                buttons: [
                    {
                        type: 'skip'
                    }
                ]
            },
            eventHandlers: [
                {
                    event: 'show',
                    handler:
                        function () {
                            // $('.tutorial-step-selecting-service-type-dropdown-list').css('z-index', '1102');
                            var $checkbox = $('[data-tour=scripting][data-step=activate-script]');
                            $checkbox.on('change', function (e) {
                                if ($checkbox.is(":checked")) {
                                    FeatureTour.current.next();
                                }
                            });
                        }
                }
            ]
        },

        {
            name: 'modify-response',
            type: 'click',
            options: {
                title: 'Modify Response',
                text: 'Check this checkbox to allow the modification of response which will then be available for using in script.',
                attachTo: {element: '[data-tour=scripting][data-step=modify-response]', on: 'bottom'},
                // advanceOn: {element: '.tutorial-step-select-service-system', on: 'click'},
                buttons: [
                    {
                        type: 'skip'
                    }
                ]
            },
            eventHandlers: [
                {
                    event: 'show',
                    handler:
                        function () {
                            // $('.tutorial-step-selecting-service-type-dropdown-list').css('z-index', '1102');
                            var $checkbox = $('[data-tour=scripting][data-step=modify-response]');
                            $checkbox.on('change', function (e) {
                                if ($checkbox.is(":checked")) {
                                    FeatureTour.current.next();
                                }
                            });
                        }
                }
            ]
        },

        {
            name: 'show-script-editor',
            type: 'notice',
            options: {
                title: 'Script Editor',
                text: "Notice the editor area. This is a place where you can write your custom scripts.<br>This time we will do it for you. So after you click next we will automatically fill in the example script.",
                attachTo: {element: '[data-tour=scripting][data-step-1=show-script-editor]', on: 'top'},
                // advanceOn: {element: '.tutorial-step-select-service-system', on: 'click'},
                buttons: [
                    {
                        type: 'skip'
                    },
                    {
                        type: 'next'
                    }
                ]
            }
        },

        {
            name: 'fill-in-example-script',
            type: 'notice',
            options: {
                title: 'Example Script',
                text: "Notice that we just inserted an example script.<br>It simply operates with response object by adding a custom field.",
                attachTo: {element: '[data-tour=scripting][data-step-2=fill-in-script]', on: 'top'},
                buttons: [
                    {
                        type: 'skip'
                    },
                    {
                        type: 'next'
                    }
                ]
            },
            eventHandlers: [
                {
                    event: 'show',
                    handler:
                        function () {
                            var $scope = angular.element($('.scripts-page')[0]).scope().$parent;
                            $scope.$apply(function(x){x.currentScriptObj.content = "$responseBody = $event['response']['content'];\n\n$responseBody['my_custom_field'] = [\n            'content' => [\n                'success' => true,\n                'message' => \"This is just an example message.\"\n            ]\n        ];\n        \n$event['response']['content'] = $responseBody;\n"});
                        }
                }
            ]
        },

        {
            name: 'save-example-script',
            type: 'click',
            options: {
                title: 'Save Script',
                text: "Now it is time to save the script.<br>After saving the script you can go to API docs to try it and see that custom field is present in the response.",
                attachTo: {element: '[data-tour=scripting][data-step=save-example-script]', on: 'bottom'},
                buttons: [
                    {
                        type: 'skip'
                    }
                ]
            }
            ,
            eventHandlers: [
                {
                    event: 'show',
                    handler:
                        function () {
                            $('[data-tour=scripting][data-step=save-example-script]').on('click', function () {
                                FeatureTour.current.complete();
                            })
                        }
                }
            ]
        }

    ]
}
