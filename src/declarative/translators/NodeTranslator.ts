import { Element, Attribute } from 'libxmljs';

import ClassBuilder, { lineDelim } from '../builders/ClassBuilder';
import MethodBuilder from '../builders/MethodBuilder';
import { IMemberNames, IImportsTracker, IReferenceableObjects } from './DocumentTranslator';
import { IObjectNames, getObjectNames, declareObject } from './ObjectNames';
import AttributeTranslator, { IAttributeInfo } from './AttributeTranslator';
import MaterialTranslator from './MaterialTranslator';

const shapeConstructorProps: Map<string, Set<string>> = new Map([
  ['Sphere', new Set(['diameter', 'segments'])],
  ['Box', new Set(['width', 'height', 'depth', 'size'])],
  ['Cylinder', new Set(['diameter', 'diameterTop', 'diameterBottom', 'height', 'tessellation'])],
  ['Plane', new Set(['width', 'height', 'size'])],
  ['Disc', new Set(['radius', 'tessellation'])]
]);
const modelLoaderEvents: Set<string> = new Set([
  'loaded', 'loading', 'loadFailed', 'progress'
]);
const customNodeMetaProps: Set<string> = new Set([
  'name', 'type', 'factory', 'attachChildrenTo'
]);

export default class NodeTranslator {
  private readonly _class: ClassBuilder;
  private readonly _importsTracker: IImportsTracker;
  private readonly _referenceableObjects: IReferenceableObjects;
  private readonly _memberNames: IMemberNames;
  private readonly _attributeTranslator: AttributeTranslator;

  constructor(
    classBuilder: ClassBuilder,
    importsTracker: IImportsTracker,
    referenceableObjects: IReferenceableObjects,
    memberNames: IMemberNames
  ) {
    this._class = classBuilder;
    this._importsTracker = importsTracker;
    this._referenceableObjects = referenceableObjects;
    this._memberNames = memberNames;
    this._attributeTranslator = new AttributeTranslator(importsTracker, memberNames);
  }

  public translate(nodesSection: Element): void {
    nodesSection.childNodes().forEach(nodeElement => {
      this._translateRecursive(nodeElement, this._memberNames.root, this._class.getMethod(this._memberNames.init)!);
    });
  }

  private _translateRecursive(element: Element, parentName: string, initMethod: MethodBuilder): void {
    const nodeType: string = element.name();
    switch (nodeType) {
      case 'TransformNode':
        this._translateTransformNode(element, parentName, initMethod);
        break;
      case 'Sphere':
      case 'Box':
      case 'Cylinder':
      case 'Plane':
      case 'Disc':
        this._translateShape(element, parentName, initMethod);
        break;
      case 'ModelLoader':
        this._translateModelLoader(element, parentName, initMethod);
        break;
      case 'Custom':
        this._translateCustom(element, parentName, initMethod);
        break;
      case 'DeferredGroup':
        this._translateDeferredGroup(element, parentName);
        break;
      case 'Material':
        this._translateMaterial(element, parentName, initMethod);
        break;
    }
  }

  private _translateTransformNode(element: Element, parentName: string, initMethod: MethodBuilder): void {
    const nodeType: string = element.name();
    this._importsTracker.babylonCore.add(nodeType);
    const objectNames: IObjectNames = getObjectNames(nodeType, element.attr('name')?.value());
    declareObject(nodeType, objectNames, initMethod.name !== this._memberNames.init, this._class);

    initMethod.addToBody(
      `this.${objectNames.privateName} = new ${nodeType}('${objectNames.publicName}', this.${this._memberNames.scene});`,
      `this.${objectNames.privateName}.parent = this.${parentName};`
    );

    element.attrs()
      .filter(a => a.name() !== 'name')
      .map(a => {
        return this._attributeTranslator.translate(a, objectNames.privateName, {
          updateMethod: a.name() === 'enabled' ? 'setEnabled' : undefined
        });
      })
      .forEach(info => {
      initMethod.addToBody(info.propertySetter);
      if (info.addBinding) {
        initMethod.addToBody(info.addBinding);
      }
    });

    element.childNodes().forEach(child => this._translateRecursive(child, objectNames.privateName, initMethod));
  }

  private _translateShape(element: Element, parentName: string, initMethod: MethodBuilder): void {
    const shapeType: string = element.name();
    this._importsTracker.inscribe.add(shapeType);
    const objectNames: IObjectNames = getObjectNames(shapeType, element.attr('name')?.value());
    declareObject(shapeType, objectNames, initMethod.name !== this._memberNames.init, this._class);

    const attributeInfos: IAttributeInfo[] = element.attrs()
      .filter(a => a.name() !== 'name')
      .map(a => this._attributeTranslator.translate(a, objectNames.privateName, {
        updateMethod: a.name() === 'enabled' ? 'setEnabled' : undefined
      }));

    const ctorProps: Set<string> = shapeConstructorProps.get(shapeType)!;
    const propsObject: string = attributeInfos
      .filter(info => ctorProps.has(info.name))
      .map(info => {
        return `${info.name}: ${info.value}`
      })
      .join(',' + lineDelim);

    initMethod.addToBody(
      `this.${objectNames.privateName} = new ${shapeType}(`,
      `  this.${this._memberNames.scene},`,
      `  '${objectNames.publicName}',`,
      `  {${propsObject}}`,
      ');',
      `this.${objectNames.privateName}.parent = this.${parentName};`
    );

    if (objectNames.isReferenceable) {
      this._referenceableObjects.nodes.set(objectNames.publicName, initMethod);
    }

    attributeInfos.forEach(info => {
      if (info.name === 'material') {
        this._handleMaterialAttribute(objectNames.privateName, info.value, initMethod);
      } else {
        // Don't set properties that were passed to the constructor
        if (!ctorProps.has(info.name)) {
          initMethod.addToBody(info.propertySetter);
        }
        if (info.addBinding) {
          initMethod.addToBody(info.addBinding);
        } 
      }
    });

    element.childNodes().forEach(child => this._translateRecursive(child, objectNames.privateName, initMethod));
  }

