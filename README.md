# df-admin-app
AngularJS administration application for the DreamFactory v2.0 and up

Administer your DreamFactory instance from anywhere with this Admin application.  Customize with themes from Bootswatch or roll your own with SCSS/SASS.  Concat, minify, and uglify component modules with Node.js, Grunt, and the included grunt script for a deployment ready application.

## Installing Admin App
Clone the repo.  Navigate to the top level directory of where you cloned the repo and type `bower install`.  **NOTE: you must have Node, Grunt, and GruntCLI installed.**  


## Building the app with Node and Grunt
Admin App comes prepackaged with a grunt file that concats, minifies, uglifies, compresses and reorgs the source files into a more "transit" friendly manner.  It decreases load time and automatically busts client side caches so your changes will be seen the next time a client uses it without any pesky manual cache clearing.  This process will create a folder named `dist` that will contain the app after processing.  From here on out the phrase 'build the app' is referring to this process.  To run the build process simply type `grunt build` on the command line whilst in the top level directory of the app. **NOTE: you must have Node, Grunt, and GruntCLI, and Bower installed.**

Here's how to build the dist version of admin2.

One Time Setup:

```
install node and npm (downloadable installer)
sudo npm install -g bower
sudo npm install -g grunt-cli
cd ~/repos/admin2 (or wherever your repo is)
npm install
bower install
```

Then to rebuild dist folder :

```
grunt build
```

Before committing changes you should revert /dist/fonts and app/index.html. These modified files are unwanted artifacts of the build process.

```
git checkout -- dist/fonts app/index.html
```

## Building a release version

This pushes to master. Running composer update will pull down new version. The basic steps for doing a release with git-flow are as follows. Your local develop and master should be up to date before attempting this.

```
git checkout master
git pull origin master
git checkout develop
git pull origin develop
git flow release start 1.0.7
```

Bump the app version in app/scripts/app.js.

```
// Set application version number
.constant('APP_VERSION', '1.0.7')
```

```
grunt build
git checkout -- dist/fonts app/index.html
git add --all
git commit -m "Release 1.0.7"
git flow release finish 1.0.7
git push origin develop
git checkout master
git push origin master
git push --tags
```

## Administer your DreamFactory instance from anywhere
The Admin App 2 can be configured to manage your DreamFactory instance from another remote server.  Simply open the `app.js` file contained in `app\scripts` directory and add your DreamFactory instance host name to the `INSTANCE_URL` constant at the top.  You can now optionally build the app and deploy the `dist` directory.  You must enable CORS in the DreamFactory instance you will be deploying the app to.


