/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { FieldType } from 'jsforce';

import { ScriptObject } from '../';
import {
  ISfdmuRunCustomAddonSFieldDescribe,
} from '../../../addons/modules/sfdmu-run/custom-addons/package';
import { Common } from '../../components/common_components/common';
import { CONSTANTS } from '../../components/common_components/statics';

// Construct the end interface in case we need
//  multiple interface implementation for the single class
type ISFieldDescribe = ISfdmuRunCustomAddonSFieldDescribe;


/**
 * Description of the sobject field
 *
 * @export
 * @class SFieldDescribe
 */
export default class SFieldDescribe implements ISFieldDescribe {

    constructor(init?: Partial<SFieldDescribe>) {
        if (init) {
            Object.assign(this, init);
        }
    }

    objectName: string = "";
    name: string = "";
    type: FieldType | "dynamic";
    label: string = "";
    updateable: boolean = false;
    creatable: boolean = false;
    cascadeDelete: boolean = false;
    autoNumber: boolean = false;
    unique: boolean = false;
    nameField: boolean = false;
    custom: boolean = false;
    calculated: boolean = false;

    lookup: boolean = false;
    referencedObjectType: string = "";
    polymorphicReferenceObjectType: string = "";

    length: number;

    originalReferencedObjectType: string = "";

    /*
        true if this field description was retrieved from the org,
        excluding temporary fields created upon executing.
    */
    isDescribed: boolean;

    /**
     * This ScriptObject
     */
    scriptObject: ScriptObject;

    /**
     * Parent lookup ScriptObject for reference field
     */
    parentLookupObject: ScriptObject = new ScriptObject();

    /**
     * For the externalId field -> holds the list of all the child __r sfields
     *
     *  For example, if the current sfield is externalId "|Account|Name",
     *  so this property will return a list of all the child lookup  __r  sfields, which point to this externalId field, as following:
     *  [ "|Case|Account__r.Name", "|Lead|ConvertedAccount.Name", "|CustomObject__c|MyAccount__r.Name", ... ]
     */
    child__rSFields: SFieldDescribe[] = new Array<SFieldDescribe>();

    /**
     * Account__r.Name
     */
    __rSField: SFieldDescribe;

    /**
     * Account__c
     */
    idSField: SFieldDescribe;

    /**
     * The polymorphic field was detected from the object metadata
     */
    isPolymorphicFieldDefinition: boolean = false;

    /**
     * Explicitely defined by the query(f.ex. ParentId$Account)
     */
    isPolymorphicField: boolean = false;

    getPolymorphicQueryField(fieldName: string): string {
        let parts = fieldName.split('.');
        if (this.isPolymorphicField && this.is__r && parts.length > 1) {
            return `TYPEOF ${parts[0]} WHEN ${this.polymorphicReferenceObjectType} THEN ${parts[1]} END`;
        }
        return fieldName;
    }

    // Used for the Target field mapping
    m_targetName: string;
    get targetName(): string {
        return this.m_targetName || this.name;
    }

    get isMapped(): boolean {
        return this.name != this.targetName;
    }

    get readonly() {
        return !(this.creatable && !this.isFormula && !this.autoNumber);
    }

    get person() {
        return this.nameId.endsWith('__pc')
            || this.nameId.startsWith('Person') && !this.custom;
    }

    get standard() {
        return !this.custom;
    }

    get isFormula() {
        return this.calculated;
    }

    get isMasterDetail() {
        return this.lookup && (!this.updateable || this.cascadeDelete) && this.isSimpleReference;
    }

    get isBoolean() {
        return this.type == "boolean";
    }

    get isTextual() {
        return CONSTANTS.TEXTUAL_FIELD_TYPES.indexOf(this.type) >= 0;
    }

    get isComplex(): boolean {
        return Common.isComplexField(this.name);
    }

    get isContainsComplex(): boolean {
        return Common.isContainsComplexField(this.name);
    }

    get is__r(): boolean {
        return !!this.idSField;
    }

    get isComplexOr__r(): boolean {
        return Common.isComplexOr__rField(this.name);
    }

