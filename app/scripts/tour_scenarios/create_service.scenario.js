var createServiceScenario = {
    steps: [

        {
            name: 'services-tab',
            type: 'click',
            options: {
                title: 'Services Tab',
                text: 'Click on this tab to go to the services page.',
                attachTo: {element: '.tutorial-step-services-tab', on: 'bottom'},
                advanceOn: {element: '.tutorial-step-services-tab', on: 'click'},
                buttons: [
                    {
                        type: 'skip'
                    }
                ]
            }
        },

        {
            name: 'create-button',
            type: 'click',
            options: {
                title: 'Create Button',
                text: 'Clicking on this button will take you to the create form.',
                attachTo: {element: '.tutorial-step-create-service-button', on: 'bottom'},
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
                            $('.tutorial-step-create-service-button').click(function () {
                                createServiceScenario.tour.next()
                            });
                        }
                }
            ]
        },

        {
            name: 'selecting-service-type',
            type: 'select',
            options: {
                title: 'Service Type',
                text: 'Open select. Next go to \'Database\' category. Next find and choose MySQL',
                attachTo: {element: '.tutorial-step-selecting-service-type-dropdown', on: 'top'},
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
                            $('.tutorial-step-selecting-service-type-dropdown-list').css('z-index', '1102');

                            $('.tutorial-step-service-type-selected').on('click', function () {
                                if ($('.tutorial-step-selecting-service-type-dropdown').text().indexOf('MySQL') !== -1) {
                                    createServiceScenario.tour.next()
                                }
                            });
                        }
                },
                {
                    event: 'before-hide',
                    handler: function () {
                        $('.tutorial-step-selecting-service-type-dropdown-list').css('z-index', 'auto');
                    }
                }
            ]
        },

        {
            name: 'service-name-input',
            type: 'input',
            options: {
                title: 'Service Name',
                text: 'Enter a name for making API requests, such as \'db\' which will result in \'/api/v2/db.\'',
                attachTo: {element: '.tutorial-service-name', on: 'top'},
                buttons: [

                    {
                        type: 'skip'
                    },
                    {
                        type: 'next',
                        action: function () {
                            if ($('.tutorial-service-name').val() !== '') {
                                createServiceScenario.tour.next()
                            }
                        }
                    }
                ]

            }
        },

        {
            name: 'service-label-input',
            type: 'input',
            options: {
                title: 'Label',
                text: 'Enter a display name for the service.',
                attachTo: {element: '.tutorial-service-label', on: 'top'},
                scrollTo: true,
                buttons: [

                    {
                        type: 'skip'
                    },
                    {
                        type: 'back'
                    },
                    {
                        type: 'next'
                    }
                ]

            }
        },

        {
            name: 'service-active-checkbox',
            type: 'notice',
            options: {
                title: 'Activate',
                text: 'Make sure the checkbox is checked.',
                attachTo: {element: '.tutorial-step-active-service-checkbox', on: 'bottom'},
                scrollTo: true,
                buttons: [

                    {
                        type: 'skip'
                    },
                    {
                        type: 'back'
                    },
                    {
                        type: 'next'
                    }
                ]

            }

        },

        {
            name: 'service-config-tab',
            type: 'click',
            options: {
                title: 'Config Tab',
                text: 'Next click on this tab to do further service specific configurations.',
                attachTo: {element: '#config-tab', on: 'bottom'},
                scrollTo: true,
                buttons: [

                    {
                        type: 'skip'
                    },
                    {
                        type: 'back'
                    }
                ]

            },
            eventHandlers: [
                {
                    event: 'show',
                    handler:
                        function () {
                            $('#config-tab').on('click', createServiceScenario.tour.next);
                        }
                },
                {
                    event: 'hide',
                    handler:
                        function () {
                            $('#config-tab').unbind("click", createServiceScenario.tour.next);
                        }
                }
            ]
        },

        {
            name: 'service-host-input',
            type: 'input',
            options: {
                title: 'Host',
                text: 'Enter the host where database is running, i.e. localhost, 192.168.1.1, etc.',
                attachTo: {element: '.tutorial-step-host-input', on: 'top'},
                buttons: [

                    {
                        type: 'skip'
                    },

                    {
                        type: 'back',
                        action: function () {
                            $("#info-tab").trigger("click");
                            createServiceScenario.tour.back()
                        }

                    },
                    {
                        type: 'next'
                    }
                ]

            }

        },

        {
            name: 'service-port-input',
            type: 'input',
            options: {
                title: 'Port Number',
                text: 'Enter the number of the port where database is running, i.e. 3306 which is default for MySql',
                attachTo: {element: '.tutorial-step-port', on: 'top'},
                buttons: [

                    {
                        type: 'skip'
                    },

                    {
                        type: 'back'
                    },
                    {
                        type: 'next'
                    }
                ]

            }

        },

        {
            name: 'service-database-input',
            type: 'input',
            options: {
                title: 'Database',
                text: 'Enter a name of the database to connect to on the given server.',
                attachTo: {element: '.tutorial-step-database-input', on: 'top'},
                scrollTo: true,
                scrollToHandler: function () {
                    document.getElementById('scroll-element').scrollTop = 350;
                },
                buttons: [

                    {
                        type: 'skip'
                    },

                    {
                        type: 'back'
                    },
                    {
                        type: 'next'
                    }
                ]

            }

        },

        {
            name: 'service-username-input',
            type: 'input',
            options: {
                title: 'Username',
                text: 'Enter a name of the database user.',
                attachTo: {element: '.tutorial-step-username-input', on: 'top'},
                buttons: [

                    {
                        type: 'skip'
                    },

                    {
                        type: 'back'

                    },
                    {
                        type: 'next'
                    }
                ]

            }

        },

        {
            name: 'service-user-password-input',
            type: 'input',
            options: {
                title: 'User Password',
                text: 'Enter a password and for the given user.',
                attachTo: {element: '.tutorial-step-password-input', on: 'top'},
                buttons: [

                    {
                        type: 'skip'
                    },

                    {
                        type: 'back'
                    },
                    {
                        type: 'next'
                    }
                ]

            }

        },

        {
            name: 'service-schema-input',
            type: 'input',
            options: {
                title: 'Schema',
                text: '<p>Type "default" to only work with the default schema for the given credentials,</p>' +
                '<p> or type in a specific schema to use for this service.</p>',
                attachTo: {element: '.tutorial-step-schema-input', on: 'top'},
                scrollTo: true,
                scrollToHandler: function () {
                    document.getElementById('scroll-element').scrollTop = 600;
                },
                buttons: [

                    {
                        type: 'skip'
                    },

                    {
                        type: 'back'

                    },
                    {
                        type: 'next'
                    }
                ]

            }

        },

        {
            name: 'service-character-set-input',
            type: 'input',
            options: {
                title: 'Character Set',
                text: 'The character set to use for this connection, i.e. utf8.',
                attachTo: {element: '.tutorial-step-charset-input', on: 'top'},
                buttons: [

                    {
                        type: 'skip'
                    },

                    {
                        type: 'back'
                    },
                    {
                        type: 'next'
                    }
                ]

            }

        },

        {
            name: 'service-character-set-collation-input',
            type: 'input',
            options: {
                title: 'Character Set Collation ',
                text: 'The character set collation to use for this connection, i.e. utf8_unicode_ci.',
                attachTo: {element: '.tutorial-step-collation-input', on: 'top'},
                scrollTo: true,
                scrollToHandler: function () {
                    document.getElementById('scroll-element').scrollTop = 700;
                },
                buttons: [

                    {
                        type: 'skip'
                    },

                    {
                        type: 'back'
                    },
                    {
                        type: 'next'
                    }
                ]

            }

        },

        {
            name: 'service-save-button',
            type: 'input',
            options: {
                title: 'Save',
                text: 'Click save to finalize the service setup.',
                attachTo: {element: '#services_details_save   ', on: 'top'},
                scrollTo: true,
                buttons: [

                    {
                        type: 'skip'
                    },

                    {
                        type: 'back'
                    }
                ]

            }

        },

        {
            name: 'show-created-service',
            type: 'click',
            options: {
                title: 'New Serice',
                text: 'Notice a new service in a list. Now it is ready to use.',
                attachTo: {element: '.tutorial-step-created-service', on: 'top'},
                scrollTo: true,
                buttons: [
                    {
                        type: 'done'
                    }
                ]

            },
            eventHandlers: [
                {
                    event: 'before-show',
                    handler:
                        function () {
                            $('body').removeClass('shepherd-active');
                            document.getElementById('services-table').lastElementChild.lastElementChild.classList.add('tutorial-step-created-service')
                        }
                }
            ]
        }
    ]
};