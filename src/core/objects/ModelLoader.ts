import {
  AbstractMesh,
  Scene,
  SceneLoader,
  SceneLoaderProgressEvent,
  TransformNode,
  Vector3
} from 'babylonjs';

import Event, { IEvent } from '../events/Event';

/**
 * Encapsulates an asynchronously loading 3D model.
 */
export default class ModelLoader extends TransformNode {
  /**
   * If true (default is false), models will be normalized to fit within a unit cube centered on this node.
   */
  public shouldNormalize: boolean = false;
  /**
   * If true (default is false), changing `url` will not change `model` until after the requested file
   * loads or hits an error.
   */
  public updateModelAfterLoad: boolean = false;

  private readonly _loaded: Event<AbstractMesh> = new Event();
  private readonly _loading: Event<string> = new Event();
  private readonly _progress: Event<SceneLoaderProgressEvent> = new Event();
  private readonly _loadFailed: Event<Error> = new Event();

  private _url?: string;
  private _model?: AbstractMesh;
  private _isLoading: boolean = false;

  constructor(scene: Scene, name?: string, url?: string) {
    super(name ?? 'ModelLoader', scene);
    this._url = url;

    if (url) {
      this._updateModel();
    }
  }

  /**
   * Gets the model's root mesh, if it exists.
   */
  public get model(): AbstractMesh | undefined {
    return this._model;
  }

  /**
   * Returns true if a model is currently loading.
   */
  public get isLoading(): boolean {
    return this._isLoading;
  }

  /**
   * Fires when a model finishes loading.
   */
  public get loaded(): IEvent<AbstractMesh> {
    return this._loaded;
  }

  /**
   * Fires when a model begins loading.
   */
  public get loading(): IEvent<string> {
    return this._loading;
  }

  /**
   * Fires during loading as progress is made.
   */
  public get progress(): IEvent<SceneLoaderProgressEvent> {
    return this._progress;
  }

  /**
   * Fires when an error occurs during loading.
   */
  public get loadFailed(): IEvent<Error> {
    return this._loadFailed;
  }

  /**
   * Gets or sets the URL of the model to load.
   * - Setting to `undefined` will dispose the model (if it exists) and leave this node empty.
   * - If set while loading a model, the most recent URL will be loaded.
   * - If `updateViewAfterLoad` is false, changing `url` will immediately dispose the model (if it exists).
   */
  public get url(): string | undefined {
    return this._url;
  }

  public set url(value: string | undefined) {
    if (this._url !== value) {
      this._url = value;
      this._updateModel();
    }
  }

  private _updateModel(): void {
    if (!this.updateModelAfterLoad || !this.url) {
      this.model?.dispose(false, true);
      this._model = undefined;
      this._isLoading = false;
    }

    if (this.url) {
      this._isLoading = true;
      this._loading.raise(this.url);

      const currentUrl: string = this.url;
      SceneLoader.LoadAssetContainerAsync(
        currentUrl,
        undefined,
        this._scene,
        event => {
          if (!this.isDisposed && currentUrl === this.url) {
            this._progress.raise(event)
          }
        }
      ).then(container => {
        const model: AbstractMesh = container.meshes[0];
        if (this.isDisposed || currentUrl !== this.url) {
          model.dispose(false, true);
          return;
        }

        if (this.shouldNormalize) {
          model.normalizeToUnitCube(true);
          const { min, max } = model.getHierarchyBoundingVectors(true);
          const center: Vector3 = min.add(max).scale(0.5);
          model.position = model.absolutePosition.subtract(center);
        }

        if (this.updateModelAfterLoad) {
          this.model?.dispose(false, true);
        }

        this._model = model;
        this._model.parent = this;
        container.addAllToScene();

        this._isLoading = false;
        this._loaded.raise(model);
      }).catch(error => {
        if (!this.isDisposed && currentUrl === this.url) {
          if (this.updateModelAfterLoad) {
            this.model?.dispose(false, true);
            this._model = undefined;
          }

          this._isLoading = false;
          this._loadFailed.raise(error);
        }
      });
    }
  }
}