  private _handleMaterialAttribute(nodeName: string, materialName: string, nodeInitMethod: MethodBuilder): void {
    if (!this._referenceableObjects.materials.has(materialName)) {
      throw new Error(`Material reference not found: ${materialName}`);
    }
    const ensureMethodName: string = `_ensure_${materialName}`;
    const ensureMethod: MethodBuilder = new MethodBuilder(ensureMethodName, 'Material', 'private');
    this._class.addMethod(ensureMethod);
    this._referenceableObjects.materials.set(materialName, ensureMethod); // replace init method with ensure method
    this._importsTracker.babylonCore.add('Material');
    nodeInitMethod.addToBody(
      `this.${nodeName}.material = this.${ensureMethodName}();`
    );
  }

  private _translateModelLoader(element: Element, parentName: string, initMethod: MethodBuilder): void {
    const nodeType: string = element.name();
    this._importsTracker.inscribe.add(nodeType);
    const objectNames: IObjectNames = getObjectNames(nodeType, element.attr('name')?.value());
    declareObject(nodeType, objectNames, initMethod.name !== this._memberNames.init, this._class);

    const url: string = this._attributeTranslator.extractExpression(element.attr('url')!, true);
    initMethod.addToBody(
      `this.${objectNames.privateName} = new ${nodeType}(this.${this._memberNames.scene}, '${objectNames.publicName}', ${url});`,
      `this.${objectNames.privateName}.parent = this.${parentName};`
    );

    element.attrs()
      .filter(a => a.name() !== 'name')
      .map(a => {
        const attributeName: string = a.name();
        return this._attributeTranslator.translate(a, objectNames.privateName, {
          updateMethod: attributeName === 'enabled' ? 'setEnabled' : undefined,
          isEvent: modelLoaderEvents.has(attributeName),
          useQuotesIfNeeded: attributeName === 'url'
        });
      })
      .forEach(info => {
      // Don't set url property; it is passed to the constructor
      if (info.name !== 'url') {
        initMethod.addToBody(info.propertySetter);
      }
      if (info.addBinding) {
        initMethod.addToBody(info.addBinding);
      }
    });

    element.childNodes().forEach(child => this._translateRecursive(child, objectNames.privateName, initMethod));
  }

  private _translateCustom(element: Element, parentName: string, initMethod: MethodBuilder): void {
    const type: string = element.attr('type')!.value();
    const objectNames: IObjectNames = getObjectNames(type, element.attr('name')!.value());
    declareObject(type, objectNames, initMethod.name !== this._memberNames.init, this._class);

    const attributeInfos: IAttributeInfo[] = element.attrs()
      .filter(a => !customNodeMetaProps.has(a.name()))
      .map(a => this._attributeTranslator.translate(a, objectNames.privateName, { doNotParsePrimitives: true }));
    const propsObject: string = attributeInfos
      .map(info => {
        return `'${info.name}': ${info.value}`;
      })
      .join(',' + lineDelim);

    const factory: string = this._attributeTranslator.extractExpression(element.attr('factory')!);
    initMethod.addToBody(
      `this.${objectNames.privateName} = (${factory})({${propsObject}}, this.${parentName});`
    );

    if (objectNames.isReferenceable) {
      this._referenceableObjects.nodes.set(objectNames.publicName, initMethod);
    }

    attributeInfos.forEach(info => {
      if (info.addBinding) {
        initMethod.addToBody(info.addBinding);
      }
    });

    const attachChildrenTo: string | undefined = element.attr('attachChildrenTo')?.value();
    const parentSetter: string = objectNames.privateName + (attachChildrenTo ? `.${attachChildrenTo}` : '');
    element.childNodes().forEach(child => this._translateRecursive(child, parentSetter, initMethod));
  }

  private _translateDeferredGroup(element: Element, parentName: string): void {
    const name: string = element.attr('name')!.value();
    const variableName: string = `_is_${name}_initialized`;
    this._class.addMemberVariable(variableName, 'boolean', 'private', 'false');

    const methodName: string = `ensure_${name}`;
    const initMethod: MethodBuilder = new MethodBuilder(methodName, 'void', 'protected');
    initMethod.addToBody(
      `if (this.${variableName}) return;`,
      `this.${variableName} = true;`
    );
    this._class.addMethod(initMethod);

    const initWhen: Attribute | null = element.attr('initWhen');
    if (initWhen) {
      const bindingKey: string = this._attributeTranslator.extractExpression(initWhen);
      this._class.getMethod(this._memberNames.init)!.addToBody(
        `this.${this._memberNames.addBinding}(${bindingKey}, (value) => { if (value) this.${methodName}(); });`
      );
    }

    element.childNodes().forEach(child => this._translateRecursive(child, parentName, initMethod));

    const onInit: Attribute | null = element.attr('onInit');
    if (onInit) {
      const expression: string = this._attributeTranslator.extractExpression(onInit);
      initMethod.addToBody(`(${expression})();`);
    }
  }

  private _translateMaterial(element: Element, parentName: string, initMethod: MethodBuilder): void {
    if ((element.parent() as Element).attr('material')) {
      throw new Error(`Conflicting material assignments on node ${parentName.slice(2)}.`);
    }

    const materialTranslator: MaterialTranslator = new MaterialTranslator(
      this._class,
      this._importsTracker,
      this._referenceableObjects,
      this._memberNames
    );
    materialTranslator.translateNodeMaterial(element.child(0)!, parentName, initMethod);
  }
}