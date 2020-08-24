import { IEventToken } from './EventToken';
import { IPropertyChangedArgs } from './Notifiable';

interface ITreeNode {
  readonly property: string;
  readonly children: Map<string, ITreeNode>;
  value?: any;
  propertyChangedToken?: IEventToken;
  bindings: ((value: any) => void)[];
}

/**
 * Maintains tree of bound notifiable properties. Invokes callbacks when any property chain changes.
 */
export default class BindingEngine {
  private readonly _root: ITreeNode;

  constructor(thisObject: any) {
    this._root = {
      property: 'this',
      value: thisObject,
      bindings: [],
      children: new Map()
    };
  }

  /**
   * Adds a binding, which is a callback that will be invoked when any link in a property path changes.
   * @param propertyPath - the property path
   * @param execute - the callback
   */
  public addBinding(propertyPath: string, execute: (value: any) => void): void {
    const path: string[] = propertyPath.split('.');
    let currentTreeNode: ITreeNode = this._root;
    let index: number = 1;

    while (index < path.length) {
      const property: string = path[index];
      let nextTreeNode: ITreeNode;
      if (!currentTreeNode.children.has(property)) {
        nextTreeNode = {
          property,
          value: currentTreeNode.value ? currentTreeNode.value[property] : undefined,
          bindings: [],
          children: new Map()
        };
        currentTreeNode.children.set(property, nextTreeNode);
      } else {
        nextTreeNode = currentTreeNode.children.get(property)!;
      }

      this._subscribeToPropertyChanged(currentTreeNode);

      currentTreeNode = nextTreeNode;
      ++index;
    }

    currentTreeNode.bindings.push(execute);
  }

  private _executeBindings(treeNode: ITreeNode, parentValue: any): void {
    treeNode.value = parentValue[treeNode.property];
    treeNode.bindings.forEach(f => f(treeNode.value));
    treeNode.propertyChangedToken?.unsubscribe();
    treeNode.propertyChangedToken = undefined;

    if (treeNode.value !== undefined && treeNode.children.size > 0) {
      this._subscribeToPropertyChanged(treeNode);
      treeNode.children.forEach(child => {
        this._executeBindings(child, treeNode.value);
      });
    }
  }

  private _subscribeToPropertyChanged(treeNode: ITreeNode): void {
    if (treeNode.value?.propertyChanged && !treeNode.propertyChangedToken) {
      treeNode.propertyChangedToken = treeNode.value.propertyChanged.subscribe((args: IPropertyChangedArgs) => {
        this._onPropertyChanged(treeNode, args.propertyName);
      });
    }
  }

  private _onPropertyChanged(treeNode: ITreeNode, property: string): void {
    const childNode: ITreeNode | undefined = treeNode.children.get(property);
    if (childNode) {
      this._executeBindings(childNode, treeNode.value);
    }
  }
}