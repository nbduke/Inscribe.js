import { Element, Attribute } from 'libxmljs';

import ClassBuilder, { lineDelim } from '../builders/ClassBuilder';
import PropertyBuilder from '../builders/PropertyBuilder';
import MethodBuilder from '../builders/MethodBuilder';
import { IMemberNames, IImportsTracker, ISharedObjects } from './DocumentTranslator';
import { IObjectNames, getObjectNames } from './ObjectNames';
import AttributeTranslator, { IAttributeInfo } from './AttributeTranslator';

const shapeConstructorProps: Map<string, Set<string>> = new Map([
  ['Sphere', new Set(['diameter', 'segments'])],
  ['Box', new Set(['width', 'height', 'depth', 'size'])],
  ['Cylinder', new Set(['diameter', 'diameterTop', 'diameterBottom', 'height', 'tessellation'])],
  ['Plane', new Set(['width', 'height', 'size'])],
  ['Disc', new Set(['radius', 'tessellation'])]
]);
const customNodeMetaProps: Set<string> = new Set([
  'name', 'type', 'factory', 'attachChildrenTo'
]);

export default class NodeTranslator {
  private readonly _class: ClassBuilder;
  private readonly _importsTracker: IImportsTracker;
  private readonly _sharedObjects: ISharedObjects;
  private readonly _memberNames: IMemberNames;
  private readonly _attributeTranslator: AttributeTranslator;

  constructor(
    classBuilder: ClassBuilder,
    importsTracker: IImportsTracker,
    sharedObjects: ISharedObjects,
    memberNames: IMemberNames
  ) {
    this._class = classBuilder;
    this._importsTracker = importsTracker;
    this._sharedObjects = sharedObjects;
    this._memberNames = memberNames;
    this._attributeTranslator = new AttributeTranslator(importsTracker, memberNames);
  }

  public translate(nodesSection: Element): void {
    nodesSection.childNodes().forEach(nodeElement => {
      this._translateRecursive(nodeElement, this._memberNames.root);
    });
  }

  private _translateRecursive(element: Element, parentName: string, deferredGroup?: string): void {
    const nodeType: string = element.name();
    switch (nodeType) {
      case 'TransformNode':
        this._translateTransformNode(element, parentName, deferredGroup);
        break;
      case 'Sphere':
      case 'Box':
      case 'Cylinder':
      case 'Plane':
      case 'Disc':
        this._translateShape(element, parentName, deferredGroup);
        break;
      case 'ModelLoader':
        this._translateModelLoader(element, parentName, deferredGroup);
        break;
      case 'Custom':
        this._translateCustom(element, parentName, deferredGroup);
        break;
      case 'DeferredGroup':
        this._translateDeferredGroup(element, parentName);
        break;
    }
  }

  private _translateTransformNode(element: Element, parentName: string, deferredGroup?: string): void {
    const nodeType: string = element.name();
    this._importsTracker.babylon.add(nodeType);
    const objectNames: IObjectNames = getObjectNames(nodeType, element.attr('name')?.value());
    this._declareObject(nodeType, objectNames, !!deferredGroup);

    const initMethod: MethodBuilder = this._class.getMethod(deferredGroup ?? this._memberNames.init)!;
    initMethod.addToBody(
      `this.${objectNames.privateName} = new TransformNode('${objectNames.publicName}', this.${this._memberNames.scene});`,
      `this.${name}.parent = this.${parentName};`
    );

    element.attrs().filter(a => a.name() !== 'name').forEach(a => {
      const attributeInfo: IAttributeInfo = this._attributeTranslator.translate(a, nodeType, objectNames);
      initMethod.addToBody(attributeInfo.propertySetter);
      if (attributeInfo.addBinding) {
        initMethod.addToBody(attributeInfo.addBinding);
      }
    });

    element.childNodes().forEach(child => this._translateRecursive(child, objectNames.privateName, deferredGroup));
  }

  private _translateShape(element: Element, parentName: string, deferredGroup?: string): void {
    const shapeType: string = element.name();
    this._importsTracker.inscribe.add(shapeType);
    const objectNames: IObjectNames = getObjectNames(shapeType, element.attr('name')?.value());
    this._declareObject(shapeType, objectNames, !!deferredGroup);

    const attributeInfos: IAttributeInfo[] = element.attrs()
      .filter(a => a.name() !== 'name')
      .map(a => this._attributeTranslator.translate(a, shapeType, objectNames));

    const ctorProps: Set<string> = shapeConstructorProps.get(shapeType)!;
    const propsObject: string = attributeInfos
      .filter(info => ctorProps.has(info.name))
      .map(info => {
        return `${info.name}: ${info.value}`
      })
      .join(',' + lineDelim);

    const initMethod: MethodBuilder = this._class.getMethod(deferredGroup ?? this._memberNames.init)!;
    initMethod.addToBody(
      `this.${objectNames.privateName} = new ${shapeType}(`,
      `  this.${this._memberNames.scene},`,
      `  '${objectNames.publicName}',`,
      `  {${propsObject}}`,
      ');',
      `this.${name}.parent = this.${parentName};`
    );

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

    element.childNodes().forEach(child => this._translateRecursive(child, objectNames.privateName, deferredGroup));
  }

