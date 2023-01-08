/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';

import {
  ISfdmuRunCustomAddonScriptAddonManifestDefinition,
} from '../../../addons/modules/sfdmu-run/custom-addons/package';
import { ADDON_EVENTS } from '../../components/common_components/enumerations';
import { CONSTANTS } from '../../components/common_components/statics';

/**
 * Represent an item of the addons section of the ScriptObject / Script  classes
 *
 * @export
 * @class AddonManifestDefinition
 * @implements {IAddonManifestDefinition}
 */
export default class ScriptAddonManifestDefinition implements ISfdmuRunCustomAddonScriptAddonManifestDefinition {

    // ------------- JSON --------------
    // Common definitions
    command: string = "sfdmu:run";
    path: string;
    module: string;
    description: string;
    excluded: boolean;
    args: any;

    // Core definitions
    objects: string[];

    constructor(init: Partial<ScriptAddonManifestDefinition>) {
        if (init) {
            Object.assign(this, init);
        }
    }

    // -----------------------------------
    basePath: string;

    get isCore(): boolean {
        return this.moduleName && this.moduleName.startsWith(CONSTANTS.CORE_ADDON_MODULES_NAME_PREFIX);
    }

    get moduleName(): string {
        let name = this.module || this.path;
        if (name) {
            return path.basename(name);
        }
    }

    get moduleDisplayName(): string {
        if (this.moduleName.indexOf(':') >= 0) return this.moduleName;
        return this.isCore ? CONSTANTS.CORE_ADDON_MODULES_NAME_PREFIX + this.moduleName
            : CONSTANTS.CUSTOM_ADDON_MODULES_NAME_PREFIX + this.moduleName;
    }

    get isValid(): boolean {
        return !!this.moduleName && this.event != ADDON_EVENTS.none;
    }

    event: ADDON_EVENTS = ADDON_EVENTS.none;

    objectName: string = '';

    get moduleRequirePath(): string {

        if (!this.isValid) {
            return null;
        }

        let requiredPath = "";

        if (this.module) {
            if (this.module.indexOf(CONSTANTS.CORE_ADDON_MODULES_NAME_PREFIX) >= 0) {
                // Core module like ":OnBefore"
                let modulePath = CONSTANTS.CORE_ADDON_MODULES_BASE_PATH
                    + this.command.replace(CONSTANTS.CORE_ADDON_MODULES_FOLDER_SEPARATOR, CONSTANTS.CORE_ADDON_MODULES_FOLDER_NAME_SEPARATOR) + '/' // sfdmu-run/
                    + this.module.replace(CONSTANTS.CORE_ADDON_MODULES_NAME_PREFIX, '/'); // /OnBefore
                requiredPath = path.normalize(path.resolve(__dirname, modulePath));
            } else {
                // NPM module
                requiredPath = this.module;
            }
        } else {
            // Module by path
            if (!path.isAbsolute(this.path)) {
                requiredPath = path.resolve(this.isCore ? __dirname : this.basePath, this.path);
            } else {
                requiredPath = this.path;
            }
        }
        return requiredPath;

    }

    appliedToObject(objectName: string) {
        return this.objectName == objectName
            || Array.isArray(this.objects) && (this.objects.length == 0 || this.objects.indexOf(objectName) >= 0);
    }

}
