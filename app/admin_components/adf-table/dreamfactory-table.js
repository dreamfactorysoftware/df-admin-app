/**
 * This file is part of DreamFactory (tm)
 *
 * http://github.com/dreamfactorysoftware/dreamfactory
 * Copyright 2012-2014 DreamFactory Software, Inc. <support@dreamfactory.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';


// @TODO: IGNORING DATE FIELDS DURING COMPARE OBJECTS FUNCTION FOR MARKING RECORD CHANGED.
// @TODO: FIX TIME PICKING FOR FIELD TYPES 'datetime', 'timestamp', timestamp_on_create', and 'timestamp_on_update'


angular.module('dfTable', ['dfUtility'])
    .constant('DF_TABLE_ASSET_PATH', 'admin_components/adf-table/')
    .run(['$templateCache', function ($templateCache) {

        $templateCache.put('df-input-text.html', '<input type="{{templateData.type}}"  class="form-control" placeholder="{{templateData.placeholder}}" data-ng-model="currentEditRecord[field.name]" data-ng-disabled="!templateData.editable" data-ng-required="field.required">');
        $templateCache.put('df-input-ref-text.html', '<input type="{{templateData.type}}"  class="form-control" placeholder="{{templateData.placeholder}}" data-ng-model="currentEditRecord[field.name]" data-ng-disabled="!templateData.editable" data-ng-required="field.required">');
        $templateCache.put('df-input-number.html', '<input type="{{templateData.type}}" step="any" class="form-control" placeholder="{{templateData.placeholder}}" data-ng-model="currentEditRecord[field.name]" data-ng-disabled="!templateData.editable" data-ng-required="field.required">');
        $templateCache.put('df-input-int.html', '<input type="{{templateData.type}}" step="1" class="form-control" placeholder="{{templateData.placeholder}}" data-ng-model="currentEditRecord[field.name]" data-ng-disabled="!templateData.editable" data-ng-required="field.required">');


        $templateCache.put('df-input-textarea.html', '<textarea class="form-control" rows="3" data-ng-model="currentEditRecord[field.name]" data-ng-disabled="!templateData.editable" data-ng-required="field.required"></textarea>');
        $templateCache.put('df-input-binary.html', '<p>BINARY DATA</p>');
        $templateCache.put('df-input-datetime.html', '<p>DATETIME</p>');
        $templateCache.put('df-input-reference.html', '<div class="well"><df-table data-options="relatedOptions" data-parent-record="currentEditRecord" data-export-field="field"></df-table></div>');
        $templateCache.put('df-input-checkbox.html', '<label><input type="checkbox" data-ng-model="currentEditRecord[field.name]" data-ng-checked="currentEditRecord[field.name]" data-ng-required="field.required"></label>');
        $templateCache.put('df-input-bool-picklist.html', '<div class="form-group"><select class="form-control" data-ng-model="currentEditRecord[field.name]" data-ng-options="bool.value as bool.name for bool in __dfBools" data-ng-required="field.required"></select></div>');
        $templateCache.put('df-input-select.html', '<select class="form-control" data-ng-model="currentEditRecord[field.name]" data-ng-options="obj[overrideFields[templateData.prop].display.value] as obj[overrideFields[templateData.prop].display.label] for obj in overrideFields[templateData.prop].records" data-ng-required="field.required" data-ng-disabled="currentEditRecord[templateData.dependent]"><option value="">-- None --</option></select>');
        $templateCache.put('df-input-values-picklist.html',
            '<div class="row">' +
                '<div class="col-xs-12 col-md-6">' +
                    '<div class="input-group">' +
                        '<input type="text" class="form-control" data-ng-model="currentEditRecord[field.name]" placeholder="Enter Value or Choose from list" data-ng-required="field.required">' +
                        '<div class="input-group-btn">' +
                            '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button>' +
                            '<ul class="dropdown-menu pull-right df-dropdown-height">' +
                                '<li data-ng-click="assignValue(item)" data-ng-repeat="item in data"><a>{{item}}</a></li>' +
                            '</ul>' +
                        '</div><!-- /btn-group -->' +
                    '</div><!-- /input-group -->' +
                '</div><!-- /.col-lg-6 -->' +
            '</div>'
        );
        $templateCache.put('df-input-values-only-picklist.html',
            '<div class="form-group">' +
                '<select class="form-control" data-ng-model="currentEditRecord[field.name]" data-ng-options="item for item in data" data-ng-required="field.required"></select>' +
            '</div>'
        );
        $templateCache.put('df-input-date-time-picker.html',
            '<div class="form-group col-xs-12">\n' +
                ' <div class="input-group col-sm-6 col-md-4">\n' +
                    '<span class="input-group-btn">\n' +
                        '<button type="button" data-ng-disabled="!templateData.editable" class="btn btn-default btn-small" data-ng-click="open($event)"><i class="fa fa-calendar fa-fw"></i></button>' +
                        '<button type="button" class="btn btn-default" data-ng-disabled="!templateData.editable" data-ng-click="setNow()">Now</button>\n'+
                    '</span>\n' +
                    '<input type="text" class="form-control" data-ng-disabled="!templateData.editable" data-datepicker-popup="{{format}}" data-ng-model="dt" data-is-open="opened"  data-date-disabled="disabled(date, mode)" data-ng-required="field.required" data-close-text="Close" />' +
                '</div>\n'+
                '<div class="col-sm-6 col-md-2">\n' +
                    '<timepicker style="display: inline-block" data-ng-model="mytime" data-ng-change="changed()" show-meridian="ismeridian"></timepicker>\n' +
                '</div>\n' +
            '</div>');
    }])
    .directive('dfTable', ['DF_TABLE_ASSET_PATH', '$http', '$q', '$filter', '$compile', 'dfObjectService', 'dfTableEventService', 'dfTableCallbacksService', function (DF_TABLE_ASSET_PATH, $http, $q, $filter, $compile, dfObjectService, dfTableEventService, dfTableCallbacksService) {

        return {
            restrict: 'E',
            scope: {
                userOptions: '=options',
                parentRecord: '=?',
                exportField: '=?'
            },
            templateUrl: DF_TABLE_ASSET_PATH + 'views/dreamfactory-table.html',
            link: function (scope, elem, attrs) {


                scope.es = dfTableEventService;

                scope.defaults = {
                    service: '',
                    table: '',
                    url: '',
                    normalizeData: false,
                    normalizeSchema: true,
                    autoClose: true,
                    params: {
                        filter: null,
                        limit: 50,
                        offset: 0,
                        fields: '*',
                        include_schema: true,
                        include_count: true
                    },
                    defaultFields: null,
                    overrideFields: [],
                    extendFieldTypes: [],
                    extendData: [],
                    extendSchema: [],
                    relatedData: [],
                    excludeFields: [],
                    groupFields: [],
                    exportValueOn: false,
                    allowChildTable: false,
                    childTableAttachPoint: null,
                    isChildTable: false
                };

                //scope.options = dfObjectService.deepMergeObjects(scope.options, scope.defaults);
                // merged by watch userOptions
                scope.options = {};
                scope.disableTableBtns = false;

                scope.record = null;
                scope.schema = null;
                scope.overrideFields = {};

                scope.tableFields = {
                    onStartTotalActiveFields: 0
                };
                scope.tableFieldsAll = false;
                scope.tableFilterOn = true;
                scope.defaultFieldsShown = {};
                scope.numAutoSelectFields = 8;
                scope.selectedAll = false;


                scope.filterOn = false;
                scope.filter = {
                    viewBy: '',
                    prop: '',
                    value: null
                };

                scope.order = {
                    orderBy: '',
                    orderByReverse: false
                };

                scope.filteredRecords = false;
                scope.orderedRecords = false;

                scope.activeTab = null;
                scope.activeView = 'table';

                scope.pagesArr = [];
                scope.currentPage = {};

                scope.currentEditRecord = null;

                scope.extendFieldTypes = {};

                scope.inProgress = false;

                scope.count = 0;

                scope._exportValue = null;

                scope.newRecord = null;

                scope.relatedExpand = false;

                scope.extendedData = {};

                scope.extendedSchema = {};

                scope.excludedFields = {};

                scope.filteredSchema = [];
                scope.groupedSchema = [];

                scope.childTableActive = false;
                scope.childTableOptions = {};

                scope.childTableParentRecord = null;


                // PUBLIC API
                scope.setTab = function (tabStr) {

                    scope._setTab(tabStr);
                };

                scope.toggleSelected = function (dataObj) {

                    if (scope.childTableActive) return false;

                    scope._toggleSelected(dataObj);
                };

                scope.getPrevious = function () {

                    if (scope._isFirstPage() || scope._isInProgress()) {
                        return false;
                    } else {
                        if (scope._checkForUnsavedRecords(scope.record)) {
                            scope._confirmAction('You have Unsaved records.  Continue without saving?', scope._getPrevious)
                        } else {
                            scope._getPrevious();
                        }
                    }
                };

                scope.getNext = function () {

                    if (scope._isLastPage() || scope._isInProgress()) {
                        return false;
                    } else {
                        if (scope._checkForUnsavedRecords(scope.record)) {
                            scope._confirmAction('You have Unsaved records.  Continue without saving?', scope._getNext)
                        } else {
                            scope._getNext();
                        }
                    }
                };

                scope.editRecord = function (dataObj) {

                    scope._editRecord(dataObj);
                };

                scope.createRecord = function () {

                    scope._createRecord();
                };

                scope.saveRecords = function () {

                    scope._saveRecords();
                };

                scope.revertRecords = function () {

                    scope._revertRecords();
                };

                scope.deleteRecords = function () {

                    scope._confirmAction('You are about to mass delete records.  Continue?', scope._deleteRecords);

                    /*if (scope._checkForUnsavedRecords(scope.record)) {
                        scope._confirmAction('You have Unsaved records.  Continue without saving?', scope._deleteRecords)
                    } else {
                        scope._deleteRecords();
                    }*/
                };

                scope.applyFilter = function () {

                    scope._applyFilter();
                };

                scope.removeFilter = function () {

                    scope._removeFilter();
                };

                scope.refreshResults = function () {

                    scope._refreshResults();
                };

                scope.orderOnSelect = function (fieldObj) {

                    scope._orderOnSelect(fieldObj);
                };

                scope.setExportValue = function (dataObj) {

                    scope._setExportValue(dataObj);
                };

                scope.toggleExpandEditor = function () {

                    scope._toggleExpandEditor();
                };

                scope.editExportRecord = function (dataObj) {

                    scope._editExportRecord(dataObj);
                };

                scope.filterRecords = function () {

                    scope._filterRecords();
                };

                scope.toggleAllFields = function () {

                    scope._toggleAllFields();
                };

                scope.resetAllFields = function () {

                    scope._resetAllFields();
                };

                scope.toggleAllRecords = function () {

                    scope._toggleAllRecords();
                };

                scope.showChildTable = function (parentRecordObj) {

                    scope._showChildTable(parentRecordObj);

                };


                // PRIVATE API

                // Data States
                scope._addSelectedProp = function (dataObj) {

                    if (!dataObj.__dfUI.hasOwnProperty('selected')) {
                        dataObj.__dfUI['selected'] = false;
                    }
                };

                scope._addUnsavedProp = function (dataObj) {

                    if (!dataObj.__dfUI.hasOwnProperty('unsaved')) {
                        dataObj.__dfUI['unsaved'] = false;
                    }
                };

                scope._addExportProp = function (dataObj) {

                    if (!dataObj.__dfUI.hasOwnProperty('export')) {
                        dataObj.__dfUI['export'] = false;
                    }

                };

                scope._addHideProp = function (dataObj) {

                    if (!dataObj.__dfUI.hasOwnProperty('hide')) {
                        dataObj.__dfUI['hide'] = false
                    }
                };

                scope._addStateProps = function (dataObj) {

                    if (!dataObj.hasOwnProperty['__dfUI']) {
                        dataObj['__dfUI'] = {};
                    }

                    scope._addSelectedProp(dataObj);
                    scope._addUnsavedProp(dataObj);
                    scope._addExportProp(dataObj);
                    scope._addHideProp(dataObj);
                };

                scope._removeStateProps = function (dataObj) {
                    if (dataObj.hasOwnProperty['__dfUI']) {
                        delete dataObj.__dfUI;
                    }
                };

                scope._toggleSelectedState = function (dataObj) {

                    dataObj.__dfUI.selected = !dataObj.__dfUI.selected;
                };

                scope._toggleUnsavedState = function (dataObj) {

                    dataObj.__dfUI.unsaved = !dataObj.__dfUI.unsaved;
                };

                scope._setSelectedState = function (dataObj, stateBool) {

                    dataObj.__dfUI.selected = stateBool;
                };

                scope._setUnsavedState = function (dataObj, stateBool) {

                    dataObj.__dfUI.unsaved = stateBool;
                };

                scope._setExportState = function (dataObj, stateBool) {

                    if (dataObj) {
                        dataObj.__dfUI.export = stateBool;
                    }
                };

                scope._setHideState = function (dataObj, stateBool) {

                    if (dataObj) {
                        dataObj.__dfUI.hide = stateBool;
                    }
                };

                scope._isUnsaved = function (dataObj) {

                    return dataObj.__dfUI.unsaved;
                };

                scope._isSelected = function (dataObj) {

                    return dataObj.__dfUI.selected;
                };

                scope._isExport = function (dataObj) {

                    return dataObj.__dfUI.export;
                }

                scope._checkForUnsavedRecords = function (data) {

                    if (!data) return false;

                    var unsavedRecords = false,
                        i = 0;

                    do {

                        if (i >= data.length) {
                            break;
                        }

                        if (data[i].__dfUI.unsaved) {
                            unsavedRecords = true;
                        }

                        i++

                    } while (unsavedRecords == false);

                    return unsavedRecords;
                };


                // Records and Data
                scope._checkForParams = function () {

                    var params = {};

                    if (scope.options.hasOwnProperty('params')) {
                        params = scope.options.params
                    }else {
                        params = scope.defaults.params
                    }

                    return params;
                };

                scope._getRecordsFromServer = function (requestDataObj) {

                    var params = scope._checkForParams();

                    requestDataObj = requestDataObj || null;

                    if (requestDataObj) {
                        params = dfObjectService.mergeObjects(requestDataObj.params, params);
                    }


                    if (scope.options.relatedData.length > 0) {

                        params['related'] = scope.options.relatedData.join(',');
                    }

                    return $http({
                        method: 'GET',
                        url: scope.options.url,
                        params: params
                    });
                };

                scope._getRecordsFromData = function (dataObj) {

                    // create short var names
                    var limit = scope._checkForParams().limit,
                        records = [];

                    // hacky way to check for where our records are
                    // were they passed in from the result of a promise,
                    // or is it actually a promise that needs to be parsed
                    if (dataObj.hasOwnProperty('resource')) {
                        records = dataObj.resource;
                    } else if (dataObj.hasOwnProperty('data')) {

                        if (dataObj.data.hasOwnProperty('resource')) {
                            records = dataObj.data.resource
                        } else {
                            records = dataObj.data.data.resource
                        }
                    }


                    // if the records passed in are more than the limit slice off excess
                    // records else return records.  This usually happens if preload limit
                    // not set to match table limit.
                    return records.length > limit ? records.slice(0, limit) : records;
                };

                scope._getMetaFromData = function (dataObj) {

                    var meta = {};

                    // hacky way to check for where our records are
                    // were they passed in from the result of a promise,
                    // or is it actually a promise that needs to be parsed
                    if (dataObj.hasOwnProperty('meta')) {
                        meta = dataObj.meta;
                    } else if (dataObj.hasOwnProperty('data')) {

                        if (dataObj.data.hasOwnProperty('meta')) {
                            meta = dataObj.data.meta
                        } else {
                            meta = dataObj.data.data.meta
                        }
                    }

                    return meta;
                };

                scope._getSchemaFromData = function (dataObj) {

                    return scope._getMetaFromData(dataObj).schema
                };

                scope._getCountFromMeta = function (dataObj) {

                    var count = scope._getMetaFromData(dataObj).count;

                    scope._setCount(count);

                    return count;
                };

                scope._setCount = function (countInt) {
                    scope.count = countInt;
                };

                scope._getOptionFromParams = function (keyStr) {

                    return scope._checkForParams()[keyStr];
                };

                scope._setOptionFromParams = function (keyStr, valueStr) {


                }

                scope._buildField = function (fieldNameStr) {

                    console.log(fieldNameStr);
                };

                scope._createRevertCopy = function (dataObj) {

                    dataObj['__dfData'] = {};
                    dataObj.__dfData['revert'] = angular.copy(dataObj);

                    if (!dataObj.__dfData.revert.hasOwnProperty('_exportValue')) {
                        dataObj.__dfData.revert['_exportValue'] = {};
                    }
                };

                scope._getRevertCopy = function (dataObj) {

                    return dataObj.__dfData.revert;
                };

                scope._hasRevertCopy = function (dataObj) {

                    if (dataObj.hasOwnProperty('__dfData')) {
                        if (dataObj.__dfData.hasOwnProperty('revert')) {
                            return true
                        } else {
                            return false
                        }
                    } else {
                        return false
                    }
                };

                scope._removeRevertCopy = function (dataObj) {

                    if (dataObj.__dfData.revert) {
                        delete dataObj.__dfData.revert;
                    }
                };

                scope._removeAllDFData = function (dataObj) {

                    if (dataObj.__dfData) {
                        delete dataObj.__dfData;
                    }
                };

                scope._removeAllUIData = function (dataObj) {

                    delete dataObj.__dfUI;
                };

                scope._compareObjects = function (dataObj1, dataObj2) {

                    for (var key in dataObj1) {

                        if (key === 'dfUISelected' || key === 'dfUIUnsaved' || key === '__dfUI' || key == '__dfData' || key == 'created_date' || key == 'last_modified_date' || key === '$$hashKey') continue;

                        if (dataObj1[key] !== dataObj2[key]) {
                            if ((dataObj1[key] == null || dataObj1[key] == '') && (dataObj2[key] == null || dataObj2[key] == '')) {
                                return false;
                            }


                            if ((dataObj1[key] instanceof Array) && (dataObj2[key] instanceof Array) && dataObj1[key].length == dataObj2[key].length){

                                return false;
                            }

                            return true;
                        }
                    }

                    return false;
                };

                scope._getRecordsWithState = function (recordsDataArr, stateStr, removeDFDataBool, removeUIDataBool) {

                    var records = [];

                    removeDFDataBool = typeof removeDFDataBool !== 'undefined' ? removeDFDataBool : false;
                    removeUIDataBool = typeof removeUIDataBool !== 'undefined' ? removeUIDataBool : false;


                    angular.forEach(recordsDataArr, function (_obj) {

                        if (_obj.__dfUI[stateStr]) {

                            if (removeDFDataBool) {
                                scope._removeAllDFData(_obj);
                            }

                            if (removeUIDataBool) {
                                scope._removeAllUIData(_obj);
                            }

                            records.push(_obj);
                        }
                    });

                    return records;
                };

                scope._saveRecordsToServer = function (recordsDataArr) {

                    if (recordsDataArr.length == 0) {

                        var defer = $q.defer();
                        var error = 'No records selected for save.';
                        defer.reject(error);
                        return defer.promise;
                    }

                    return $http(
                        {
                            method: 'PATCH',
                            url: scope.options.url,
                            data: {"resource": recordsDataArr}
                        });

                };

                scope._deleteRecordsFromServer = function (recordsDataArr) {


                    if (recordsDataArr.length == 0) {

                        var defer = $q.defer();
                        var error = 'No records selected for delete.';
                        defer.reject(error);
                        return defer.promise;
                    }

                    return $http({
                        method: 'DELETE',
                        url: scope.options.url,
                        data: {"resource": recordsDataArr}
                    })

                };

                scope._isInProgress = function () {

                    return scope.inProgress;
                };

                scope._setInProgress = function (stateBool) {

                    scope.inProgress = stateBool;
                };

                scope._createNewRecordObj = function () {

                    var newRecord = {};

                    angular.forEach(scope.schema.field, function (_obj) {

                        if (scope.excludedFields.hasOwnProperty(_obj.name) && scope.excludedFields[_obj.name].fields.create) {

                            //console.log('Model property \'' + _obj.name + '\' excluded.')

                        }else {
                            newRecord[_obj.name] = _obj.default;
                        }
                    });

                    scope._addStateProps(newRecord);

                    return newRecord;
                };


                // View Control
                scope._setCurrentEditRecord = function (dataObj) {

                    scope.currentEditRecord = dataObj;
                };

                scope._setNewRecordObj = function () {

                    scope.newRecord = scope._createNewRecordObj();
                };

                scope._confirmAction = function (_message, _action) {

                    if (confirm(_message)) {
                        _action.call();
                    }
                };

                scope._filterFormSchema = function (formNameStr) {


                    if (scope.excludedFields.length == 0) return false;

                    angular.forEach(scope.schema.field, function (_obj) {

                        if (scope.excludedFields.hasOwnProperty(_obj.name) && scope.excludedFields[_obj.name].fields[formNameStr]) {

                            //console.log('Schema property \'' + _obj.name + '\' excluded from ' + form + ' form')
                        }else {
                            scope.filteredSchema.push(_obj);
                        }
                    });
                };

                scope._buildSchemaGroups = function () {

                    if (scope.options.groupFields.length == 0) return false;

                    var _schema = scope.filteredSchema.length > 0 ? scope.filteredSchema : scope.schema.field;

                    angular.forEach(scope.options.groupFields, function (fobj) {

                        var group = {};
                        group['name'] = fobj.name;
                        group['fields'] = [];
                        group['dividers'] = fobj.dividers;

                        angular.forEach(_schema, function(item) {
                            angular.forEach(fobj.fields, function (field, index) {
                                if (item.name === field) {

                                    //console.log(group.name + ' => ' + item.name + ' = ' + field);
                                    group.fields[index] = item;
                                }
                            });
                        });

                        scope.groupedSchema.push(group);


                    });
                };

                scope._checkForGroupedSchema = function (groupNameStr) {

                    if (scope.groupedSchema.length == 0) {
                        scope.groupedSchema.push({
                            name: groupNameStr,
                            fields: scope.schema.field
                        })
                    }
                };

                scope._clearFilteredSchema = function () {

                    scope.filteredSchema = [];
                }

                scope._clearGroupedSchema = function () {

                    scope.groupedSchema = [];
                };


                // Table
                scope._getDefaultFields = function (dataObj) {

                    if (dataObj.hasOwnProperty('defaultFields')) {
                        return dataObj.defaultFields;
                    }

                    return null;
                };

                scope._removePrivateFields = function (dataObj) {

                    if (!dataObj) return;

                    angular.forEach(scope.record, function (_obj) {

                        for (var _key in _obj) {
                            if (dataObj[_key] && dataObj[_key] == 'private') {
                                delete _obj[_key]
                            }
                        }
                    })
                };

                scope._setElementActive = function (tabStr) {

                    scope.activeTab = tabStr;
                };

                scope._setDisableTableBtnsState = function (stateBool) {

                    scope.disableTableBtns = stateBool;
                };

                // This workhorse of a function builds a fields object that contains schema field objects with
                // an 'active' property.  This active property denotes whether a field is shown in the table.
                // The fields object is stored as the scope var scope.tableFields.  It contains a property called onStartTotalFields
                // that keeps track of how many fields are currently set active.  We check this property as we loop through our
                // rules to determine when we have enough fields that are active.  If we haven't passed in any default fields through
                // our options object then we hit the rules engine which first builds the scope.tableFields object from the field.name property.
                // This first check sets fields with specific properties like 'name', 'f_name', 'firstname', etc and sets those active = true and others
                // that don't pass the test to active = false.
                // Then we check if we have enough active fields.  If we don't then we loop through our now created scope.tableFields object
                // looking for fields with a specific type like 'date', 'time', 'datetime', etc and set those active.
                // If we still don't have enough fields then we loop through the scope.tableFields object again setting each property to active = true
                // until we have enough fields.
                scope._createFieldsObj = function (schemaDataObj) {

                    scope.tableFields = {
                        onStartTotalActiveFields: 0
                    };

                    if (!scope.defaultFieldsShown) {

                        // get all the keys so we can query how many there are
                        var allKeys = Object.keys(schemaDataObj);

                        // have we set the amount of onStart fields higher than the number of fields in schema
                        // if so set the onStart fields to the number of fields in the schema
                        if (allKeys.length < scope.numAutoSelectFields) scope.numAutoSelectFields = allKeys.length;

                        // Loop through schema
                        angular.forEach(schemaDataObj, function (value, index) {

                            // Do we have enough fields and have we hit that last field obj
                            if (scope.tableFields.onStartTotalActiveFields < scope.numAutoSelectFields && index != allKeys.length) {

                                // if the field matches one of these cases for it to be active
                                switch (value.name) {

                                    case 'name':
                                    case 'title':
                                    case 'fname':
                                    case 'lname':
                                    case 'f_name':
                                    case 'l_name':
                                    case 'firstname':
                                    case 'lastname':
                                    case 'first_name':
                                    case 'last_name':
                                    case 'email':
                                    case 'phone':

                                        // set the object property to the value
                                        scope.tableFields[value.name] = value;

                                        // add an active property and set true for display
                                        scope.tableFields[value.name]['active'] = true;

                                        // increment our total count of start fields
                                        scope.tableFields.onStartTotalActiveFields++;
                                        break;

                                    // we didn't match a case
                                    default:

                                        // add the field to the object
                                        scope.tableFields[value.name] = value;

                                        // add active property and set false for no display
                                        scope.tableFields[value.name]['active'] = false;

                                }
                            }
                        });

                        // Do we have enough start fields
                        if (scope.tableFields.onStartTotalActiveFields < scope.numAutoSelectFields) {

                            // loop through our table fields
                            angular.forEach(scope.tableFields, function (_obj) {

                                // short circuit if we have enough start fields
                                if (scope.tableFields.onStartTotalActiveFields == scope.numAutoSelectFields) return false;
                                if (_obj.active == false) {

                                    // Check for type to set active
                                    switch(_obj.type) {

                                        case 'date':
                                        case 'time':
                                        case 'datetime':

                                            // set this field obj active
                                            _obj.active = true;

                                            // increment on start fields number
                                            scope.tableFields.onStartTotalActiveFields++;
                                            break;
                                    }


                                }
                            })
                        }


                        // Do we have enough fields yet?
                        if (scope.tableFields.onStartTotalActiveFields < scope.numAutoSelectFields) {

                            // Loop through again
                            angular.forEach(scope.tableFields, function (_obj) {

                                // short circuit if we have enough start fields
                                if (scope.tableFields.onStartTotalActiveFields == scope.numAutoSelectFields) return false;

                                // set field true
                                if (_obj.active == false) {
                                    _obj.active = true;

                                    // increment on start fields number
                                    // until we reach our limit of start fields
                                    scope.tableFields.onStartTotalActiveFields++;
                                }
                            })


                        }

                        // End function
                        return false;
                    }


                    // We have default fields
                    angular.forEach(schemaDataObj, function (value, index) {

                        // is the current value a property on scope.options.defaultFields?
                        if (scope.defaultFieldsShown.hasOwnProperty(value.name)) {

                            // it is
                            switch (scope.defaultFieldsShown[value.name]) {

                                case true:
                                    // set the object property to the value
                                    scope.tableFields[value.name] = value;

                                    // add an active property and set true for display
                                    scope.tableFields[value.name]['active'] = true;
                                    break;

                                case false:
                                    // set the object property to the value
                                    scope.tableFields[value.name] = value;

                                    // add an active property and set true for display
                                    scope.tableFields[value.name]['active'] = false;
                                    break;

                                case 'private':
                                    break;

                                default:
                                    // set the object property to the value
                                    scope.tableFields[value.name] = value;

                                    // add an active property and set true for display
                                    scope.tableFields[value.name]['active'] = false;
                            }
                        } else {

                            // set the object property to the value
                            scope.tableFields[value.name] = value;

                            // add an active property and set true for display
                            scope.tableFields[value.name]['active'] = false;
                        }

                    });

                    scope.tableFieldsAll = false;
                };

                scope._init = function (data) {

                    scope._prepareExtendedData(scope.options);

                    scope._prepareExtendedSchema(scope.options);

                    scope._prepareExcludedFields(scope.options);

                    if (scope._prepareRecords(data)) {
                        scope._prepareOverrideFields(scope.options);
                    }

                    scope._prepareSchema(data);

                    scope._prepareExtendedFieldTypes(scope.options);

                    scope.defaultFieldsShown = scope._getDefaultFields(scope.options);

                    scope._createFieldsObj(scope.schema.field);

                    scope.activeTab = scope.schema.name + "-table";

                    scope._calcPagination(data);

                    scope.pagesArr[0].stopPropagation = true;
                    scope._setCurrentPage(scope.pagesArr[0]);


                };

                scope._prepareRecords = function (data) {

                    scope.record = scope._getRecordsFromData(data);

                    if (!scope.record) {
                        scope.record = null;
                        return false;
                    }

                    scope._removePrivateFields(scope._getDefaultFields(scope.options));

                    angular.forEach(scope.record, function (_obj) {

                        scope._addStateProps(_obj);
                        scope._addExtendedData(_obj);

                        if (scope.options.exportValueOn && scope._exportValue) {
                            if (scope._checkExportValue(_obj)) {
                                scope._setExportState(_obj, true);
                                scope._exportValue = _obj;
                            }
                        }
                    });


                    if (scope.options.normalizeData) {
                        scope.record = scope._normalizeData(scope.record);
                    }

                    return true;
                };

                scope._checkExportValue = function (dataObj) {

                    return dataObj[scope.exportField.ref_fields] === scope._exportValue[scope.exportField.ref_fields];
                };

                scope._prepareSchema = function (data) {

                    scope.schema = scope._getSchemaFromData(data);

                    if (scope.options.normalizeSchema && (scope.record.length > 0)) {

                        scope.schema = scope._normalizeSchema(scope.schema, scope.record);
                    }

                    angular.forEach(scope.extendedSchema, function(_obj) {

                        scope.schema.field.push(_obj);
                    });


                };

                scope._prepareExtendedSchema = function (data) {

                    if (data.extendSchema == null) return false;

                    angular.forEach(data.extendSchema, function (_obj) {

                        scope.extendedSchema[_obj.name] = {};
                        scope.extendedSchema[_obj.name]['name'] = _obj.name;
                        scope.extendedSchema[_obj.name]['type'] = _obj.type;
                        scope.extendedSchema[_obj.name]['label'] = _obj.label;
                    })
                };

                scope._prepareOverrideFields = function (data) {

                    if (data.overrideFields == null) return false;

                    angular.forEach(data.overrideFields, function (_obj) {

                        scope.overrideFields[_obj.field] = {};

                        if (_obj.hasOwnProperty('record')) {
                            scope.overrideFields[_obj.field]['records'] = scope._getRecordsFromData(_obj.record);
                        }

                        scope.overrideFields[_obj.field]['display'] = _obj.display;
                    });
                };

                scope._prepareExtendedFieldTypes = function (data) {

                    if (data.extendFieldTypes == null) return false;

                    angular.forEach(data.extendFieldTypes, function (_obj) {
                        scope.extendFieldTypes[_obj.db_type] = {};

                        for (var _key in _obj) {
                            scope.extendFieldTypes[_obj.db_type][_key] = _obj[_key];
                        }
                    });

                };

                scope._prepareExtendedData = function (data) {

                    if (data.extendData == null) return false;

                    angular.forEach(data.extendData, function (_obj) {

                        scope.extendedData[_obj.name] = {};
                        scope.extendedData[_obj.name]['name'] = _obj.name;
                        scope.extendedData[_obj.name]['value'] = _obj.value || null;
                    });

                };

                scope._addExtendedData = function (dataObj) {

                    angular.forEach(scope.extendedData, function (_obj) {

                        dataObj[_obj.name] = _obj.value;
                    });
                };

                scope._setActiveView = function (viewStr) {

                    scope.activeView = viewStr;
                };

                scope._setExportValueToParent = function (dataObj) {

                    scope._exportValue = dataObj || null;
                };

                scope._prepareExcludedFields = function (data) {

                    if (data.extendSchema == null) return false;

                    angular.forEach(data.excludeFields, function (_obj) {

                        scope.excludedFields[_obj.name] = {};
                        scope.excludedFields[_obj.name]['fields'] = _obj.fields;
                    });
                };



                // Pagination
                scope._calcTotalPages = function (totalCount, numPerPage) {

                    return Math.ceil(totalCount / numPerPage);
                };

                scope._createPageObj = function (_pageNum) {

                    return {
                        number: _pageNum + 1,
                        value: _pageNum,
                        offset: _pageNum * scope._getOptionFromParams('limit'),
                        stopPropagation: false
                    }
                };

                scope._createPagesArr = function (_totalCount) {

                    scope.pagesArr = [];

                    for (var i = 0; i < _totalCount; i++) {

                        scope.pagesArr.push(scope._createPageObj(i));
                    }
                };

                scope._setCurrentPage = function (pageDataObj) {

                    scope.currentPage = pageDataObj;
                };

                scope._getCurrentPage = function () {

                    if (!scope.currentPage && scope.pagesArr.length > 0) {
                        scope.currentPage = scope.pagesArr[0];
                    } else if (!scope.currentPage && !scope.pagesArr.length) {

                        scope.pagesArr.push(scope._createPageObj(0));
                        scope.currentPage = scope.pagesArr[0];
                    }

                    return scope.currentPage;
                };

                scope._isFirstPage = function () {

                    return scope._getCurrentPage().value === 0;
                };

                scope._isLastPage = function () {

                    return scope.currentPage.value === scope.pagesArr.length - 1
                };

                scope._previousPage = function () {

                    scope.currentPage = scope.pagesArr[scope.currentPage.value - 1]
                };

                scope._nextPage = function () {

                    scope.currentPage = scope.pagesArr[scope.currentPage.value + 1]
                };

                scope._calcPagination = function (newValue) {

                    scope.pagesArr = [];

                    var count = scope._getCountFromMeta(newValue);

                    if (count == 0) {
                        scope.pagesArr.push(scope._createPageObj(0));
                        return false;
                    }

                    scope._createPagesArr(scope._calcTotalPages(count, scope._getOptionFromParams('limit')));
                };


                // Filtering
                scope._resetFilter = function (schemaDataObj) {

                    if (!schemaDataObj) return false;

                    scope.filter = {
                        viewBy: schemaDataObj.field[0].name || '',
                        prop: schemaDataObj.field[0].name || '',
                        value: null
                    };
                };

                scope._isFiltered = function () {

                    return scope.filteredRecords;
                };

                scope._createFilterParams = function () {

                    return scope.filter.prop + ' like "%' + scope.filter.value + '%"';
                };

                scope._unsetFilterInOptions = function () {

                    if (scope.options.params.hasOwnProperty('filter')) {
                        delete scope.options.params.filter;
                    }
                };

                scope._setFilterInOptions = function () {

                    if (!scope._checkForFilterValue()) return false;

                    if (!scope.options.params.hasOwnProperty('filter')) {
                        scope.options.params['filter'] = scope._createFilterParams();
                        return true;
                    } else {
                        scope.options.params.filter = scope._createFilterParams();
                        return true;
                    }

                };

                scope._checkForFilterValue = function () {

                    return !!scope.filter.value;
                };


                // Ordering
                scope._resetOrder = function (schemaDataObj) {

                    if (!schemaDataObj) return false;

                    scope.order = {
                        orderBy: schemaDataObj.field[0].name || '',
                        orderByReverse: false
                    }
                };

                scope._isOrdered = function () {
                    return scope.orderedRecords;
                }

                scope._createOrderParams = function () {

                    var orderStr = scope.order.orderBy + ' ';
                    orderStr += scope.order.orderByReverse ? 'DESC' : 'ASC';

                    return orderStr;
                };

                scope._unsetOrderInOptions = function () {

                    if (scope.options.params.hasOwnProperty('order')) {
                        delete scope.options.params.order;
                    }
                };

                scope._setOrderInOptions = function () {

                    if (!scope.options.params.hasOwnProperty('order')) {
                        scope.options.params['order'] = scope._createOrderParams();
                    } else {
                        scope.options.params.order = scope._createOrderParams();
                    }
                };


                // Child Table
                scope._setChildTableActive = function (stateBool) {

                    scope.childTableActive = stateBool;
                };

                scope._setChildTableParentRecord = function (recordObj) {

                    scope.childTableParentRecord = recordObj;
                };

                scope._buildChildTableOptions = function () {

                    scope.childTableOptions = {
                        isChildTable: true,
                        allowChildTable: false
                    };

                    scope.childTableOptions = dfObjectService.deepMergeObjects(scope.childTableOptions, angular.copy(scope.defaults));
                };

                scope._addChildTable = function () {

                    angular.element(scope.options.childTableAttachPoint).append($compile('<df-child-table data-child-options="childTableOptions" data-parent-schema="schema" data-child-table-parent-record="childTableParentRecord"></df-child-table>')(scope))
                };



                // COMPLEX IMPLEMENTATION
                scope._setTab = function (tabStr) {

                    scope._setElementActive(tabStr);
                };

                scope._toggleSelected = function (dataObj) {

                    scope._toggleSelectedState(dataObj);
                };

                scope._normalizeData = function (dataObj) {

                    angular.forEach(dataObj, function (_obj) {

                        for (var _key in _obj) {
                            if (_obj[_key] == null) {
                                _obj[_key] = 'NULL'
                            }
                        }
                    });

                    return dataObj;
                };

                scope._normalizeSchema = function (schemaDataObj, recordsDataArr) {

                    var normalizedSchema = [];

                    // Delete schema fields that don't represent values in the model
                    for (var _key in schemaDataObj.field) {
                        if (recordsDataArr[0].hasOwnProperty(schemaDataObj.field[_key].name)) {

                            normalizedSchema.push(schemaDataObj.field[_key]);
                        }
                    }

                    delete schemaDataObj.field;

                    schemaDataObj['field'] = normalizedSchema;

                    return schemaDataObj;
                };

                scope._getPrevious = function () {

                    scope._previousPage();
                };

                scope._getNext = function () {

                    scope._nextPage();
                };

                scope._editRecord = function (dataObj) {

                    scope._setCurrentEditRecord(dataObj);
                };

                scope._saveRecords = function () {

                    scope._setInProgress(true);

                    var recordsToSave = scope._getRecordsWithState(scope.record, 'unsaved', true);

                    scope._saveRecordsToServer(recordsToSave).then(
                        function (result) {

                            angular.forEach(scope.record, function (_obj) {

                                if (scope._isUnsaved(_obj)) {
                                    scope._toggleUnsavedState(_obj);
                                }

                                if (scope._isSelected(_obj)) {
                                    scope._toggleSelectedState(_obj);
                                }

                                if (scope._hasRevertCopy(_obj)) {
                                    scope._removeRevertCopy(_obj);
                                }
                            });

                            scope.$emit(scope.es.alertSuccess, {message: 'Records saved.'})
                        },
                        function (reject) {

                            throw {
                                module: 'xxDreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {

                            scope._setInProgress(false)
                        },
                        function () {

                            scope._setInProgress(false);
                        });
                };

                scope._revertRecords = function () {

                    angular.forEach(scope.record, function (_obj, _index) {
                        if (scope._isUnsaved(_obj)) {
                            if (scope._hasRevertCopy(scope.record[_index])) {
                                scope.record[_index] = scope._getRevertCopy(_obj);
                            }
                        }
                    })

                    scope.$emit(scope.es.alertSuccess, {message: 'Records reverted.'})
                };

                scope._deleteRecords = function () {

                    var recordsToDelete = scope._getRecordsWithState(scope.record, 'selected');

                    scope._deleteRecordsFromServer(recordsToDelete).then(
                        function (result) {

                            var requestDataObj = {},
                                curPage = scope._getCurrentPage().value,
                                curOffset = scope._getCurrentPage().offset;


                            // Are we on the last page
                            if (scope._isLastPage() && (scope.record.length === scope._getRecordsFromData(result).length)) {

                                // we are so reduce the offset of records by the limit amount
                                curOffset = curOffset - scope._getOptionFromParams('limit');
                            }

                            // Merge our requeset params with our new offset so we
                            // have all the params for the call
                            requestDataObj['params'] = dfObjectService.mergeObjects({
                                    offset: curOffset
                                },
                                scope.options.params);


                            // Get some records from the server with our request obj
                            scope._getRecordsFromServer(requestDataObj).then(
                                function (_result) {

                                    scope.$emit(scope.es.alertSuccess, {message: 'Records deleted.'})

                                    // Set em up
                                    scope._prepareRecords(_result);

                                    // Init new pagination
                                    scope._createPagesArr(scope._calcTotalPages(scope._getCountFromMeta(_result), scope._getOptionFromParams('limit')));

                                    // if the page value before the deletion was greater than the
                                    // new pages array and it doesn't equal zero decrement by one
                                    if (curPage > scope.pagesArr.length - 1 && curPage !== 0) {
                                        curPage = curPage - 1;
                                        scope.pagesArr[curPage].stopPropagation = true;
                                    }

                                    // Set current page
                                    scope._setCurrentPage(scope.pagesArr[curPage]);

                                },
                                function (reject) {
                                    throw {
                                        module: 'DreamFactory Table Module',
                                        type: 'error',
                                        provider: 'dreamfactory',
                                        exception: reject
                                    }
                                }
                            );

                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false)
                        },
                        function () {
                            scope._setInProgress(false);
                        });
                };

                scope._getRecordsWithFilter = function () {

                    var requestDataObj = {};

                    requestDataObj['params'] = dfObjectService.mergeObjects({
                        filter: scope._createFilterParams()
                    }, scope.options.params);


                    scope._setInProgress(true);
                    scope._getRecordsFromServer(requestDataObj).then(
                        function (result) {

                            scope._init(dfObjectService.mergeObjects({data: result}, scope.options));
                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false)
                        },
                        function () {
                            scope._setInProgress(false);
                        });

                };

                scope._refreshResults = function (checkUnsavedBool) {

                    checkUnsavedBool = checkUnsavedBool || true;


                    if (checkUnsavedBool) {
                        if (scope._checkForUnsavedRecords(scope.record)) {
                            if (!confirm('You have Unsaved records.  Continue without saving?')) {
                                return false;
                            }
                        }
                    }

                    var requestDataObj = {};

                    requestDataObj['params'] = {offset: 0};

                    scope._setInProgress(true);
                    scope._getRecordsFromServer(requestDataObj).then(
                        function (result) {

                            scope._prepareRecords(result);
                            scope._calcPagination(result);
                            scope._setCurrentPage(scope.pagesArr[0])
                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false)
                        },
                        function () {
                            scope._setInProgress(false);
                        });
                };

                scope._applyFilter = function () {

                    // Do we have unsaved records before change the page
                    if (scope._checkForUnsavedRecords(scope.record)) {

                        // Continue?
                        if (!confirm('You have Unsaved records.  Continue without saving?')) {
                            // End this function
                            return false;
                        }
                    }


                    // If we have a filter set filtered records true
                    if (scope._setFilterInOptions()) scope.filteredRecords = true;

                    // we have applied a custom order set ordered records true
                    scope._setOrderInOptions();
                    scope.orderedRecords = true;


                    var requestDataObj = {};

                    // set our offset to the new page offset
                    requestDataObj['params'] = {offset: 0};

                    scope._setInProgress(true);
                    scope._getRecordsFromServer(requestDataObj).then(
                        function (result) {

                            scope._prepareRecords(result);
                            scope._calcPagination(result);
                            scope._setCurrentPage(scope.pagesArr[0])
                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false)
                        },
                        function () {
                            scope._setInProgress(false);
                        });

                };

                scope._removeFilter = function () {

                    // Do we have unsaved records before change the page
                    if (scope._checkForUnsavedRecords(scope.record)) {

                        // Continue?
                        if (!confirm('You have Unsaved records.  Continue without saving?')) {
                            // End this function
                            return false;
                        }
                    }


                    scope._unsetFilterInOptions();
                    scope._unsetOrderInOptions();
                    scope._resetFilter(scope.schema);
                    scope._resetOrder(scope.schema);
                    scope.filteredRecords = false;
                    scope.orderedRecords = false;

                    var requestDataObj = {};

                    // set our offset to the new page offset
                    requestDataObj['params'] = {offset: 0};

                    scope._setInProgress(true);
                    scope._getRecordsFromServer(requestDataObj).then(
                        function (result) {

                            scope._prepareRecords(result);
                            scope._calcPagination(result);
                            scope._setCurrentPage(scope.pagesArr[0])
                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false)
                        },
                        function () {
                            scope._setInProgress(false);
                        });
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

                scope._createRecord = function () {

                    scope._setNewRecordObj();
                };

                scope._setExportValue = function (dataObj) {

                    scope._setExportValueToParent(dataObj);
                };

                scope._toggleExpandEditor = function () {

                    scope.relatedExpand = !scope.relatedExpand;
                };

                scope._editExportRecord = function (dataObj) {

                    if (scope.options.exportValueOn && scope.parentRecord) {
                        if (!scope.relatedExpand) {
                            scope._setCurrentEditRecord(dataObj);
                            scope._toggleExpandEditor();
                        }else if (scope.relatedExpand && !scope.currentEditRecord) {
                            scope._setCurrentEditRecord(dataObj);
                        }
                    }
                };

                scope._filterRecords = function () {

                    scope.filterOn = !scope.filterOn;
                };

                scope._toggleAllFields = function () {

                    scope.tableFieldsAll = !scope.tableFieldsAll;

                    angular.forEach(scope.tableFields, function(_obj) {
                        if ((Object.prototype.toString.call(_obj) === '[object Object]') && (_obj.hasOwnProperty('active'))) {
                            _obj.active = scope.tableFieldsAll;
                        }
                    });
                };

                scope._resetAllFields = function () {

                    // Recreates the scope.tableFields obj according to the default fields
                    // passed in
                    scope._createFieldsObj(scope.schema.field);

                };

                scope._toggleAllRecords = function () {

                    scope.selectedAll = !scope.selectedAll;

                    angular.forEach(scope.record, function (_obj) {

                        scope._setSelectedState(_obj, scope.selectedAll);

                    })
                };

                scope._showChildTable = function (parentRecordObj) {


                    if (scope.childTableActive) return false;

                    scope._setChildTableActive(true);
                    scope._setChildTableParentRecord(parentRecordObj);
                    scope._buildChildTableOptions();
                    scope._addChildTable();
                    scope._setDisableTableBtnsState(true)

                };


                // WATCHERS / INIT

                var watchUserOptions = scope.$watchCollection('userOptions', function(newValue, oldValue) {

                    if (!newValue) return false;

                    scope.options = dfObjectService.deepMergeObjects(newValue, scope.defaults);

                    scope._setActiveView('table');
                    dfTableCallbacksService.reset();

                });

                var watchOptions = scope.$watchCollection('options', function (newValue, oldValue) {

                    if (!newValue) return false;

                    if (!newValue.service) return false;

                    if (scope.options.exportValueOn && !scope._exportValue && scope.parentRecord[scope.exportField.name]) {

                        var requestDataObj = {};

                        requestDataObj['params'] = {filter: scope.exportField.ref_fields + ' = ' + scope.parentRecord[scope.exportField.name]};

                        scope._getRecordsFromServer(requestDataObj).then(
                            function (result) {

                                var record = scope._getRecordsFromData(result)[0];
                                scope._addStateProps(record);
                                scope._exportValue = record;

                                if (scope.options.params.filter) {
                                    delete scope.options.params.filter;
                                }

                                // call back nightmare.  But it keeps pagination straight
                                if (!newValue.data) {
                                    scope._getRecordsFromServer().then(
                                        function (_result) {

                                            //newValue['data'] = _result;

                                            scope._init(_result);
                                            scope._resetFilter(scope.schema);
                                            scope._resetOrder(scope.schema);

                                        },
                                        function (_reject) {
                                            throw {
                                                module: 'DreamFactory Table Module',
                                                type: 'error',
                                                provider: 'dreamfactory',
                                                exception: _reject
                                            }
                                        }
                                    )
                                }
                                else {
                                    scope._init(newValue);
                                    scope._resetFilter(scope.schema);
                                    scope._resetOrder(scope.schema);
                                }


                            },
                            function (reject) {

                                throw {
                                    module: 'DreamFactory Table Module',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    exception: reject
                                }
                            }
                        )
                    } else {

                        if (!newValue.data) {
                            scope._getRecordsFromServer().then(
                                function (_result) {

                                    //newValue['data'] = _result;

                                    scope._init(_result);
                                    scope._resetFilter(scope.schema);
                                    scope._resetOrder(scope.schema);

                                },
                                function (_reject) {
                                    throw {
                                        module: 'DreamFactory Table Module',
                                        type: 'error',
                                        provider: 'dreamfactory',
                                        exception: _reject
                                    }
                                }
                            )
                        }
                        else {
                            scope._init(newValue);
                            scope._resetFilter(scope.schema);
                            scope._resetOrder(scope.schema);
                        }
                    }
                });

                var watchCurrentPage = scope.$watch('currentPage', function (newValue, oldValue) {


                    // Check if page actually changed
                    if (newValue.value == oldValue.value) return false;

                    // Stop watcher.  We don't want to call for new data.
                    // we already got it from a previous function.
                    // this happens when we delete all the items from a page
                    // A successful delete sets up all the data and sets the current page
                    // so no need to continue with this function.  But this is a one time
                    // thing for this page so we reset the stop propagation back to its
                    // default of false.
                    if (newValue.stopPropagation) {
                        newValue.stopPropagation = false;
                        return false;
                    }

                    // Do we have unsaved records before change the page
                    if (scope._checkForUnsavedRecords(scope.record)) {

                        // Continue?
                        if (!confirm('You have Unsaved records.  Continue without saving?')) {

                            // No.  Set old page stopPropagation value
                            // to avoid loop when the watcher detects the currentPage
                            // value change
                            oldValue.stopPropagation = true;

                            // set old page
                            scope._setCurrentPage(oldValue);

                            // End this function
                            return false;
                        }
                    }

                    // Make a request object
                    var requestDataObj = {};

                    requestDataObj['params'] = {offset: newValue.offset};


                    scope._setInProgress(true);
                    scope._getRecordsFromServer(requestDataObj).then(
                        function (result) {

                            scope._prepareRecords(result);
                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false)
                        },
                        function () {
                            scope._setInProgress(false);
                        });

                });

                var watchCurrentEditRecord = scope.$watch('currentEditRecord', function (newValue, oldValue) {

                    if (newValue) {

                        if (!scope._hasRevertCopy(newValue)) {
                            scope._createRevertCopy(newValue);
                        }

                        scope._filterFormSchema('edit');
                        scope._buildSchemaGroups();
                        scope._checkForGroupedSchema('Edit ' + scope.schema.name.charAt(0).toUpperCase() + scope.schema.name.slice(1));

                        scope._setActiveView('edit');
                    } else {


                        scope._setActiveView('table');
                        scope._clearGroupedSchema();
                        scope._clearFilteredSchema();
                    }
                });

                var watchCurrentEditRecordState = scope.$watchCollection('currentEditRecord', function (newValue, oldValue) {

                    if (oldValue && (newValue == null)) {

                        if (scope._hasRevertCopy(oldValue)) {

                            if (scope._compareObjects(oldValue, oldValue.__dfData.revert)) {
                                scope._setUnsavedState(oldValue, true);
                            } else {
                                scope._setUnsavedState(oldValue, false);
                            }
                        }
                    }
                });

                var watchParentRecord = scope.$watchCollection('parentRecord', function (newValue, oldValue) {

                    if (!newValue) return false;

                    if (!newValue && !scope._exportValue) return false;

                    if ((!scope._exportValue && newValue[scope.exportField.name]) == null) {
                        return false;
                    }

                    if (!newValue[scope.exportField.name]) {
                        scope._exportValue = null;
                        return false;
                    }

                    // Some external force(revert!) has set the parent value to something else.  Go get that record
                    if ((!scope._exportValue && newValue[scope.exportField.name]) || (scope._exportValue[scope.exportField.ref_fields] !== newValue[scope.exportField.name])) {

                        var requestDataObj = {};

                        requestDataObj['params'] = {filter: scope.exportField.ref_fields + ' = ' + newValue[scope.exportField.name], offset: 0};

                        scope._getRecordsFromServer(requestDataObj).then(
                            function (result) {

                                var record = scope._getRecordsFromData(result);

                                if (!record) throw {
                                    module: 'DreamFactory Table Module',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    exception: 'Revert related data record not found.'
                                };

                                scope._addStateProps(record[0]);
                                scope._exportValue = record[0];


                                if (scope.options.params.filter) {
                                    delete scope.options.params.filter;
                                }
                            },
                            function (reject) {

                                throw {
                                    module: 'DreamFactory Table Module',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    exception: reject
                                }
                            }
                        );

                        return false;
                    }


                });

                var watchExportValue = scope.$watch('_exportValue', function (newValue, oldValue) {


                    //We had Null and we passed in Null
                    // This is mostly for init
                    if (!newValue && !oldValue) {

                        return false;
                    }


                    // Null and an oldValue?
                    if (!newValue && oldValue) {

                        scope._setExportState(oldValue, false);

                        // Ugh.....
                        // This is the only way to loop through and
                        // affect the first default value that is set
                        // Probably can find a better way
                        var found = false,
                            i = 0;
                        if (scope.record) {
                            while (!found && i < scope.record.length) {

                                var record = scope.record[i];
                                if (record[scope.exportField.name] === null) {

                                    scope._setExportState(scope.record[i], false);
                                    found = true;
                                }
                                i++
                            }
                        }

                        // set parent to newValue(which will be null)
                        scope.parentRecord[scope.exportField.name] = newValue;

                        return false;
                    }

                    if (!oldValue && newValue) {


                        // Ugh.....
                        // This is the only way to loop through and
                        // affect the first default value that is set
                        // Probably can find a better way
                        var found = false,
                            i = 0;
                        if (scope.record) {
                            while (!found && i < scope.record.length) {

                                var record = scope.record[i];
                                if (record[scope.exportField.name] === scope._exportValue[scope.exportField.name]) {

                                    scope._setExportState(scope.record[i], true);
                                    found = true;
                                }
                                i++
                            }
                        }
                    }

                    // set record states if old and new value
                    if (oldValue && newValue) {

                        scope._setExportState(oldValue, false);


                        // Ugh.....
                        // This is the only way to loop through and
                        // affect the first default value that is set
                        // Probably can find a better way
                        var found = false,
                            i = 0;
                        if (scope.record) {
                            while (!found && i < scope.record.length) {

                                var record = scope.record[i];
                                if (record[scope.exportField.ref_fields] === newValue[scope.exportField.ref_fields]) {

                                    scope._setExportState(scope.record[i], true);
                                    found = true;
                                }
                                i++
                            }
                        }

                        found = false;
                        i = 0;
                        if (scope.record) {
                            while (!found && i < scope.record.length) {

                                var record = scope.record[i];
                                if (record[scope.exportField.ref_fields] === oldValue[scope.exportField.ref_fields]) {

                                    scope._setExportState(scope.record[i], false);
                                    found = true;
                                }
                                i++
                            }
                        }
                    }
                    // If we clicked on the same record or passed in the same record some how
                    // this will short circuit.  No need to go any further
                    if (scope.parentRecord[scope.exportField.name] === newValue[scope.exportField.ref_fields]) {

                        if (newValue) scope._setExportState(newValue, true);
                        if (oldValue) scope._setExportState(oldValue, false);
                        return false;
                    }

                    // Ugh.....
                    // This is the only way to loop through and
                    // affect the first default value that is set
                    // Probably can find a better way
                    var found = false,
                        i = 0;
                    while (!found && i < scope.record.length) {

                        var record = scope.record[i];
                        if (record[scope.exportField.name] === scope._exportValue[scope.exportField.name]) {

                            scope._setExportState(scope.record[i], false);
                            found = true;
                        }
                        i++
                    }

                    // Assign proper value from obj to ref field on parent
                    scope.parentRecord[scope.exportField.name] = newValue[scope.exportField.ref_fields];

                    // Set the state of incoming and outgoing objects
                    scope._setExportState(oldValue, false);
                    scope._setExportState(newValue, true);
                });

                var watchNewRecord = scope.$watch('newRecord', function (newValue, oldValue) {

                    if (newValue) {
                        scope._setActiveView('new');

                        scope._filterFormSchema('create');
                        scope._buildSchemaGroups();
                        scope._checkForGroupedSchema('Create ' + scope.schema.name.charAt(0).toUpperCase() + scope.schema.name.slice(1));

                    } else {
                        scope._setActiveView('table');
                        scope._clearGroupedSchema();
                    }
                });

                var watchChildTableParentRecord = scope.$watch('childTableParentRecord', function (newValue, oldValue) {

                    if (!newValue) return false;


                    // Hide all records but the child table parent in main records table
                    angular.forEach(scope.record, function (obj) {

                        if (obj.$$hashKey != newValue.$$hashKey) {
                            scope._setHideState(obj, true);
                        }
                    })
                });



                // MESSAGES

                scope.$on(scope.es.refreshTable, function (e) {

                    scope._refreshResults(false);
                });

                scope.$on(scope.es.closeChildTable, function (e) {

                    scope._setChildTableParentRecord(null);

                    // Show all records again
                    angular.forEach(scope.record, function (obj) {

                        scope._setHideState(obj, false);
                    });

                    scope._setDisableTableBtnsState(false);
                    scope._setChildTableActive(false);
                });

                scope.$on('$destroy', function(e) {

                    watchUserOptions();
                    watchOptions();
                    watchCurrentPage();
                    watchCurrentEditRecord();
                    watchCurrentEditRecordState();
                    watchParentRecord();
                    watchExportValue();
                    watchNewRecord();
                    watchChildTableParentRecord();
                })
            }
        }
    }])
    .directive('editRecord', ['DF_TABLE_ASSET_PATH', '$http', 'dfObjectService', 'dfTableEventService', 'dfTableCallbacksService', function (DF_TABLE_ASSET_PATH, $http, dfObjectService, dfTableEventService, dfTableCallbacksService) {

        return {

            restrict: 'E',
            scope: false,
            templateUrl: DF_TABLE_ASSET_PATH + 'views/edit-record.html',
            link: function (scope, elem, attrs) {


                scope.es = dfTableEventService;

                // PUBLIC API
                scope.closeRecord = function () {

                    scope._closeEdit();
                };

                scope.revertRecord = function () {

                    scope._revertRecord();
                };

                scope.deleteRecord = function () {

                    scope._deleteRecord();
                };

                scope.saveRecord = function () {

                    scope._saveRecord();
                };


                // PRIVATE API
                scope._closeEdit = function () {

                    scope.currentEditRecord = null;
                };

                scope._revertRecordData = function () {

                    var recordCopy = scope._getRevertCopy(scope.currentEditRecord);
                    for (var _key in recordCopy) {

                        if (scope.currentEditRecord.hasOwnProperty(_key) && (_key !== '__dfData')) {
                            scope.currentEditRecord[_key] = angular.copy(recordCopy[_key]);
                        }
                    }

                };

                scope._deleteRecordFromServer = function (recordDataObj) {

                    return $http({
                        method: 'POST',
                        url: scope.options.url,
                        data: {"resource": [recordDataObj]},
                        headers: {
                            'X-HTTP-METHOD': 'DELETE'
                        }
                    })
                };

                scope._saveRecordToServer = function (recordDataObj) {

                    return $http({
                        method: 'PATCH',
                        url: scope.options.url,
                        data: {"resource": [recordDataObj]}
                    })
                };


                // COMPLEX IMPLEMENTATION
                scope._revertRecord = function () {
                    scope._revertRecordData();
                    scope.$emit(scope.es.alertSuccess, {message: 'Record reverted.'})
                };

                scope._deleteRecord = function () {

                    scope._setInProgress(true);

                    dfTableCallbacksService.run('onDelete', 'pre', scope.currentEditRecord);
                    scope._deleteRecordFromServer(scope.currentEditRecord).then(
                        function (result) {

                            dfTableCallbacksService.run('onDelete', 'post', result);
                            scope.$emit(scope.es.alertSuccess, {message: 'Record deleted.'})

                            var requestDataObj = {},
                                curPage = scope._getCurrentPage().value,
                                curOffset = scope._getCurrentPage().offset;


                            // Are we on the last page?
                            if (scope._isLastPage()) {

                                // did we successfully delete the same number of records
                                // as there were left to display?

                                if (typeof result === 'object' && scope.record.length === 1) {

                                    // reduce the offset of records by the limit amount
                                    // because we have one less page
                                    curOffset = curOffset - scope._getOptionFromParams('limit');
                                }
                            }

                            // Merge our requeset params with our new offset so we
                            // have all the params for the call
                            requestDataObj['params'] = dfObjectService.mergeObjects({
                                    offset: curOffset
                                },
                                scope.options.params);


                            // Get some records from the server with our request obj
                            scope._getRecordsFromServer(requestDataObj).then(
                                function (_result) {

                                    // Set em up
                                    scope._prepareRecords(_result);

                                    // Init new pagination
                                    scope._createPagesArr(scope._calcTotalPages(scope._getCountFromMeta(_result), scope._getOptionFromParams('limit')));

                                    // if the page value before the deletion was greater that the
                                    // new pages array and it doesn't equal zero decrement by one
                                    if ((curPage > scope.pagesArr.length - 1) && (curPage !== 0)) {
                                        curPage = curPage - 1
                                        scope.pagesArr[curPage].stopPropagation = true;
                                    }

                                    // Set current page
                                    scope._setCurrentPage(scope.pagesArr[curPage]);
                                    scope._setCurrentEditRecord(null);
                                },
                                function (reject) {
                                    throw {
                                        module: 'DreamFactory Table Module',
                                        type: 'error',
                                        provider: 'dreamfactory',
                                        exception: reject
                                    }
                                }
                            );

                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }

                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false);
                        },
                        function () {
                            scope._setInProgress(false);
                        })

                };

                scope._saveRecord = function () {

                    scope._setInProgress(true);
                    dfTableCallbacksService.run('onUpdate', 'pre', scope.currentEditRecord);
                    scope._saveRecordToServer(scope.currentEditRecord).then(
                        function (result) {

                            scope._removeRevertCopy(scope.currentEditRecord);
                            scope._setUnsavedState(scope.currentEditRecord, false);

                            dfTableCallbacksService.run('onUpdate', 'pre', result);
                            scope.$emit(scope.es.alertSuccess, {message: 'Record saved.'})


                            if (scope.options.autoClose) {
                                scope._closeEdit();
                            } else {
                                scope._createRevertCopy(scope.currentEditRecord);
                            }
                        },
                        function (reject) {
                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false);
                        },
                        function () {
                            scope._setInProgress(false);
                        }
                    )
                };


                // MESSAGES


            }
        }


    }])
    .directive('createRecord', ['DF_TABLE_ASSET_PATH', '$http', 'dfTableEventService', 'dfTableCallbacksService', function (DF_TABLE_ASSET_PATH, $http, dfTableEventService, dfTableCallbacksService) {

        return {
            restrict: 'E',
            scope: false,
            templateUrl: DF_TABLE_ASSET_PATH + 'views/create-record.html',
            link: function (scope, elem, attrs) {


                scope.es = dfTableEventService;

                // PUBLIC API
                scope.closeCreateRecord = function () {
                    scope._closeCreateRecord()
                };

                scope.saveNewRecord = function () {

                    scope._saveNewRecord();
                };


                // PRIVATE API
                scope._setCreateNewRecordNull = function () {

                    scope.newRecord = null;
                };

                scope._saveNewRecordToServer = function () {

                    return $http({
                        method: 'POST',
                        url: scope.options.url,
                        data: {"resource": [scope.newRecord]},
                        params: {
                            fields: '*'
                        }
                    })
                };


                // COMPLEX IMPLEMENTATION
                scope._closeCreateRecord = function () {

                    scope._setCreateNewRecordNull();
                };

                scope._saveNewRecord = function () {

                   scope._setInProgress(true);
                    dfTableCallbacksService.run('onCreate', 'pre', scope.newRecord);
                    scope._saveNewRecordToServer().then(
                        function (result) {
                            dfTableCallbacksService.run('onCreate', 'post', result);

                            // check if we can fit the new record into the current page
                            if (scope.record.length === 0) {

                                scope._refreshResults();

                            }
                            else if (scope.record.length < scope.options.params.limit) {

                                scope._addStateProps(result.data.resource[0])
                                scope.record.push(result.data.resource[0]);

                            }
                            // check if we need to update our pagination due to record creation
                            else if (scope.record.length * scope.pagesArr.length < scope.count + 1) {

                                // manually create new page obj for pagination
                                scope.pagesArr.push(scope._createPageObj(scope.pagesArr.length))
                            }

                            scope.$emit(scope.es.alertSuccess, {message: 'Record created.'});
                            scope._closeCreateRecord();
                        },
                        function (reject) {

                            throw {
                                module: 'DreamFactory Table Module',
                                type: 'error',
                                provider: 'dreamfactory',
                                exception: reject
                            }
                        }
                    ).finally(
                        function () {
                            scope._setInProgress(false);
                        },
                        function () {
                            scope._setInProgress(false);
                        }
                    )
                };


                // MESSAGES


            }
        }
    }])
    .directive('dreamfactoryBuildField', ['$templateCache', '$compile', 'dfObjectService', 'dfStringService', 'INSTANCE_URL', function ($templateCache, $compile, dfObjectService, dfStringService, INSTANCE_URL) {

        return {
            restrict: 'A',
            scope: {
                field: '=?',
                service: '=?',
                table: '=?',
                extendFieldTypes: '=?',
                overrideFields: '=?',
                currentEditRecord: '=?',
                activeView: '=?'
            },
            link: function (scope, elem, attrs) {



                scope._parseEditable = function (fieldObj) {

                    if (fieldObj && fieldObj.hasOwnProperty('validation') && fieldObj.validation != null) {
                        return !fieldObj.validation.hasOwnProperty('api_read_only');
                    }

                    if (fieldObj && fieldObj.hasOwnProperty('auto_increment')) {
                        return !fieldObj.auto_increment;
                    }

                    return true;
                };


                scope.defaultFieldTypes = {
                    id: {
                        template: 'df-input-text.html',
                        placeholder: 'Id',
                        type: 'text',
                        editable: false
                    },
                    string: {
                        template: 'df-input-text.html',
                        placeholder: 'Enter String Value',
                        type: 'text',
                        editable: true
                    },
					text: {
						template: 'df-input-textarea.html',
						placeholder: '',
						type: 'textarea',
						editable: true
					},
                    integer: {
                        template: 'df-input-int.html',
                        placeholder: 'Enter Integer Value',
                        type: 'number',
                        editable: true
                    },
                    boolean: {
                        template: 'df-input-checkbox.html',
                        placeholder: '',
                        type: '',
                        editable: true
                    },
                    binary: {
                        template: 'df-input-binary.html',
                        placeholder: 'Enter String Value',
                        type: 'text',
                        editable: false
                    },
                    float: {
                        template: 'df-input-number.html',
                        placeholder: 'Enter Float Value',
                        type: 'number',
                        editable: true
                    },
					double: {
						template: 'df-input-number.html',
						placeholder: 'Enter Double Value',
						type: 'number',
						editable: true
					},
                    decimal: {
                        template: 'df-input-number.html',
                        placeholder: 'Enter Decimal Value',
                        type: 'number',
                        editable: true
                    },
                    datetime: {
                        template: 'df-input-text.html',
                        placeholder: '',
                        type: 'text',
                        editable: true
                    },
                    date: {
                        template: 'df-input-text.html',
                        placeholder: '',
                        type: 'text',
                        editable: true
                    },
                    time: {
                        template: 'df-input-text.html',
                        placeholder: '',
                        type: 'text',
                        editable: true
                    },
                    timestamp: {
                        template: 'df-input-text.html',
                        placeholder: '',
                        type: 'text',
                        editable: true
                    },
                    reference: {
                        template: 'df-input-reference.html',
                        placeholder: '',
                        type: '',
                        editable: false
                    },
                    user_id: {
                        template: 'df-input-text.html',
                        placeholder: 'Enter Text Value',
                        type: 'text',
                        editable: false
                    },
                    user_id_on_update: {
                        template: 'df-input-text.html',
                        placeholder: 'Enter Text Value',
                        type: 'text',
                        editable: false
                    },
                    user_id_on_create: {
                        template: 'df-input-text.html',
                        placeholder: 'Enter Text Value',
                        type: 'text',
                        editable: false
                    },
                    timestamp_on_update: {
                        template: 'df-input-text.html',
                        placeholder: 'Enter Text Value',
                        type: 'text',
                        editable: false
                    },
                    timestamp_on_create: {
                        template: 'df-input-text.html',
                        placeholder: 'Enter Text Value',
                        type: 'text',
                        editable: false
                    }

                };


                scope.fieldTypes = dfObjectService.mergeObjects(scope.extendFieldTypes, scope.defaultFieldTypes);


                if (scope.overrideFields[scope.field.name]) {

                    scope.templateData = {
                        prop: scope.field.name,
                        template: '',
                        placeholder: scope.overrideFields[scope.field.name].display.type || '',
                        type: scope.overrideFields[scope.field.name].display.type || 'text',
                        editable: scope.overrideFields[scope.field.name].editable,
                        field: scope.field || '',
                        dependent: scope.overrideFields[scope.field.name].display.dependent || false
                    };

                    var type = scope.overrideFields[scope.field.name].display.type;

                    switch (type) {

                        case 'select':
                            scope.templateData.template = 'df-input-select.html';
                            break;

                        case 'checkbox':
                            scope.templateData.template = 'df-input-checkbox.html';
                            break;

                        case 'text':
                            scope.templateData.template = 'df-input-text.html';
                            break;

                        case 'textarea':
                            scope.templateData.template = 'df-input-text.html';
                            break;

                        case 'custom':
                            scope.templateData.template = scope.overrideFields[scope.field.name].display.template;
                            break;

                        default:
                            scope.templateData.template = 'df-input-text.html'

                    }

                } else {

                    scope.templateData = scope.fieldTypes[scope.field.type];
                    scope.templateData.editable = scope._parseEditable(scope.field);
                }

                switch (scope.field.type) {

                    case 'string':

                        // example picklist schema
                        // "picklist": ["work","home","mobile","other"],
                        // "validation": {"not_empty":{"on_fail":"Information type can not be empty."},"picklist":{"on_fail":"Not a valid information type."}}

                        // scope.field.picklist will always be null or an array
                        if (scope.field.hasOwnProperty("picklist") &&
                            scope.field.picklist !== null &&
                            scope.field.picklist.length > 0) {

                            // scope.field.validation will always be null or a JSON object
                            if (scope.field.hasOwnProperty('validation') &&
                                scope.field.validation !== null &&
                                scope.field.validation.hasOwnProperty('picklist')) {

                                // only allow picklist values
                                scope.templateData.template = 'df-input-values-only-picklist.html';
                            }
                            else {
                                // display picklist values in menu but allow any string
                                scope.templateData.template = 'df-input-values-picklist.html';
                            }

                            scope.data = scope.field.picklist;

                            scope.assignValue = function (itemStr) {

                                scope.currentEditRecord[scope.field.name] = itemStr;
                            }
                        }

                        break;

                    case 'boolean':

                        scope.templateData.template = 'df-input-bool-picklist.html';

                        scope.__dfBools = [

                            {value:true, name:'TRUE'},
                            {value:false, name:'FALSE'}
                        ];

                        if (scope.field.allow_null) {

                            scope.__dfBools.unshift({value: '', name: 'NULL'});
                        }

                        break;

                    case 'reference':

                        /*if (scope.field.ref_table === scope.table && scope.field.value) {
                            scope.templateData.template = 'df-input-ref-text.html';
                            scope.templateData.editable = false;
                            console.log(scope.currentEditRecord[scope.field])
                            break;
                        }*/

                        var systemTablePrefix = 'df_sys_';

                        scope._parseSystemTableName = function (tableNameStr) {

                            var tableName = tableNameStr.substr(0, systemTablePrefix.length);

                            if (tableName === systemTablePrefix) {
                                return tableNameStr.substr(systemTablePrefix.length);
                            }
                            else {
                                return tableNameStr;
                            }
                        };

                        scope._buildURL = function (serviceNameStr, tableNameStr) {

                            return INSTANCE_URL + '/api/v2/' + serviceNameStr + '/_table/' + tableNameStr
                        };

                        scope.relatedOptions = {
                            service: scope.service,
                            table: scope._parseSystemTableName(scope.field.ref_table),
                            url: scope._buildURL(scope.service, scope._parseSystemTableName(scope.field.ref_table)),
                            params: {
                                filter: null,
                                limit: 10,
                                offset: 0,
                                fields: '*',
                                include_schema: true,
                                include_count: true
                            },
                            defaultFields: {},
                            exportValueOn: true
                        };

                        scope.relatedOptions.defaultFields[scope.field.ref_fields] = true;
                        break;

                   /* case 'datetime':
                    case 'timestamp':
                    case  'timestamp_on_create':
                    case  'timestamp_on_update':

                        scope._theDate = null;
                        scope.editable = false;

                        // Date
                        scope.today = function() {
                            scope.dt = new Date();
                        };

                        scope.clear = function () {
                            scope.dt = null;
                        };

                        // Disable weekend selection
                        scope.disabled = function(date, mode) {
                            return ( mode === 'day' && ( date.getDay() === 0 || date.getDay() === 6 ) );
                        };

                        scope.toggleMin = function() {
                            scope.minDate = scope.minDate ? null : new Date();
                        };

                        scope.open = function($event) {
                            $event.preventDefault();
                            $event.stopPropagation();
                            scope.opened = true;
                        };

                        scope.dateOptions = {
                            formatYear: 'yy',
                            startingDay: 1
                        };

                        scope.initDate = new Date('2016-15-20');
                        scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'yyyy-MM-dd', 'dd.MM.yyyy', 'shortDate'];
                        scope.format = scope.formats[2];


                        // Time
                        scope.mytime = new Date();

                        scope.hstep = 1;
                        scope.mstep = 15;

                        scope.options = {
                            hstep: [1, 2, 3],
                            mstep: [1, 5, 10, 15, 25, 30]
                        };

                        scope.ismeridian = false;
                        scope.toggleMode = function() {
                            scope.ismeridian = ! scope.ismeridian;
                        };

                        scope.showSelector = true;

                        scope.update = function() {
                            var d = new Date();
                            d.setHours( 14 );
                            d.setMinutes( 0 );
                            scope.mytime = d;
                        };

                        scope.changed = function () {
                            //console.log('Time changed to: ' + scope.mytime);
                        };

                        scope.clear = function() {
                            scope.mytime = null;
                        };

                        scope._parseDateTime = function(dateTimeStr) {

                            //console.log(dateTimeStr);

                            var dateTimeArr = dateTimeStr.split(' ');

                            //console.log(dateTimeArr);

                            dateTimeArr[0] = dateTimeArr[0].split('-').join('/');

                            return new Date(dateTimeArr.join(' '));
                        };

                        scope.$watch('currentEditRecord', function(newValue, oldValue) {

                            if (!newValue[scope.field.name]) return false;

                            scope.editable = scope._parseEditable(scope.field);

                            var theDate = scope._parseDateTime(newValue[scope.field.name]);

                            scope.dt = scope.mytime = scope.theDate = theDate;

                        });

                        scope.$watch('dt', function (newValue, oldValue) {

                            //scope.currentEditRecord[scope.field.name] = scope.theDate.toISOString();
                        });

                        scope.$watch('mytime', function (newValue, oldValue) {

                            //scope.currentEditRecord[scope.field.name] = scope.theDate.toISOString();
                        });
                        break;*/

                }


                elem.append($compile($templateCache.get(scope.templateData.template))(scope));
            }
        }
    }])
    .directive('dfChildTable', ['DF_TABLE_ASSET_PATH', 'INSTANCE_URL', 'dfObjectService', 'dfTableEventService', function (DF_TABLE_ASSET_PATH, INSTANCE_URL, dfObjectService, dfTableEventService) {

        return {
            restrict: 'E',
            scope: {
                childOptions: '=',
                parentSchema: '=',
                childTableParentRecord: '='
            },
            templateUrl: DF_TABLE_ASSET_PATH + 'views/df-child-table.html',
            link: function (scope, elem, attrs) {

                var systemTablePrefix = 'df_sys_';

                scope.options = {};

                scope.childRecordsBy = '';

                scope.service = scope.childOptions.service;


                // PUBLIC API
                scope.closeChildTable = function () {

                    scope._closeChildTable();
                };



                // PRIVATE API
                scope._parseSystemTableName = function (tableNameStr) {

                    var tableName = tableNameStr.substr(0, systemTablePrefix.length);

                    if (tableName === systemTablePrefix) {
                        return tableNameStr.substr(systemTablePrefix.length);
                    }
                    else {
                        return tableNameStr;
                    }
                };

                scope._setSystemService = function (tableNameStr) {

                    if (tableNameStr.substr(0, systemTablePrefix.length) === systemTablePrefix) {

                        return 'system'
                    }else {
                        return scope.service
                    }
                };



                // COMPLEX IMPLEMENTATION
                scope._closeChildTable = function () {

                    scope.$emit(dfTableEventService.closeChildTable);
                    angular.element(elem).remove();
                };


                // WATCHERS & INIT
                var watchChildRecordsBy = scope.$watch('childRecordsBy', function (newValue, oldValue) {

                    if (!newValue) return false;

                    var options = {
                        service: scope._setSystemService(newValue.ref_table),
                        table: newValue.ref_table,
                        url: INSTANCE_URL + '/api/v2/' + scope._setSystemService(newValue.ref_table) + '/_table/' + scope._parseSystemTableName(newValue.ref_table),
                        params: {
                            filter: newValue.ref_fields + ' = '  + scope.childTableParentRecord[newValue.field]
                        }
                    };

                    scope.options = dfObjectService.deepMergeObjects(options, scope.childOptions);

                });


                // MESSAGES
                scope.$on('$destroy', function (e) {

                    watchChildRecordsBy();
                });
            }
        }
    }])
    .service('dfTableEventService', [function () {

        return {
            alertSuccess: 'alert:success',
            refreshTable: 'refresh:table',
            closeChildTable: 'close:childtable'
        }
    }])
    .service('dfTableCallbacksService', [function () {

        var callbacks = {
            onCreate: {
                pre: [],
                post: []
            },
            onDelete: {
                pre: [],
                post: []

            },
            onUpdate: {
                pre: [],
                post: []
            }
        };


        return {

            add: function (actionStr, processStr, method) {
                callbacks[actionStr][processStr].push(method);

            },

            run: function (actionStr, processStr, inputRecord) {

                if (callbacks[actionStr][processStr].length == 0) return false;

                angular.forEach(callbacks[actionStr][processStr], function (value, index) {
                    value.call(undefined, inputRecord);
                });
            },

            reset: function () {

                callbacks = {
                    onCreate: {
                        pre: [],
                        post: []
                    },
                    onDelete: {
                        pre: [],
                        post: []

                    },
                    onUpdate: {
                        pre: [],
                        post: []
                    }
                }
            }
        }
    }]);



