import isEqual from 'lodash/isEqual';

import Event, { IEvent } from './Event';

/**
 * Event args for a property change on an object.
 */
export interface IPropertyChangedArgs {
  propertyName: string;
  value: unknown;
}

/**
 * Exposes a `propertyChanged` event.
 */
export interface INotifiable {
  propertyChanged: IEvent<IPropertyChangedArgs>;
}

/**
 * Makes the setter of a property notifiable, meaning that changes will trigger a fire of
 * the target instance's `propertyChanged` event.
 * @param target - the target of the decorator
 * @param propertyName - the name of the notifiable property
 * @param descriptor - the descriptor of the property
 */
export default function Notifiable(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  if (descriptor.set) {
    const set: (v: any) => void = descriptor.set;
    descriptor.set = function (value) {
      const instance: any = this;
      if (!isEqual(instance[propertyName], value)) {
        set.call(this, value);
        instance.propertyChanged?.raise({
          propertyName,
          value
        });
      }
    };
  }
}

/**
 * Adds a `propertyChanged` event to an object instance.
 * 
 * Note that this effect is runtime-only. TypeScript is not aware of the event at compile-time.
 * @param target - the target of the decorator
 */
export function NotifiableClass<T extends { new(...args: any[]): {} }>(target: T) {
  return class extends target {
    propertyChanged = new Event<IPropertyChangedArgs>()
  }
}
