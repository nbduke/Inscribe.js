import { IEvent } from "./Event";

/**
 * A token used to track a single event handler.
 */
export interface IEventToken {
  /**
   * The handler id.
   */
  readonly id: number;
  /**
   * Unsubscribes the handler from the originating event.
   */
  unsubscribe(): void;
  /**
   * Invalidates the token (only used internally).
   */
  invalidate(): void;
}

export default class EventToken implements IEventToken {
  private _id: number;
  private readonly _event: IEvent;

  constructor(id: number, event: IEvent) {
    this._id = id;
    this._event = event;
  }

  public get id(): number {
    return this._id;
  }

  public unsubscribe(): void {
    this._event.unsubscribe(this);
  }

  public invalidate(): void {
    this._id = -1;
  }
}