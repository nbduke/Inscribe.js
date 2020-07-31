import { Scene, TransformNode } from 'babylonjs';

import Event from '../events/Event';
import { IEventToken } from '../events/EventToken';
import { InputEvent } from '../input/InputEvent';
import { InputEventArgs } from '../input/InputEventArgs';

/**
 * Represents an object on the view side of a 3D application.
 * 
 * `View` encapsulates a single node in the Babylon node hierarchy and hooks into the Inscribe input system.
 */
export default class View<TNode extends TransformNode = TransformNode> {
  /**
   * Gets the `View` associated with a Babylon node if one exists.
   * @param node - the node
   */
  public static get<T extends TransformNode>(node: T): View<T> | undefined {
    return node.metadata.view;
  }

  /**
   * Gets the `View` associated with a Babylon node; creates one if necessary.
   * @param node - the node
   */
  public static getOrCreate<T extends TransformNode>(node: T): View<T> {
    return this.get(node) ?? new View<T>(node);
  }

  /**
   * The Babylon node associated with this view.
   */
  public readonly node: TNode;
  /**
   * The scene object.
   */
  public readonly scene: Scene;

  private readonly _originalDispose: (doNotRecurse?: boolean, disposeMaterialAndTextures?: boolean) => void;
  private _externalInputHandlers?: Map<InputEvent, Event<any>>;
  private _internalInputHandlers?: Map<InputEvent, Event<any>>;
  private _isDisposed: boolean = false;

  constructor(node: TNode) {
    this.node = node;
    this.scene = node.getScene();
    this._originalDispose = node.dispose.bind(node);
    this.node.dispose = this._disposeNodeOverride;
    this.node.metadata.view = this;
  }

  /**
   * Gets or sets whether the associated node is enabled.
   */
  public get enabled(): boolean {
    return this.node.isEnabled(false);
  }

  public set enabled(value: boolean) {
    this.node.setEnabled(value);
  }

  /**
   * Returns true if this view has been disposed.
   */
  public get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Disposes this view along with its node.
   * @param disposeMaterialAndTextures - if true (default), materials and textures within the node's hierarchy
   * will be disposed.
   */
  public dispose(disposeMaterialAndTextures: boolean = true): void {
    if (!this.isDisposed) {
      this.onDispose();
      this.node.dispose = this._originalDispose;
      this.node.dispose(false, disposeMaterialAndTextures);
      delete this.node.metadata.view;
      this._externalInputHandlers?.clear();
      this._externalInputHandlers = undefined;
      this._internalInputHandlers?.clear();
      this._internalInputHandlers = undefined;
      this._isDisposed = true;
    }
  }

  /**
   * Subscribes a handler to an input event on this object.
   * @param event - the input event to handle
   * @param handler - the handler for the event
   */
  public addInputHandler<T extends InputEvent>(
    event: T,
    handler: (args: InputEventArgs<T>) => void
  ): IEventToken {
    if (!this._externalInputHandlers) {
      this._externalInputHandlers = new Map();
    }
    if (!this._externalInputHandlers.has(event)) {
      this._externalInputHandlers.set(event, new Event<InputEventArgs<T>>());
    }

    return this._externalInputHandlers.get(event)!.subscribe(handler);
  }

  /**
   * Subscribes a handler to an input event on this object that will be invoked before any handlers registered
   * via `addInputHandler`. This gives derived classes the chance to handle their own events first.
   * @param event - the input event to handle
   * @param handler - the handler for the event
   */
  protected addInternalInputHandler<T extends InputEvent>(
    event: T,
    handler: (args: InputEventArgs<T>) => void
  ): IEventToken {
    if (!this._internalInputHandlers) {
      this._internalInputHandlers = new Map();
    }
    if (!this._internalInputHandlers.has(event)) {
      this._internalInputHandlers.set(event, new Event<InputEventArgs<T>>());
    }

    return this._internalInputHandlers.get(event)!.subscribe(handler);
  }

  /**
   * Called before this view's node is disposed.
   */
  protected onDispose(): void {
    // no-op
  }

  private _disposeNodeOverride = (_doNotRecurse?: boolean, disposeMaterialAndTextures?: boolean): void => {
    this.dispose(disposeMaterialAndTextures);
  }
}
