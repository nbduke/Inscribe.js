import { Element, Attribute } from 'libxmljs';

import ClassBuilder from '../builders/ClassBuilder';
import MethodBuilder from '../builders/MethodBuilder';
import { IMemberNames, IImportsTracker } from './DocumentTranslator';
import { IObjectNames, getObjectNames, declareObject } from './ObjectNames';
import AttributeTranslator from './AttributeTranslator';

export interface IMaterialInfo {
  name: string;
  textureSlot: string;
}

export default class TextureTranslator {
  private readonly _class: ClassBuilder;
  private readonly _importsTracker: IImportsTracker;
  private readonly _memberNames: IMemberNames;
  private readonly _attributeTranslator: AttributeTranslator;

  constructor(
    classBuilder: ClassBuilder,
    importsTracker: IImportsTracker,
    memberNames: IMemberNames
  ) {
    this._class = classBuilder;
    this._importsTracker = importsTracker;
    this._memberNames = memberNames;
    this._attributeTranslator = new AttributeTranslator(importsTracker, memberNames);
  }

  public translateSharedTexture(textureElement: Element): void {
    const textureType: string = textureElement.name();
    const name: string = textureElement.attr('name')!.value();
    const objectNames: IObjectNames = getObjectNames(textureType, name);
    const ensureMethodName: string = `_ensure_${name}`;
    const hasEnsureMethod: boolean = this._class.hasMethod(ensureMethodName);
    let initMethod: MethodBuilder;

    if (hasEnsureMethod) {
      initMethod = this._class.getMethod(ensureMethodName)!;
      declareObject(textureType, objectNames, true, this._class);
      initMethod.addToBody(
        `if (this.${objectNames.privateName}) return this.${objectNames.privateName};`
      );
    } else {
      initMethod = this._class.getMethod(this._memberNames.init)!;
      declareObject(textureType, objectNames, false, this._class);
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
    // TODO
  }
}