// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject,
  JSONValue,
  ReadonlyJSONObject,
  ReadonlyJSONValue,
  Token
} from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

import { ISignal } from '@phosphor/signaling';

import { ISchemaValidator } from './settingregistry';

import { IDataConnector } from './interfaces';

/* tslint:disable */
/**
 * The setting registry token.
 */
export const ISettingRegistry = new Token<ISettingRegistry>(
  '@jupyterlab/coreutils:ISettingRegistry'
);
/* tslint:enable */

/**
 * The settings registry interface.
 */
export interface ISettingRegistry {
  /**
   * The data connector used by the setting registry.
   */
  readonly connector: IDataConnector<ISettingRegistry.IPlugin, string, string>;

  /**
   * The schema of the setting registry.
   */
  readonly schema: ISettingRegistry.ISchema;

  /**
   * The schema validator used by the setting registry.
   */
  readonly validator: ISchemaValidator;

  /**
   * A signal that emits the name of a plugin when its settings change.
   */
  readonly pluginChanged: ISignal<this, string>;

  /**
   * The collection of setting registry plugins.
   */
  readonly plugins: {
    [name: string]: ISettingRegistry.IPlugin;
  };

  /**
   * Get an individual setting.
   *
   * @param plugin - The name of the plugin whose settings are being retrieved.
   *
   * @param key - The name of the setting being retrieved.
   *
   * @returns A promise that resolves when the setting is retrieved.
   */
  get(
    plugin: string,
    key: string
  ): Promise<{ composite: JSONValue; user: JSONValue }>;

  /**
   * Load a plugin's settings into the setting registry.
   *
   * @param plugin - The name of the plugin whose settings are being loaded.
   *
   * @returns A promise that resolves with a plugin settings object or rejects
   * if the plugin is not found.
   */
  load(plugin: string): Promise<ISettingRegistry.ISettings>;

  /**
   * Reload a plugin's settings into the registry even if they already exist.
   *
   * @param plugin - The name of the plugin whose settings are being reloaded.
   *
   * @returns A promise that resolves with a plugin settings object or rejects
   * with a list of `ISchemaValidator.IError` objects if it fails.
   */
  reload(plugin: string): Promise<ISettingRegistry.ISettings>;

  /**
   * Remove a single setting in the registry.
   *
   * @param plugin - The name of the plugin whose setting is being removed.
   *
   * @param key - The name of the setting being removed.
   *
   * @returns A promise that resolves when the setting is removed.
   */
  remove(plugin: string, key: string): Promise<void>;

  /**
   * Set a single setting in the registry.
   *
   * @param plugin - The name of the plugin whose setting is being set.
   *
   * @param key - The name of the setting being set.
   *
   * @param value - The value of the setting being set.
   *
   * @returns A promise that resolves when the setting has been saved.
   *
   */
  set(plugin: string, key: string, value: JSONValue): Promise<void>;

  /**
   * Register a plugin transform function to act on a specific plugin.
   *
   * @param plugin - The name of the plugin whose settings are transformed.
   *
   * @param transforms - The transform functions applied to the plugin.
   *
   * @returns A disposable that removes the transforms from the registry.
   *
   * #### Notes
   * - `compose` transformations: The registry automatically overwrites a
   * plugin's default values with user overrides, but a plugin may instead wish
   * to merge values. This behavior can be accomplished in a `compose`
   * transformation.
   * - `fetch` transformations: The registry uses the plugin data that is
   * fetched from its connector. If a plugin wants to override, e.g. to update
   * its schema with dynamic defaults, a `fetch` transformation can be applied.
   */
  transform(
    plugin: string,
    transforms: {
      [phase in ISettingRegistry.IPlugin.Phase]?: ISettingRegistry.IPlugin.Transform
    }
  ): IDisposable;

  /**
   * Upload a plugin's settings.
   *
   * @param plugin - The name of the plugin whose settings are being set.
   *
   * @param raw - The raw plugin settings being uploaded.
   *
   * @returns A promise that resolves when the settings have been saved.
   */
  upload(plugin: string, raw: string): Promise<void>;
}

/**
 * A namespace for setting registry interfaces.
 */
export namespace ISettingRegistry {
  /**
   * The primitive types available in a JSON schema.
   */
  export type Primitive =
    | 'array'
    | 'boolean'
    | 'null'
    | 'number'
    | 'object'
    | 'string';

  /**
   * The settings for a specific plugin.
   */
  export interface IPlugin extends JSONObject {
    /**
     * The name of the plugin.
     */
    id: string;

    /**
     * The collection of values for a specified plugin.
     */
    data: ISettingBundle;

    /**
     * The raw user settings data as a string containing JSON with comments.
     */
    raw: string;

    /**
     * The JSON schema for the plugin.
     */
    schema: ISchema;

    /**
     * The published version of the NPM package containing the plugin.
     */
    version: string;
  }

  /**
   * A namespace for plugin functionality.
   */
  export namespace IPlugin {
    /**
     * A function that transforms a plugin object before it is consumed by the
     * setting registry.
     */
    export type Transform = (plugin: IPlugin) => IPlugin;

    /**
     * The phases during which a transformation may be applied to a plugin.
     */
    export type Phase = 'compose' | 'fetch';
  }

  /**
   * A minimal subset of the formal JSON Schema that describes a property.
   */
  export interface IProperty extends JSONObject {
    /**
     * The default value, if any.
     */
    default?: any;

    /**
     * The schema description.
     */
    description?: string;

    /**
     * The schema's child properties.
     */
    properties?: { [property: string]: IProperty };

    /**
     * The title of a property.
     */
    title?: string;

    /**
     * The type or types of the data.
     */
    type?: Primitive | Primitive[];
  }

