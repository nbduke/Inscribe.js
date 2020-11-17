import { Element } from 'libxmljs';

import ClassBuilder from '../builders/ClassBuilder';
import { IMemberNames, IImportsTracker } from './DocumentTranslator';
import PropertyBuilder from '../builders/PropertyBuilder';
import { IObjectNames, getObjectNames } from './ObjectNames';
import AttributeTranslator from './AttributeTranslator';

export default class PropertyTranslator {
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

  public translate(propertiesSection: Element): void {
    propertiesSection.childNodes().forEach(propertyElement => {
      const name: string = propertyElement.attr('name')!.value();
      const type: string = propertyElement.attr('type')!.value();
      const defaultValue: string | undefined = propertyElement.attr('default')?.value();
      const objectNames: IObjectNames = getObjectNames(type, name);

      this._class.addMemberVariable(objectNames.privateName, type, 'private', undefined, '!');
      if (defaultValue) {
        const expression: string = this._attributeTranslator.extractExpressionFromTypeAndValue(type, defaultValue);
        this._class.getMethod(this._memberNames.init)!.addToBody(
          `this.${objectNames.privateName} = ${expression};`
        );
      }

      const propertyBuilder: PropertyBuilder = new PropertyBuilder(objectNames.publicName, type, 'public');
      propertyBuilder.addToGetterBody(
        `return this.${objectNames.privateName};`
      );
      propertyBuilder.addToSetterBody(
        `if (!isEqual(this.${objectNames.privateName}, value)) {`,
        `  this.${objectNames.privateName} = value;`,
        `  ${this._memberNames.thisAttr}.${this._memberNames.propertyChanged}.raise({ propertyName: '${objectNames.publicName}', value });`,
        `}`
      );
      this._class.addProperty(propertyBuilder);
      this._importsTracker.lodash.add('isEqual');
    });
  }
}