### Adding a new tutorial

To add a new tutorial you need to do the following:

1) Add a file with a scenario to tour_scenarios folder which you want to implement
2) Create a method in tutorial.controller.js which will start the tour.
3) Create a button in main-tutorial.html.
4) Add ng-click directive to the button with a method which will start the tour.


Now let's look closer to these steps.

### Adding scenario  

You need to create a file and declare all steps related to the tour.

Each step has a type. For each step, the element of the step will be highlighted.

There are four step types:

- click - To get the next step it is necessary to click on the element;
- input - To get the next step it is necessary to type in the input what is described in the step and click 'next' button;
- notice - Just highlight the element. To get the next step it is necessary to click 'next' button;
- select - Just highlight the element

Each step could have a custom logic relate to step (some action which needs to do before or after the step is shown)
They should be declared in `eventHandlers` array.

Also, each step could have buttons. 

There are four type of buttons:

- next
- back
- skip
- done

To declare a default behavior you just need to declare the button type.
If necessary to add some custom behavior to the button you could declare `action` field in button which is a function. It will rewrite the default behavior of the button.

For instance:

```
{
   type: 'back',
   action: function () {
       $("#info-tab").trigger("click");
   }
 }
``` 


### Creating a method in tutorial.controller.js

Example:
```javascript
 $scope.startServiceTutorial = function () {
            TourBuilder.buildTour(createServiceScenario);
        };

```

Where `createServiceScenario` is the name of the variable in the scenario file.


### Adding button and use the  method from the controller


Example: 

```html
<button class="btn btn-primary" type="button" ng-click="startServiceTutorial()">
            Let's create a Service
</button>
```

Where `startServiceTutorial` the method name of the new tour.