## Theme Admin App 
The Admin App was built using Sass/Scss and compiled with Compass.  This requires [Ruby](https://www.ruby-lang.org/en/downloads/) and Compass.  Follow this [guide](http://compass-style.org/install/) to set it all up.  In `app/styles/sass/partials` you can find the stylesheets for all the custom parts of the admin app as well as a few bootswatch templates (these are named variables(1-8).scss).  All of these are added in a specific order in `styles.scss`.  To change to a different bootswatch theme simply find the '@import variables(1-8).scss' line and change the number.  Or download a different bootswatch theme and replace the current variables.scss with the new themes' variables.scss.  Dont forget to run compass to compile the stylesheets and then optionally build the app and deploy the dist directory.

## Admin App 2 Architecture
The Admin App 2 was designed to have plugable modules.  Every module contains it's own routes, events, and logic so as to remove one would not stop the app from working.  These modules are stored under `app/admin_components`.  In order to faciliate speed when using Admin App 2 a module was designed as a central repository for data that is used frequently in the app.  Many other modules rely on this module for data to do their job but with a small bit of refactoring it can be removed to produce truly untethered modules.

### Main Application
The main application files are located in two directories.  `scripts` and `views` located under the `app` directory.  The `scripts` directory contains your app.js file and a sub directory called `controllers` contains `main.js`.  Corresponding views for controllers defined in `main.js` can be found in the aforementioned `views` directory.  The `app.js` file contains a few constants.  The ones of note are the `INSTANCE_URL` and `ADMIN_API_KEY`.  The `INSTANCE_URL` allows a host to be set which the application and it's modules will refer to for api calls. `ADMIN_API_KEY` is used in a config option defined below the constants that sets the api key for all calls made from the app. `app.js` also defines standard routes for login, logout, registering.  These routes have corresponding controllers defined in `main.js`.

`main.js` defines app specific controllers.  The MainCtrl acts as a top level scope which other modules can query for app wide data. For example, our top level navigation and component navigation links are stored here in arrays which are passed to directives that render the links and control active link highlighting.  Whenever a module is added/removed it's link will need to be handled here.  But you shouldn't encounter this very often (or at all).

Authentication controllers provide attachment points for authentication/register events.  They implement sparse logic in dealing with auth/register events produced by the user management module.  This provides a decoupling between app specific logic for auth/register and the business logic of actually authenticating/registering a user.  See `main.js` comments for more info.

### Data repository and Utility modules

A data repository module called `dfApplicationData` facilitates the loading and management of frequently used application data.  It creates an object called `dfApplicationObj` in the browser session storage.  It contains generic methods to access, modify, and delete data in the application and on the server.  It also provides accessor methods to retrieve and save the actual dfApplicationObj.  While not recommended to interact with this object directly it is sometimes a necessary evil.  The module also contains init code to check whether it is necessary to build a new app object or to refresh the screen with local data as well as what apis to load.  

The utility module provides services, factories, directives, and filters related to the operation of modules.  Things like our icon service, navs, table filtering/pagination, etc are stored here.  Basically, things that multiple modules may need access to and/or have no other place to go.  

## Module Design

A module is defined in the usual AngularJS fashion.  `angular.module(MODULE_NAME, [DEPENDENCIES])`.  Below that line we define a few constants and config for the module.  Because modules are generally small SPA's we have included only one main route.  A sub section of the `dfApps` module is shown below to illustrate this point.  

```javascript
// Module definition
angular.module('dfApps', ['ngRoute', 'dfUtility', 'dfApplication', 'dfHelp', 'dfTable'])

    // Path constants are defined to facilitate ease of reorganization
    .constant('MOD_APPS_ROUTER_PATH', '/apps')

    .constant('MOD_APPS_ASSET_PATH', 'admin_components/adf-apps/')

    // A Route for the module is configured and a bit of access logic is included
    .config(['$routeProvider', 'MOD_APPS_ROUTER_PATH', 'MOD_APPS_ASSET_PATH',
        function ($routeProvider, MOD_APPS_ROUTER_PATH, MOD_APPS_ASSET_PATH) {
            $routeProvider
                .when(MOD_APPS_ROUTER_PATH, {
                    templateUrl: MOD_APPS_ASSET_PATH + 'views/main.html',
                    controller: 'AppsCtrl',
                    resolve: {
                        checkAppObj:['dfApplicationData', function (dfApplicationData) {
                            // is the app in init
                            if (dfApplicationData.initInProgress) {
                            
                                // don't load controller until it is finished
                                return dfApplicationData.initDeferred.promise;
                            }
                        }],

                        checkCurrentUser: ['UserDataService', '$location', function (UserDataService, $location) {

                            var currentUser = UserDataService.getCurrentUser();


                            // If there is no currentUser and we don't allow guest users
                            if (!currentUser) {
                                $location.url('/login')
                            }

                            // There is a currentUser but they are not an admin
                            else if (currentUser && !currentUser.is_sys_admin) {

                                $location.url('/launchpad')
                            }
                        }]
                    }
                });
        }])

    .run(['INSTANCE_URL', '$templateCache', function (INSTANCE_URL, $templateCache) {



    }])
    
    // More module code



```

Every component module is designed in this way.  Modules will usually have a controller where module navigation(sidebar links) will be stored along with a module title.
```javascript

// Module config/routes/constants

.controller('AppsCtrl', ['$scope', function($scope) {


        // Set Title in parent
        $scope.$parent.title = 'Apps';

        // Set module links
        $scope.links = [
            {
                name: 'manage-apps',
                label: 'Manage',
                path: 'manage-apps'
            },
            {
                name: 'create-app',
                label: 'Create',
                path: 'create-app'
            },
            {
                name: 'import-app',
                label: 'Import',
                path: 'import-app'
            },
            {
                name: 'app-groups',
                label: 'Groups',
                path: 'app-groups'
            }
        ];

        // Set empty section options
        // additional logic if there are no apps present
        $scope.emptySectionOptions = {
            title: 'You have no Apps!',
            text: 'Click the button below to get started building your first application.  You can always create new applications by clicking the tab located in the section menu to the left.',
            buttonText: 'Create An App!',
            viewLink: $scope.links[1]
        };


        $scope.$on('$destroy', function (e) {

        });
    }])

```

Each module has a `main.html`.  In `main.html` there wil be directives that pertain to module funcitonality.  There is a sidebar navigation directive that takes the `links` array and generates navigation.  A few ng-if statements render the properly selected view.  Here is the `dfApps` module's `main.html` file.

```html
<div>
    <div class="col-md-2 df-sidebar-nav">
        <df-sidebar-nav></df-sidebar-nav>
    </div>
    <div class="col-md-10 df-section" df-fs-height >
        <df-manage-apps data-ng-if="activeView.path === 'manage-apps'"></df-manage-apps>
        <df-app-details data-ng-if="activeView.path === 'create-app'" data-new-app="true"></df-app-details>
        <df-import-app data-ng-if="activeView.path === 'import-app'"></df-import-app>
        <df-app-groups data-ng-if="activeView.path === 'app-groups'"></df-app-groups>
    </div>
</div>

```

If you are experienced with AngularJS you can see that most of if not all of the modules work is delegated to directives as opposed to using routes and controllers.  While this doesn't allow for deep linking it does offer the convenience of dealing with data via context.  Most modules will have manage and detail contexts which are modeled as directives and have templates stored locally in relation to the modules folder.  The manage directive will pull data from the repository, create an object(referred to as a 'Managed Object') based on that data, and present it in a tabular, list, or thumbnail fashion.  There is usually behavior associated with the Managed object (for example, managed app objects allow you to launch a hosted app from it's Managed Object state).  Upon selection the managed object will be passed to a detail directive which will create an object of that type for editing or creation.  When that detail directive detects data the manage context is closed and the detail context is shown.  This is usually a form for editing the currently selected object.  The object can be saved, updated, or closed with changes discarded.  Basic CRUD stuff.  Once an operation has been completed the detail context can be closed and the manage context will reappear.  We save deleting for the manage context where one or multiple objects can be selected and deleted.

