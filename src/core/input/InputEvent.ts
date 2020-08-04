export type InputEvent =
  CombinedPointerEvents |
  MouseEvents |
  TouchEvents |
  VRControllerEvents |
  PointerInOutEvents;

export type CombinedPointerEvents =
  'combinedPointerDown' |
  'combinedPointerUp' |
  'combinedPointerClick';

export type MouseEvents =
  'leftMouseDown' |
  'leftMouseUp' |
  'leftMouseClick' |
  'rightMouseDown' |
  'rightMouseUp' |
  'rightMouseClick' |
  'mouseWheel';

export type TouchEvents = 
  'touchDown' |
  'touchUp' |
  'touchPress' |
  'touchLongPress';

export type VRControllerEvents =
  'vrControllerButtonDown' |
  'vrControllerButtonUp' |
  'vrControllerButtonClick' |
  'vrControllerStickMoved' |
  'vrControllerStickHeld';

export type PointerInOutEvents =
  'combinedPointerIn' |
  'combinedPointerOut' |
  'mouseIn' |
  'mouseOut' |
  'vrControllerIn' |
  'vrControllerOut';