  /**
   * A schema type that is a minimal subset of the formal JSON Schema along with
   * optional JupyterLab rendering hints.
   */
  export interface ISchema extends IProperty {
    /**
     * Whether the schema is deprecated.
     *
     * #### Notes
     * This flag can be used by functionality that loads this plugin's settings
     * from the registry. For example, the setting editor does not display a
     * plugin's settings if it is set to `true`.
     */
    'jupyter.lab.setting-deprecated'?: boolean;

    /**
     * The JupyterLab icon class hint.
     */
    'jupyter.lab.setting-icon-class'?: string;

    /**
     * The JupyterLab icon label hint.
     */
    'jupyter.lab.setting-icon-label'?: string;

    /**
     * A flag that indicates plugin should be transformed before being used by
     * the setting registry.
     *
     * #### Notes
     * If this value is set to `true`, the setting registry will wait until a
     * transformation has been registered (by calling the `transform()` method
     * of the registry) for the plugin ID before resolving `load()` promises.
     * This means that if the attribute is set to `true` but no transformation
     * is registered in time, calls to `load()` a plugin will eventually time
     * out and reject.
     */
    'jupyter.lab.transform'?: boolean;

    /**
     * The JupyterLab shortcuts that are creaed by a plugin's schema.
     */
    'jupyter.lab.shortcuts'?: IShortcut[];

    /**
     * The root schema is always an object.
     */
    type: 'object';
  }

  /**
   * The setting values for a plugin.
   */
  export interface ISettingBundle extends JSONObject {
    /**
     * A composite of the user setting values and the plugin schema defaults.
     *
     * #### Notes
     * The `composite` values will always be a superset of the `user` values.
     */
    composite: JSONObject;

    /**
     * The user setting values.
     */
    user: JSONObject;
  }

  /**
   * An interface for manipulating the settings of a specific plugin.
   */
  export interface ISettings extends IDisposable {
    /**
     * A signal that emits when the plugin's settings have changed.
     */
    readonly changed: ISignal<this, void>;

    /**
     * The composite of user settings and extension defaults.
     */
    readonly composite: ReadonlyJSONObject;

    /**
     * The plugin's ID.
     */
    readonly id: string;

    /*
     * The underlying plugin.
     */
    readonly plugin: ISettingRegistry.IPlugin;

    /**
     * The plugin settings raw text value.
     */
    readonly raw: string;

    /**
     * The plugin's schema.
     */
    readonly schema: ISettingRegistry.ISchema;

    /**
     * The user settings.
     */
    readonly user: ReadonlyJSONObject;

    /**
     * The published version of the NPM package containing these settings.
     */
    readonly version: string;

    /**
     * Return the defaults in a commented JSON format.
     */
    annotatedDefaults(): string;

    /**
     * Calculate the default value of a setting by iterating through the schema.
     *
     * @param key - The name of the setting whose default value is calculated.
     *
     * @returns A calculated default JSON value for a specific setting.
     */
    default(key: string): JSONValue | undefined;

    /**
     * Get an individual setting.
     *
     * @param key - The name of the setting being retrieved.
     *
     * @returns The setting value.
     */
    get(key: string): { composite: ReadonlyJSONValue; user: ReadonlyJSONValue };

    /**
     * Remove a single setting.
     *
     * @param key - The name of the setting being removed.
     *
     * @returns A promise that resolves when the setting is removed.
     *
     * #### Notes
     * This function is asynchronous because it writes to the setting registry.
     */
    remove(key: string): Promise<void>;

    /**
     * Save all of the plugin's user settings at once.
     */
    save(raw: string): Promise<void>;

    /**
     * Set a single setting.
     *
     * @param key - The name of the setting being set.
     *
     * @param value - The value of the setting.
     *
     * @returns A promise that resolves when the setting has been saved.
     *
     * #### Notes
     * This function is asynchronous because it writes to the setting registry.
     */
    set(key: string, value: JSONValue): Promise<void>;

    /**
     * Validates raw settings with comments.
     *
     * @param raw - The JSON with comments string being validated.
     *
     * @returns A list of errors or `null` if valid.
     */
    validate(raw: string): ISchemaValidator.IError[] | null;
  }

  /**
   * An interface describing a JupyterLab keyboard shortcut.
   */
  export interface IShortcut extends JSONObject {
    /**
     * The optional arguments passed into the shortcut's command.
     */
    args?: JSONObject;

    /**
     * The command invoked by the shortcut.
     */
    command: string;

    /**
     * Whether a keyboard shortcut is disabled. `False` by default.
     */
    disabled?: boolean;

    /**
     * The key combination of the shortcut.
     */
    keys: string[];

    /**
     * The CSS selector applicable to the shortcut.
     */
    selector: string;
  }
}

/* tslint:disable */
/**
 * The default state database token.
 */
export const IStateDB = new Token<IStateDB>('@jupyterlab/coreutils:IStateDB');
/* tslint:enable */

/**
 * The description of a state database.
 */
export interface IStateDB<T extends ReadonlyJSONValue = ReadonlyJSONValue>
  extends IDataConnector<T> {
  /**
   * The maximum allowed length of the data after it has been serialized.
   */
  readonly maxLength: number;

  /**
   * The namespace prefix for all state database entries.
   *
   * #### Notes
   * This value should be set at instantiation and will only be used
   * internally by a state database. That means, for example, that an
   * app could have multiple, mutually exclusive state databases.
   */
  readonly namespace: string;

  /**
   * Return a serialized copy of the state database's entire contents.
   *
   * @returns A promise that bears the database contents as JSON.
   */
  toJSON(): Promise<{ [id: string]: T }>;
}