All the directives(contexts) work in a similar fashion of having data passed to them and then creating an object that holds that data.  The data passed to a directive will always be encapsulated in the 'record' property of the created object.  Often we attach other UI specific properties to that object which will be found under the `__dfUI` property.  Below is an example of what an App object looks like in the detail context.

```javascript
{
    __dfUI: {
        selected: false  
    },
    record: {
        // app data for editing
    },
    recordCopy: {
        // copied app data for comparison
    }
}
```

All form models are tied to the data stored on the record property.  When we save/update the app a new App object is created to replace the old one.  You are then free to close the detail view or continue editing.  If you have made changes and attempt to close without saving then the comparison of the record and recordCopy will fail prompting you if you 'Are sure you want to close?'.  That's how most of it works.  Pretty simple.  Pull data and create objects.  Select object to edit.  Show form to edit object.  Compare on save and close.

### Context Organization (how we setup directives)

Each one of the directives is organized in a similar fashion.  See the stubbed out example below:

```javascript
.directive(DIRECTIVE_NAME, [function() {

    return {
        restrict: 'E',
        scope: {
            thingData: '='
        },
        templateUrl: CONSTANT_PATH + 'views/TEMPLATE.html',
        link: function (scope, elem, attrs) {
        
        // LOCAL FUNCTIONS: 
        // things pertaining to this directive that won't be shared or stored on scope
        // Object constructors usually
        
        var Thing = function (thingData) {
            var thingModel = {
                thingName: 'My Awesome thing name'
            }
            
            thingData = thingData || thingModel
            
            return {
                __dfUI: {
                    selected: false,
                    hasError: false
                },
                record: thingData,
                recordCopy: angular.copy(thingData);
            }
        }
        
        scope.theThing = null;
        
        
        
        // PUBLIC API
        // Scope functions that attach to our UI
        // we do preliminary checking here
        scope.saveThing = function () {
            
            if (scope.theThing.__dfUI.hasError) {
                alert('Thing has error');
                return;
            }
            
            scope._saveThing()
        }
        
        
        // PRIVATE API
        // functions stored on/off scope that provide
        // targeted functionality
        scope._myPrivFuncOne = function () {
        
            // Do someting
        }
        
         scope._saveThingToServer = function () {
        
            // Save thing to server.  Return promise
        }
        
        
        // COMPLEX IMPLEMENTATION
        // These scope functions generally are called from the public api
        // Their names usually correspond with a preceding underscore
        // We call private api functions targeted for specific tasks 
        // and build our...COMPLEX IMPLEMENTATION of the public function.
        
        scope._saveThing = function () {
            
            // private func to do someting
            scope._myPrivFuncOne();
            
            // save thing to server
            scope._saveThingToServer(scope.theThing).then(
                function (result) {
                    
                    scope.theThing = new Thing(result.data)
                },
                function (reject) {
                    //report error
                }
            );
        }
        
        
        // WATCHERS 
        // place any watchers here
        var watchThing = scope.$watch('thingData', function (newValue, oldValue) {
        
            scope.theThing = new Thing(newValue);
        }
        
        
        // MESSAGES
        // Handle messaging/events here
        scope.$on('$destroy', function (e) {
        
            watchThing();
        }
        
        
    }
}])
```
