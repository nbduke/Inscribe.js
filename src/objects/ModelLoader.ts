import {
  AbstractMesh,
  Scene,
  SceneLoader,
  SceneLoaderProgressEvent,
  TransformNode,
  Vector3
} from "babylonjs";

import Event, { IEvent } from "../events/Event";

export default class ModelLoader extends TransformNode {
  public shouldNormalize: boolean = false;
  public updateViewAfterLoad: boolean = false;

  private readonly _loaded: Event<AbstractMesh> = new Event();
  private readonly _loading: Event<void> = new Event();
  private readonly _progress: Event<SceneLoaderProgressEvent> = new Event();
  private readonly _loadFailed: Event<Error> = new Event();

  private _url?: string;
  private _model?: AbstractMesh;

  constructor(scene: Scene, name?: string, url?: string) {
    super(name ?? 'ModelLoader', scene);

    if (url) {
      this._updateModel();
    }
  }

  public get model(): AbstractMesh | undefined {
    return this._model;
  }

  public get loaded(): IEvent<AbstractMesh> {
    return this._loaded;
  }

  public get loading(): IEvent<void> {
    return this._loading;
  }

  public get progress(): IEvent<SceneLoaderProgressEvent> {
    return this._progress;
  }

  public get loadFailed(): IEvent<Error> {
    return this._loadFailed;
  }

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
    if (this.model && !this.updateViewAfterLoad) {
      this.model.dispose(false, true);
      this._model = undefined;
    }

    if (this.url) {
      this._loading.raise();
      const currentUrl: string = this.url;
      SceneLoader.LoadAssetContainerAsync(
        currentUrl,
        undefined,
        this._scene,
        event => this._progress.raise(event)
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

        if (this.updateViewAfterLoad) {
          this._model?.dispose(false, true);
        }

        this._model = model;
        this._model.parent = this;
        container.addAllToScene();
        this._loaded.raise(model);
      }).catch(error => {
        this._loadFailed.raise(error);
      });
    }
  }
}