    get isSimpleNotLookup(): boolean {
        return this.isSimple && !this.lookup;
    }

    get isSimple(): boolean {
      return !this.isComplexOr__r;
    }

    get isSimpleReference(): boolean {
        const isSimpleReference = (CONSTANTS.SIMPLE_REFERENCE_FIELDS.get(this.objectName) || []).includes(this.name);
        return isSimpleReference || this.lookup && !this.is__r;
    }

    get isSimpleSelfReference(): boolean {
        return this.isSimpleReference && this.referencedObjectType == this.objectName;
    }

    get isExternalIdField(): boolean {
        return this.scriptObject && this.scriptObject.externalId == this.name;
    }

    get isOriginalExternalIdField(): boolean {
        return this.scriptObject && this.scriptObject.originalExternalId == this.name;
    }

    /**
     * Account__c => Account__r
     *
     * @readonly
     * @type {string}
     * @memberof SFieldDescribe
     */
    get name__r(): string {
        return Common.getFieldName__r(this);
    }

    /**
    * Ensured to be always set to original
    * field api name, regardless of being
    * a _r field or an original field:
    * f.ex. Account__r.Name => Account__c
    *       Id => Id,
    *       Account__c => Account__c
    *
    * @readonly
    * @type {string}
    * @memberof SFieldDescribe
    */
    get nameId(): string {
        return Common.getFieldNameId(this);
    }

    /**
     * Account__c => Account__r.Id
     * ("Id" is current external id for Account)
     *
     * @readonly
     * @type {string}
     * @memberof SFieldDescribe
     */
    get fullName__r(): string {
        if (this.lookup) {
            const name = this.name__r + "." + Common.getComplexField(this.parentLookupObject.externalId);
            const specialField = (CONSTANTS.__R_FIELD_MAPPING.get(this.objectName) || {})[name];
            return specialField || name;
        } else {
            return this.name__r;
        }
    }

    /**
     * Account__c => Account__r.Name
     * ("Name" is the original external id for Account defained in the script)
     *
     * @readonly
     * @type {string}
     * @memberof SFieldDescribe
     */
    get fullOriginalName__r(): string {
        if (this.lookup) {
            const name = this.name__r + "." + Common.getComplexField(this.parentLookupObject.originalExternalId);
            const specialField = (CONSTANTS.__R_FIELD_MAPPING.get(this.objectName) || {})[name];
            return specialField || name;
        } else {
            return this.name__r;
        }
    }

    /**
    * Account__c => Account__r.Id
    * ("Name" is the original external id for Account defained in the script)
    *
    * @readonly
    * @type {string}
    * @memberof SFieldDescribe
    */
    get fullIdName__r(): string {
        if (this.lookup) {
            return this.name__r + ".Id";
        } else {
            return this.name__r;
        }
    }

    /**
     * Transforms 'RecordType.$$DeveloperName$NamespacePrefix$SobjectType' field name
     * into array like: ['RecordType.DeveloperName', 'RecordType.NamespacePrefix', 'RecordType.SobjectType']
     * @readonly
     * @type {string[]}
     * @memberof SFieldDescribe
     */
    get __rNames(): string[] {
        if (this.is__r) {
            let parts = this.name.split('.');
            if (parts.length <= 1) {
                return [this.name];
            }
            return Common.flattenArrays(parts.slice(1).map(part => {
                let fields = Common.getFieldFromComplexField(part);
                return fields.split(CONSTANTS.COMPLEX_FIELDS_SEPARATOR).map(field => `${parts[0]}.${field}`);
            }));
        }
        return [];
    }


    // ----------- Public Methods ----------------- //
    dynamic(key: string): SFieldDescribe {
        Object.assign(this, {
            creatable: false,
            name: key,
            label: key,
            updateable: false,
            type: "dynamic"
        });
        return this;
    }


    complex(key: string): SFieldDescribe {
        Object.assign(this, {
            name: key,
            label: key,
            calculated: true,
            isDescribed: true,
        });
        return this;
    }


}

