import { AbstractMesh, Ray, StickValues, Vector3 } from 'babylonjs';

import {
  InputEvent,
  CombinedPointerEvents,
  MouseEvents,
  TouchEvents,
  VRControllerEvents
} from './InputEvent';

export type InputEventArgs<T extends InputEvent> =
  T extends CombinedPointerEvents ? ICombinedPointerArgs :
  T extends 'combinedPointerIn' ? ICombinedPointerInArgs :
  T extends 'combinedPointerOut' ? ICombinedPointerOutArgs :
  T extends MouseEvents ? IMouseEventArgs : 
  T extends 'mouseIn' ? IMouseInArgs :
  T extends 'mouseOut' ? IMouseOutArgs :
  T extends TouchEvents ? ITouchEventArgs :
  T extends VRControllerEvents ? IVRControllerEventArgs :
  T extends 'vrControllerIn' ? IVRControllerInArgs :
  T extends 'vrControllerOut' ? IVRControllerOutArgs :
  never;

export enum DeviceType {
  Mouse = 'mouse',
  Touch = 'touch',
  VRController = 'vrcontroller'
}

interface IBaseInputEventArgs {
  handled: boolean;
  pickedMesh?: AbstractMesh;
  pickedPoint?: Vector3;
  pickRay?: Ray;
}

export interface IMouseEventArgs extends IBaseInputEventArgs {
  deviceType: DeviceType.Mouse;
  pointerId: number;
  button: number;
  screenX: number;
  screenY: number;
  canvasX: number;
  canvasY: number;
  wheelValues?: { deltaX: number, deltaY: number };
}

export interface ITouchEventArgs extends IBaseInputEventArgs {
  deviceType: DeviceType.Touch;
  x: number;
  y: number;
  // TODO other touch data, like pressure
}

export enum VRControllerButton {
  Trigger = 'xr-standard-trigger',
  Squeeze = 'xr-standard-squeeze',
  Thumbstick = 'xr-standard-thumbstick',
  Touchpad = 'xr-standard-touchpad'
}

export interface IVRControllerEventArgs extends IBaseInputEventArgs {
  deviceType: DeviceType.VRController;
  controllerId: number;
  hand: 'none' | 'left' | 'right';
  button: VRControllerButton;
  stickValues?: StickValues;
  forwardRay: Ray;
}

export type ICombinedPointerArgs = IMouseEventArgs | ITouchEventArgs | IVRControllerEventArgs;

interface IBasePointerInArgs extends IBaseInputEventArgs {
  enteredMesh: AbstractMesh;
}

interface IBasePointerOutArgs extends IBaseInputEventArgs {
  exitedMesh: AbstractMesh;
}

export type IMouseInArgs = IMouseEventArgs & IBasePointerInArgs;
export type IVRControllerInArgs = IVRControllerEventArgs & IBasePointerInArgs;
export type ICombinedPointerInArgs = IMouseInArgs | IVRControllerInArgs;

export type IMouseOutArgs = IMouseEventArgs & IBasePointerOutArgs;
export type IVRControllerOutArgs = IVRControllerEventArgs & IBasePointerOutArgs;
export type ICombinedPointerOutArgs = IMouseOutArgs | IVRControllerOutArgs;