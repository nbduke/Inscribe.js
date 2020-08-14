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

  private readonly _loaded: Event<AbstractMesh> = new Event();
  private readonly _loading: Event<string> = new Event();
  private readonly _progress: Event<SceneLoaderProgressEvent> = new Event();
  private readonly _loadFailed: Event<Error> = new Event();

  private _url?: string;
  private _model?: AbstractMesh;

  constructor(scene: Scene, name?: string, url?: string) {
    super(name ?? 'ModelLoader', scene);

    if (url) {
      this._url = url;
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
    this.model?.dispose(false, true);
    this._model = undefined;

    if (this.url) {
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

        this._model = model;
        this._model.parent = this;
        container.addAllToScene();
        this._loaded.raise(model);
      }).catch(error => {
        if (!this.isDisposed && currentUrl === this.url) {
          this._loadFailed.raise(error);
        }
      });
    }
  }
}