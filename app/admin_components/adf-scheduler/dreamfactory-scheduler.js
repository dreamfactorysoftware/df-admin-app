'use strict';


angular.module('dfScheduler', ['ngRoute', 'dfUtility'])
    .constant('MOD_SCHEDULER_ROUTER_PATH', '/scheduler')
    .constant('MOD_SCHEDULER_ASSET_PATH', 'admin_components/adf-scheduler/')
    .config(['$routeProvider', 'MOD_SCHEDULER_ROUTER_PATH', 'MOD_SCHEDULER_ASSET_PATH',
        function ($routeProvider, MOD_SCHEDULER_ROUTER_PATH, MOD_SCHEDULER_ASSET_PATH) {
            $routeProvider
                .when(MOD_SCHEDULER_ROUTER_PATH, {
                    templateUrl: MOD_SCHEDULER_ASSET_PATH + 'views/main.html',
                    controller: 'SchedulerCtrl',
                    resolve: {
                        checkUser: ['checkUserService', function (checkUserService) {
                            return checkUserService.checkUser();
                        }]
                    }
                });
        }])

    .run([function () {

    }])

    .controller('SchedulerCtrl', ['$rootScope', '$scope', 'dfApplicationData', 'dfNotify', '$location', function ($rootScope, $scope, dfApplicationData, dfNotify, $location) {

        $scope.$parent.title = 'Scheduler';
        $scope.$parent.titleIcon = 'clock-o';

        // Set module links
        $scope.links = [
            {
                name: 'manage-tasks',
                label: 'Manage',
                path: 'manage-tasks'
            },
            {
                name: 'create-task',
                label: 'Create',
                path: 'create-task'
            }
        ];

        // Set empty section options
        $scope.emptySectionOptions = {
            title: 'You have no Scheduler Tasks!',
            text: 'Click the button below to get started building your first Scheduler Task. You can always create new tasks by clicking the "Create" tab located in the section menu to the left.',
            buttonText: 'Create A Scheduler Task!',
            viewLink: $scope.links[1]
        };

        $scope.$on('$destroy', function (e) {

            // dump data if not on page 1
            $scope.$broadcast('toolbar:paginate:scheduler:destroy');
        });

        // load data

        $scope.apiData = null;

        $scope.loadTabData = function (init) {

            $scope.dataLoading = true;

            // eventlist is loaded only as needed to improve user experience
            var apis = ['scheduler', 'service_list'];

            dfApplicationData.getApiData(apis).then(
                function (response) {
                    var newApiData = {};
                    apis.forEach(function (value, index) {
                        newApiData[value] = response[index].resource ? response[index].resource : response[index];
                    });
                    $scope.apiData = newApiData;
                    if (init) {
                        $scope.$broadcast('toolbar:paginate:scheduler:load');
                    }
                },
                function (error) {
                    var msg = 'There was an error loading data for the Scheduler tab. Please try refreshing your browser and logging in again.';
                    if (error && error.error && (error.error.code === 401 || error.error.code === 403)) {
                        msg = 'To use the Scheduler tab your role must allow GET access to system/scheduler. To create, update, or delete scheduled tasks you need POST, PUT, DELETE access to /system/scheduler and/or /system/scheduler/*.';
                        $location.url('/home');
                    }
                    var messageOptions = {
                        module: 'Scheduler',
                        provider: 'dreamfactory',
                        type: 'error',
                        message: msg
                    };
                    dfNotify.error(messageOptions);
                }
            ).finally(function () {
                $scope.dataLoading = false;
            });
        };

        $scope.loadTabData(true);
    }])

    .directive('dfManageTasks', ['$rootScope', 'MOD_SCHEDULER_ASSET_PATH', 'dfApplicationData', 'dfNotify', function ($rootScope, MOD_SCHEDULER_ASSET_PATH, dfApplicationData, dfNotify) {

        return {

            restrict: 'E',
            scope: false,
            templateUrl: MOD_SCHEDULER_ASSET_PATH + 'views/df-manage-tasks.html',
            link: function (scope, elem, attrs) {

                angular.forEach(scope.apiData.service_list, function (svc) {
                    if (!svc.components) {
                        svc.components = ["", "*"];
                    }
                });

                scope.services = scope.apiData.service_list;

                var ManagedTask = function (taskData) {


                    taskData['service_name'] = scope._getService(taskData['service_id']).name;
                    taskData['service'] = scope._getService(taskData['service_id']);
                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: taskData
                    };
                };

                scope.tasks = null;

                scope.currentEditTask = null;

                scope.fields = [
                    {
                        name: 'id',
                        label: 'Id',
                        active: true
                    },
                    {
                        name: 'name',
                        label: 'Name',
                        active: true
                    },
                    {
                        name: 'description',
                        label: 'Description',
                        active: true
                    },
                    {
                        name: 'is_active',
                        label: 'Active',
                        active: true
                    },
                    {
                        name: 'service_name',
                        label: 'Service',
                        active: true
                    },
                    {
                        name: 'component',
                        label: 'Component',
                        active: true
                    },
                    {
                        name: 'verb',
                        label: 'Method',
                        active: true
                    },
                    {
                        name: 'frequency',
                        label: 'Frequency',
                        active: true
                    }
                ];

                scope.order = {
                    orderBy: 'id',
                    orderByReverse: false
                };

                scope.selectedTasks = [];


                // PUBLIC API

                scope.editTask = function (task) {
                    scope._editTask(task);
                };

                scope.deleteTask = function (task) {

                    if (dfNotify.confirm("Delete " + task.record.name + "?")) {
                        scope._deleteTask(task);
                    }
                };

                scope.deleteSelectedTasks = function () {

                    if (dfNotify.confirm("Delete selected tasks?")) {
                        scope._deleteSelectedTasks();
                    }
                };

                scope.orderOnSelect = function (fieldObj) {

                    scope._orderOnSelect(fieldObj);
                };

                scope.setSelected = function (task) {

                    scope._setSelected(task);
                };


                // COMPLEX IMPLEMENTATION

                scope._editTask = function (task) {
                    scope.currentEditTask = task;
                };

                scope._getService = function (serviceId) {

                    var i = 0;

                    while (i < scope.services.length) {

                        if (scope.services[i].id === serviceId) {

                            return scope.services[i];
                        }

                        i++;
                    }

                    var messageOptions = {
                        module: 'DreamFactory Scheduler Module',
                        type: 'error',
                        provider: 'dreamfactory',
                        message: 'Service with id "' + serviceId + '" not found.'
                    };

                    dfNotify.error(messageOptions);
                };

                scope._deleteTask = function (task) {

                    var requestDataObj = {
                        params: {},
                        data: task.record
                    };

                    dfApplicationData.deleteApiData('scheduler', requestDataObj).$promise.then(
                        function (result) {

                            // notify success
                            var messageOptions = {
                                module: 'Scheduler',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Scheduler task successfully deleted.'
                            };

                            dfNotify.success(messageOptions);

                            // Was this task previously selected before
                            // we decided to remove them individually
                            if (task.__dfUI.selected) {

                                // This will remove the task from the selected
                                // task array
                                scope.setSelected(task);
                            }

                            scope.$broadcast('toolbar:paginate:scheduler:delete');
                        },

                        function (reject) {

                            // notify success
                            var msg = reject.data.message;
                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: msg ? msg : reject
                            };

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function () {

                        }
                    );
                };

                scope._orderOnSelect = function (fieldObj) {

                    var orderedBy = scope.order.orderBy;

                    if (orderedBy === fieldObj.name) {
                        scope.order.orderByReverse = !scope.order.orderByReverse;
                    } else {
                        scope.order.orderBy = fieldObj.name;
                        scope.order.orderByReverse = false;
                    }
                };

                scope._setSelected = function (task) {

                    var i = 0;

                    while (i < scope.selectedTasks.length) {

                        if (task.record.id === scope.selectedTasks[i]) {

                            task.__dfUI.selected = false;
                            scope.selectedTasks.splice(i, 1);
                            return;
                        }

                        i++;
                    }

                    task.__dfUI.selected = true;
                    scope.selectedTasks.push(task.record.id);
                };

                scope._deleteSelectedTasks = function () {

                    var requestDataObj = {
                        params: {
                            ids: scope.selectedTasks.join(','),
                            rollback: true
                        }
                    };

                    dfApplicationData.deleteApiData('scheduler', requestDataObj).$promise.then(
                        function (result) {

                            var messageOptions = {
                                module: 'Scheduler',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Scheduler tasks deleted successfully.'
                            };

                            dfNotify.success(messageOptions);

                            scope.selectedTasks = [];

                            scope.$broadcast('toolbar:paginate:scheduler:reset');
                        },

                        function (reject) {
                            var msg = reject.data.message;
                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: msg ? msg : reject
                            };

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function () {

                        }
                    );
                };


                // WATCHERS

                // this fires when the API data changes
                // apiData is passed in to the details directive as data-api-data
                var watchApiData = scope.$watchCollection('apiData.scheduler', function (newValue, oldValue) {

                    var _tasks = [];

                    if (newValue) {
                        angular.forEach(newValue, function (task) {
                            _tasks.push(new ManagedTask(task));
                        });
                        scope.emptySectionOptions.active = (newValue.length === 0);
                    }

                    scope.tasks = _tasks;
                });

                var watchServiceData = scope.$watchCollection('apiData.service_list', function (newValue, oldValue) {

                    if (!newValue) {
                        return;
                    }

                    scope.services = angular.copy(newValue);
                });

                // MESSAGES

                // broadcast by pagination code when new data is available
                scope.$on('toolbar:paginate:scheduler:update', function (e) {

                    scope.loadTabData();
                });

                scope.$on('$destroy', function (e) {

                    // Destroy watchers
                    watchApiData();
                    watchServiceData();
                });
            }
        };
    }])

    .directive('dfSchedulerLoading', [function () {
        return {
            restrict: 'E',
            template: "<div class='col-lg-12' ng-if='dataLoading'><span style='display: block; width: 100%; text-align: center; color: #A0A0A0; font-size: 50px; margin-top: 100px'><i class='fa fa-refresh fa-spin'></i></div>"
        };
    }])

    .directive('dfTaskDetails', ['MOD_SCHEDULER_ASSET_PATH', 'dfApplicationData', 'dfNotify', 'dfObjectService', '$timeout', function (MOD_SCHEDULER_ASSET_PATH, dfApplicationData, dfNotify, dfObjectService, $timeout) {

        return {

            restrict: 'E',
            scope: {
                taskData: '=?',
                newTask: '=?',
                apiData: '=?'
            },
            templateUrl: MOD_SCHEDULER_ASSET_PATH + 'views/df-task-details.html',
            link: function (scope, elem, attrs) {

                var Task = function (taskData) {

                    var newTask = {
                        name: null,
                        description: null,
                        is_active: false,
                        service_id: null,
                        component: null,
                        id: null,
                        verb_mask: 1,
                        frequency: 1
                    };

                    taskData = taskData || newTask;

                    return {
                        __dfUI: {
                            selected: false
                        },
                        record: angular.copy(taskData),
                        recordCopy: angular.copy(taskData)
                    };
                };

                scope.basicInfoError = false;

                scope.task = null;
                scope.isBasicTab = true;

                // Is this going to be a new Task
                if (scope.newTask) {
                    scope.task = new Task();
                }

                // PUBLIC API

                scope.saveTask = function () {

                    if (scope.newTask) {

                        scope._saveTask();
                    } else {

                        scope._updateTask();
                    }
                };

                scope.deleteTask = function () {

                    scope._deleteTask();
                };

                scope.cancelEditor = function () {

                    // merge data from UI into current edit record
                    scope._prepareTaskData();

                    // then compare to original edit record
                    if (!dfObjectService.compareObjectsAsJson(scope.task.record, scope.task.recordCopy)) {

                        if (!dfNotify.confirmNoSave()) {

                            return;
                        }
                    }

                    scope.closeEditor();
                };


                // PRIVATE API

                scope._prepareTaskData = function () {

                    if (!scope.task.record.name) {
                        scope.basicInfoError = true;
                        return;
                    } else {
                        scope.basicInfoError = false;
                    }
                };

                scope.refreshTaskEditor = function ($event) {
                    scope.isBasicTab = $event.target.id === 'basic-tab';
                };

                scope.refreshTaskConfigEditor = function () {

                    // click Access tab
                    $timeout(function () {
                        angular.element('#config-tab').trigger('click');
                    });
                };

                scope.closeEditor = function () {

                    // same object as currentEditTask used in ng-show
                    scope.taskData = null;

                    scope.task = new Task();

                    // reset tabs
                    $timeout(function () {
                        angular.element('#basic-tab').trigger('click');
                    });


                    // reset errors
                    scope.basicInfoError = false;

                    // force to manage view
                    scope.$emit('sidebar-nav:view:reset');
                };


                // COMPLEX IMPLEMENTATION

                scope._saveTask = function () {

                    // merge data from UI into current edit record
                    scope._prepareTaskData();

                    var requestDataObj = {
                        params: {
                            fields: '*',
                        },
                        data: scope.task.record
                    };

                    dfApplicationData.saveApiData('scheduler', requestDataObj).$promise.then(
                        function (result) {

                            var messageOptions = {
                                module: 'Scheduler',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Scheduler task saved successfully.'

                            };

                            dfNotify.success(messageOptions);

                            scope.closeEditor();
                        },

                        function (reject) {
                            var msg = reject.data.message;
                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: msg ? msg : reject

                            };

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function () {

                        }
                    );
                };

                scope._updateTask = function () {

                    // merge data from UI into current edit record
                    scope._prepareTaskData();

                    var requestDataObj = {
                        params: {
                            fields: '*',
                        },
                        data: scope.task.record
                    };

                    dfApplicationData.updateApiData('scheduler', requestDataObj).$promise.then(
                        function (result) {

                            scope.task = new Task(result);

                            var messageOptions = {
                                module: 'Scheduler',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Scheduler task updated successfully.'

                            };

                            dfNotify.success(messageOptions);

                            scope.closeEditor();
                        },

                        function (reject) {
                            var msg = reject.data.message;

                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: msg ? msg : reject
                            };

                            dfNotify.error(messageOptions);
                        }
                    ).finally(
                        function () {

                        }
                    );
                };

                scope._deleteTask = function () {

                    var requestDataObj = {
                        params: {},
                        data: scope.task.record
                    };

                    dfApplicationData.deleteApiData('scheduler', requestDataObj).$promise.then(
                        function (result) {

                            // notify success
                            var messageOptions = {
                                module: 'Scheduler',
                                type: 'success',
                                provider: 'dreamfactory',
                                message: 'Scheduler task successfully deleted.'
                            };

                            dfNotify.success(messageOptions);

                            scope.task = null;
                        },

                        function (reject) {
                            var msg = reject.data.message;
                            var messageOptions = {
                                module: 'Api Error',
                                type: 'error',
                                provider: 'dreamfactory',
                                message: msg ? msg : reject
                            };

                            dfNotify.error(messageOptions);

                        }
                    ).finally(
                        function () {

                        }
                    );
                };

                // WATCHERS

                // this fires when a record is selected for editing
                // taskData is passed in to the directive as data-task-data
                var watchTaskData = scope.$watch('taskData', function (newValue, oldValue) {

                    if (newValue && !scope.newTask) {
                        scope.task = new Task(newValue);
                    }
                });

                var watchServiceData = scope.$watchCollection('apiData.service_list', function (newValue, oldValue) {

                    if (!newValue) {
                        return;
                    }

                    scope.services = angular.copy(newValue);

                    angular.forEach(scope.services, function (svc) {

                        if (!svc.components) {
                            svc.components = ["", "*"];
                        }
                    });
                });

                // MESSAGES

                scope.$on('$destroy', function (e) {

                    watchTaskData();
                    watchServiceData();
                });

                // HELP

                scope.dfSimpleHelp = {
                    taskConfig: {
                        title: 'Scheduler Task Config',
                        text: 'Create or update Scheduler tasks configs for DreamFactory.'
                    }
                };

                scope.dfLargeHelp = {

                    basic: {
                        title: 'Scheduler Task Overview',
                        text: 'Scheduler task provide a way to schedule requests to the platform.'
                    },
                    config: {
                        title: 'Scheduler Task Config',
                        text: 'This section is responsible for scheduler task config: service, component, method, frequency, payload.'
                    }
                };
            }
        };
    }])

    .directive('schedulerTaskConfig', ['MOD_SCHEDULER_ASSET_PATH', function (MOD_SCHEDULER_ASSET_PATH) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: MOD_SCHEDULER_ASSET_PATH + 'views/df-task-config.html',
            link: function (scope, elem, attrs) {

                scope.verbs = {
                    GET: {name: 'GET', active: false, description: ' (read)', mask: 1},
                    POST: {name: 'POST', active: false, description: ' (create)', mask: 2},
                    PUT: {name: 'PUT', active: false, description: ' (replace)', mask: 4},
                    PATCH: {name: 'PATCH', active: false, description: ' (update)', mask: 8},
                    DELETE: {name: 'DELETE', active: false, description: ' (remove)', mask: 16}
                };

                scope.taskPayloadEditorObj = {"editor": null};
                scope.taskPayloadUpdateCounter = 0;

                scope._toggleVerbState = function (nameStr, event) {
                    if (event !== undefined) {
                        event.stopPropagation();
                    }

                    scope.task.record.verb_mask = scope.verbs[nameStr].mask;
                    scope.task.record.verb = nameStr;

                    if (scope.task.record.verb === "GET") {
                        scope.task.record.payload = null;
                    }
                    document.getElementById('task_verb_picker').click();
                };

                // WATCHERS

                var watchTaskService = scope.$watch('task.record.service', function (newValue, oldValue) {

                    if (!newValue) {
                        return false;
                    }
                    scope.task.record.service_id = newValue.id;
                    scope.task.record.service_name = newValue.name;
                });

                var watchServiceData = scope.$watchCollection('apiData.service_list', function (newValue, oldValue) {

                    if (!newValue) {
                        return;
                    }

                    scope.services = angular.copy(newValue);

                    angular.forEach(scope.services, function (svc) {
                        if (!svc.components) {
                            svc.components = ["", "*"];
                        }
                    });
                });

                scope.$on('$destroy', function (newValue, oldValue) {
                    watchTaskService();
                    watchServiceData();
                });
            }
        };
    }]);