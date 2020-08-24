import { Element, Attribute } from 'libxmljs';

import ClassBuilder from '../builders/ClassBuilder';
import MethodBuilder from '../builders/MethodBuilder';
import { IMemberNames, IImportsTracker, IReferenceableObjects } from './DocumentTranslator';
import { IObjectNames, getObjectNames, declareObject } from './ObjectNames';
import AttributeTranslator from './AttributeTranslator';

export interface IMaterialInfo {
  name: string;
  textureSlot: string;
}

const updatableTextureObservables: Set<string> = new Set([
  'onLoad', 'onLoading', 'onError'
]);

export default class TextureTranslator {
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

  public translateSharedTexture(textureElement: Element): void {
    const textureType: string = textureElement.name();
    const name: string = textureElement.attr('name')!.value();
    const objectNames: IObjectNames = getObjectNames(textureType, name);
    const initMethod: MethodBuilder = this._referenceableObjects.textures.get(name)!;
    const hasEnsureMethod: boolean = initMethod.name !== this._memberNames.init;

    declareObject(textureType, objectNames, hasEnsureMethod, this._class);

    if (hasEnsureMethod) {
      initMethod.addToBody(
        `if (this.${objectNames.privateName}) return this.${objectNames.privateName};`
      ); 
    }

    this._translateTexture(textureElement, objectNames, initMethod);

    if (hasEnsureMethod) {
      initMethod.addToBody(`return this.${objectNames.privateName};`);
    }
  }

  public translateMaterialTexture(
    textureElement: Element,
    materialInfo: IMaterialInfo,
    deferredGroup?: string
  ): void {
    const textureType: string = textureElement.name();
    const name: string | undefined = textureElement.attr('name')?.value();
    const objectNames: IObjectNames = getObjectNames(textureType, name);
    declareObject(textureType, objectNames, !!deferredGroup, this._class);

    const initMethod: MethodBuilder = this._class.getMethod(deferredGroup ?? this._memberNames.init)!;
    this._translateTexture(textureElement, objectNames, initMethod, materialInfo);
  }

  private _translateTexture(
    textureElement: Element,
    objectNames: IObjectNames,
    initMethod: MethodBuilder,
    materialInfo?: IMaterialInfo
  ): void {
    const textureType: string = textureElement.name();
    this._importsTracker.inscribe.add(textureType);

    const ctorArgNames: string[] = ['url', 'noMipmap', 'invertY', 'samplingMode'];
    const ctorArgs: string[] = ctorArgNames.map(name => {
      const attribute: Attribute | null = textureElement.attr(name);
      return attribute
        ? this._attributeTranslator.extractExpression(attribute, name === 'url')
        : 'undefined';
    });
    ctorArgs.splice(1, 0, `this.${this._memberNames.scene}`);

    initMethod.addToBody(
      `this.${objectNames.privateName} = new ${textureType}(${ctorArgs.join(',')});`
    );
    if (materialInfo) {
      initMethod.addToBody(
        `this.${materialInfo.name}.${materialInfo.textureSlot} = this.${objectNames.privateName};`
      );
    }

    const ctorArgsSet: Set<string> = new Set(ctorArgNames);
    textureElement.attrs()
      .filter(a => a.name() !== 'name')
      .map(a => {
        const attributeName: string = a.name();
        let updateMethod: string | undefined = undefined;
        if (attributeName === 'url') {
          updateMethod = 'updateURL';
        } else if (attributeName === 'samplingMode') {
          updateMethod = 'updateSamplingMode';
        }
        return this._attributeTranslator.translate(a, objectNames.privateName, {
          updateMethod,
          isObservable: updatableTextureObservables.has(attributeName),
          doNotBind: attributeName === 'invertY' || attributeName === 'noMipmap',
          useQuotesIfNeeded: attributeName === 'url'
        });
      })
      .forEach(info => {
        // Don't assign properties passed to the constructor
        if (!ctorArgsSet.has(info.name)) {
          initMethod.addToBody(info.propertySetter);
        }
        if (info.addBinding) {
          initMethod.addToBody(info.addBinding);
        }
      });
  }
}