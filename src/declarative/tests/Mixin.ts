import { Node,
Scene,
StandardMaterial } from '@babylonjs/core';
import {  } from '@babylonjs/gui';
import { BindingEngine,
Box,
Event,
ModelLoader } from '../../index';
import { isEqual } from 'lodash';
export default class Mixin   {
  
  
  private _root: Node | null = null;
  private _scene!: Scene;
  private _bindingEngine!: BindingEngine;
  private _isInitialized: boolean = false;
  private _mixin!: any;
  private x_modelUrl!: string;
  private x_showPodium!: boolean;
  private x_ModelLoader1!: ModelLoader;
  private _is_podiumGroup_initialized: boolean = false;
  private x__podium?: Box;
  private x__podiumMat?: StandardMaterial;
  
  
  public get modelUrl(): string {
    return this.x_modelUrl;
  }

  public set modelUrl(value: string) {
    if (!isEqual(this.x_modelUrl, value)) {
      this.x_modelUrl = value;
      this._mixin.propertyChanged.raise({ propertyName: 'modelUrl', value });
    }
  }
  
  public get showPodium(): boolean {
    return this.x_showPodium;
  }

  public set showPodium(value: boolean) {
    if (!isEqual(this.x_showPodium, value)) {
      this.x_showPodium = value;
      this._mixin.propertyChanged.raise({ propertyName: 'showPodium', value });
    }
  }
  
  
  protected get _podium(): Box | undefined {
    return this.x__podium;
  }

  
  protected get _podiumMat(): StandardMaterial | undefined {
    return this.x__podiumMat;
  }

  
  protected __init(root: Node | Scene, mixin: any): void {
    if (this._isInitialized) return;
    this._isInitialized = true;
    if (root instanceof Scene) {
      this._root = null;
      this._scene = root;
    } else {
      this._root = root;
      this._scene = root.getScene();
    }
    this._bindingEngine = new BindingEngine(this);
    this._mixin = mixin;
    if (!mixin.propertyChanged) {
      mixin.propertyChanged = new Event();
    }
    this.x_showPodium = true;
    this.x_ModelLoader1 = new ModelLoader(this._scene, 'ModelLoader1', this._mixin.modelUrl);
    this.x_ModelLoader1.parent = this._root;
    this._bindingEngine.addBinding('this._mixin.modelUrl', (value) => { this.x_ModelLoader1!.url = value; });
    this.x_ModelLoader1!.setEnabled(this._mixin._canShowModel);
    this._bindingEngine.addBinding('this._mixin._canShowModel', (value) => { this.x_ModelLoader1!.setEnabled(value); });
    this.x_ModelLoader1!.shouldNormalize = true;
    this.x_ModelLoader1!.loaded.subscribe(this._mixin._onModelLoaded);
    this._bindingEngine.addBinding('this._mixin.showPodium', (value) => { if (value) this.ensure_podiumGroup(); });
  }
  
  protected ensure_podiumGroup(): void {
    if (this._is_podiumGroup_initialized) return;
    this._is_podiumGroup_initialized = true;
    this.x__podium = new Box(
      this._scene,
      '_podium',
      {size: 1}
    );
    this.x__podium.parent = this._root;
    this.x__podium!.scaling = this._mixin._podiumScaling;
    this._bindingEngine.addBinding('this._mixin._podiumScaling', (value) => { this.x__podium!.scaling = value; });
    this.x__podium!.position.y = -0.5;
    this.x__podium!.isPickable = false;
    this.x__podium!.setEnabled(this._mixin.showPodium);
    this._bindingEngine.addBinding('this._mixin.showPodium', (value) => { this.x__podium!.setEnabled(value); });
    this.x__podiumMat = new StandardMaterial('_podiumMat', this._scene);
    this.x__podium.material = this.x__podiumMat;
    this.x__podiumMat!.emissiveColor = this._mixin._podiumColor;
    this._bindingEngine.addBinding('this._mixin._podiumColor', (value) => { this.x__podiumMat!.emissiveColor = value; });
    this.x__podiumMat!.diffuseColor = this._mixin._podiumColor;
    this._bindingEngine.addBinding('this._mixin._podiumColor', (value) => { this.x__podiumMat!.diffuseColor = value; });
  }
  
  
}