  private _handleMaterialAttribute(nodeName: string, materialName: string, nodeInitMethod: MethodBuilder): void {
    if (!this._sharedObjects.materials.has(materialName)) {
      throw new Error('Unmatched reference');
    }
    const ensureMethodName: string = `_ensure_${materialName}`;
    if (!this._class.hasMethod(ensureMethodName)) {
      const ensureMethod: MethodBuilder = new MethodBuilder(
        ensureMethodName,
        'Material',
        'private'
      );
      this._class.addMethod(ensureMethod);
    }
    nodeInitMethod.addToBody(
      `this.${nodeName}.material = this.${ensureMethodName}();`
    );
  }

  private _translateModelLoader(element: Element, parentName: string, deferredGroup?: string): void {
    const nodeType: string = element.name();
    this._importsTracker.inscribe.add(nodeType);
    const objectNames: IObjectNames = getObjectNames(nodeType, element.attr('name')?.value());
    this._declareObject(nodeType, objectNames, !!deferredGroup);

    const initMethod: MethodBuilder = this._class.getMethod(deferredGroup ?? this._memberNames.init)!;

    let urlAttribute: Attribute | null = element.attr('url');
    if (urlAttribute) {
      const url: string = this._attributeTranslator.extractExpression(urlAttribute);
      initMethod.addToBody(
        `this.${objectNames.privateName} = new ${nodeType}(this.${this._memberNames.scene}, '${objectNames.publicName}', ${url});`
      );
    } else {
      initMethod.addToBody(
        `this.${objectNames.privateName} = new ${nodeType}(this.${this._memberNames.scene}, '${objectNames.publicName}');`
      );
    }
    initMethod.addToBody(`this.${name}.parent = this.${parentName};`);

    element.attrs()
      .filter(a => a.name() !== 'name')
      .map(a => this._attributeTranslator.translate(a, nodeType, objectNames))
      .forEach(info => {
      // Don't set url property; it is passed to the constructor
      if (info.name !== 'url') {
        initMethod.addToBody(info.propertySetter);
      }

      if (info.addBinding) {
        initMethod.addToBody(info.addBinding);
      }
    });

    element.childNodes().forEach(child => this._translateRecursive(child, objectNames.privateName, deferredGroup));
  }

  private _translateCustom(element: Element, parentName: string, deferredGroup?: string): void {
    const type: string = element.attr('type')!.value();
    const objectNames: IObjectNames = getObjectNames(type, element.attr('name')!.value());
    this._declareObject(type, objectNames, !!deferredGroup);

    const attributeInfos: IAttributeInfo[] = element.attrs()
      .filter(a => !customNodeMetaProps.has(a.name()))
      .map(a => this._attributeTranslator.translate(a, 'Custom', objectNames));
    const propsObject: string = attributeInfos
      .map(info => {
        return `${info.name}: ${info.value}`;
      })
      .join(',' + lineDelim);

    const initMethod: MethodBuilder = this._class.getMethod(deferredGroup ?? this._memberNames.init)!;
    const factory: string = this._attributeTranslator.extractExpression(element.attr('factory')!);
    initMethod.addToBody(
      `this.${objectNames.privateName} = (${factory})({${propsObject}}, this.${parentName});`
    );

    attributeInfos.forEach(info => {
      if (info.addBinding) {
        initMethod.addToBody(info.addBinding);
      }
    });

    const attachChildrenTo: string | undefined = element.attr('attachChildrenTo')?.value();
    const parentSetter: string = objectNames.privateName + (attachChildrenTo ? `.${attachChildrenTo}` : '');
    element.childNodes().forEach(child => this._translateRecursive(child, parentSetter, deferredGroup));
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

    element.childNodes().forEach(child => this._translateRecursive(child, parentName, name));

    const onInit: Attribute | null = element.attr('onInit');
    if (onInit) {
      const expression: string = this._attributeTranslator.extractExpression(onInit);
      initMethod.addToBody(`(${expression})();`);
    }
  }

  private _declareObject(type: string, objectNames: IObjectNames, isDeferred: boolean): void {
    this._class.addMemberVariable(
      objectNames.privateName,
      type,
      'private',
      undefined,
      isDeferred ? '?' : '!'
    );

    if (!objectNames.isNameGenerated) {
      const propertyType: string = isDeferred ? type + ' | undefined' : type;
      const property: PropertyBuilder = new PropertyBuilder(objectNames.publicName, propertyType, 'protected');
      property.addToGetterBody(`return this.${objectNames.privateName};`);
      this._class.addProperty(property);
    }
  }
}