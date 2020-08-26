import { Element } from 'libxmljs';

import ClassBuilder from '../builders/ClassBuilder';
import MethodBuilder from '../builders/MethodBuilder';
import { IMemberNames, IImportsTracker, IReferenceableObjects } from './DocumentTranslator';
import { IObjectNames, getObjectNames, declareObject } from './ObjectNames';
import AttributeTranslator from './AttributeTranslator';
import TextureTranslator, { IMaterialInfo } from './TextureTranslator';

const textureSlots: Map<string, Set<string>> = new Map([
  ['StandardMaterial', new Set([
    'ambientTexture',
    'bumpTexture',
    'cameraColorGradingTexture',
    'diffuseTexture',
    'emissiveTexture',
    'lightmapTexture',
    'opacityTexture',
    'reflectionTexture',
    'refractionTexture',
    'specularTexture'
  ])]
]);

export default class MaterialTranslator {
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

  public translateSharedMaterial(materialElement: Element): void {
    const materialType: string = materialElement.name();
    const name: string = materialElement.attr('name')!.value();
    const objectNames: IObjectNames = getObjectNames(materialType, name);
    const initMethod: MethodBuilder = this._referenceableObjects.materials.get(name)!;
    const hasEnsureMethod: boolean = initMethod.name !== this._memberNames.init;

    declareObject(materialType, objectNames, hasEnsureMethod, this._class);

    if (hasEnsureMethod) {
      initMethod.addToBody(
        `if (this.${objectNames.privateName}) return this.${objectNames.privateName};`
      );
    }

    this._translateMaterial(materialElement, objectNames, initMethod);

    if (hasEnsureMethod) {
      initMethod.addToBody(`return this.${objectNames.privateName};`);
    }
  }

  public translateNodeMaterial(materialElement: Element, nodeName: string, initMethod: MethodBuilder): void {
    const materialType: string = materialElement.name();
    const name: string | undefined = materialElement.attr('name')?.value();
    const objectNames: IObjectNames = getObjectNames(materialType, name);
    declareObject(materialType, objectNames, initMethod.name !== this._memberNames.init, this._class);
    this._translateMaterial(materialElement, objectNames, initMethod, nodeName);
  }

  private _translateMaterial(
    materialElement: Element,
    objectNames: IObjectNames,
    initMethod: MethodBuilder,
    nodeName?: string
  ): void {
    const materialType: string = materialElement.name();
    this._importsTracker.babylon.add(materialType);
    initMethod.addToBody(
      `this.${objectNames.privateName} = new ${materialType}('${objectNames.publicName}', this.${this._memberNames.scene});`
    );
    if (nodeName) {
      initMethod.addToBody(`this.${nodeName}.material = this.${objectNames.privateName};`);
    }

    const materialTextureSlots: Set<string> = textureSlots.get(materialType)!;
    materialElement.attrs()
      .filter(a => a.name() !== 'name')
      .map(a => this._attributeTranslator.translate(a, objectNames.privateName))
      .forEach(info => {
        if (materialTextureSlots.has(info.name)) {
          this._handleTextureAttribute(info.value, {
            name: objectNames.privateName,
            textureSlot: info.name,
            initMethod
          });
        } else {
          initMethod.addToBody(info.propertySetter);
          if (info.addBinding) {
            initMethod.addToBody(info.addBinding);
          }
        }
      });

    materialElement.childNodes().forEach(textureSlotElement => {
      this._translateTexture(textureSlotElement, objectNames.privateName, initMethod);
    });
  }

  private  _handleTextureAttribute(textureName: string, materialInfo: IMaterialInfo): void {
    if (!this._referenceableObjects.textures.has(textureName)) {
      throw new Error(`Texture reference not found: ${textureName}`);
    }
    const ensureMethodName: string = `_ensure_${textureName}`;
    const ensureMethod: MethodBuilder = new MethodBuilder(ensureMethodName, 'Texture', 'private');
    this._class.addMethod(ensureMethod);
    this._referenceableObjects.textures.set(textureName, ensureMethod); // replace init method with ensure method
    this._importsTracker.babylon.add('Texture');
    materialInfo.initMethod.addToBody(
      `this.${materialInfo.name}.${materialInfo.textureSlot} = this.${ensureMethodName}();`
    );
  }

  private _translateTexture(
    textureSlotElement: Element,
    materialName: string,
    materialInitMethod: MethodBuilder
  ): void {
    let textureSlot: string = textureSlotElement.name();
    textureSlot = textureSlot[0].toLowerCase() + textureSlot.slice(1);
    if ((textureSlotElement.parent() as Element).attr(textureSlot)) {
      throw new Error(`Conflicting texture assignments on material ${materialName.slice(2)}.${textureSlot}.`);
    }

    const textureTranslator: TextureTranslator = new TextureTranslator(
      this._class,
      this._importsTracker,
      this._referenceableObjects,
      this._memberNames
    );
    textureTranslator.translateMaterialTexture(
      textureSlotElement.child(0)!,
      { name: materialName, textureSlot, initMethod: materialInitMethod }
    );
  }
}