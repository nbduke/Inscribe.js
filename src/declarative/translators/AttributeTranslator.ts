import { Attribute } from 'libxmljs';

import { IMemberNames, IImportsTracker } from './DocumentTranslator';

const expressionRegex: RegExp = /^\{(.+)\}$/;
const bindingKeyRegex: RegExp = /^this(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/;
const objectParsers: { type: string, regex: RegExp }[] = [
  { type: 'Color3', regex: /^(((0?\.\d+|0|1),(0?\.\d+|0|1),(0?\.\d+|0|1))|'#[0-9a-fA-F]{6}')$/ },
  { type: 'Color4', regex: /^(((0?\.\d+|0|1),(0?\.\d+|0|1),(0?\.\d+|0|1),(0?\.\d+|0|1))|'#[0-9a-fA-F]{8}')$/ },
  { type: 'Vector3', regex: /^((\-?((([1-9]\d*\.?|0?\.)\d+)|\d)),(\-?((([1-9]\d*\.?|0?\.)\d+)|\d)),(\-?((([1-9]\d*\.?|0?\.)\d+)|\d)))$/ }
];
const modelLoaderEvents: Set<string> = new Set([
  'loaded', 'loading', 'loadFailed', 'progress'
]);
const updatableTextureObservables: Set<string> = new Set([
  'onLoad', 'onLoading', 'onError'
]);

export interface IAttributeInfo {
  name: string;
  value: string;
  propertySetter: string;
  addBinding?: string;
}

export default class AttributeTranslator {
  private readonly _importsTracker: IImportsTracker;
  private readonly _memberNames: IMemberNames;

  constructor(importsTracker: IImportsTracker, memberNames: IMemberNames) {
    this._importsTracker = importsTracker;
    this._memberNames = memberNames;
  }

  public translate(attribute: Attribute, objectType: string, privateName: string): IAttributeInfo {
    const name: string = attribute.name();
    const value: string = attribute.value().trim();

    const expression: string | undefined = this._tryExtractExpression(value);
    if (expression) {
      return this._handleExpression(name, expression, objectType, privateName);
    } else if (objectType !== 'Custom') {
      const parsedObject: string | undefined = this._tryParseObject(value);
      if (parsedObject) {
        return {
          name,
          value: parsedObject,
          propertySetter: `this.${privateName}.${name} = ${parsedObject};`
        };
      }
    }

    return {
      name,
      value: value,
      propertySetter: `this.${privateName}.${name} = ${value};`
    };
  }

  public extractExpression(attribute: Attribute): string {
    const value: string = attribute.value().trim();
    return this._tryExtractExpression(value) ?? value;
  }

  public extractExpressionFromTypeAndValue(type: string, value: string): string {
    type = type.trim();
    value = value.trim();
    const expression: string | undefined = this._tryExtractExpression(value);
    if (expression) {
      return expression;
    }

    for (const parser of objectParsers) {
      if (parser.type === type && parser.regex.test(value)) {
        return this._parseObject(type, value);
      }
    }

    return value;
  }

  private _tryExtractExpression(value: string): string | undefined {
    const expressionMatch: RegExpMatchArray | null = value.match(expressionRegex);
    if (expressionMatch) {
      return this._cleanExpression(expressionMatch[1]);
    }
  }

  private _handleExpression(
    attributeName: string,
    expression: string,
    objectType: string,
    privateName: string
  ): IAttributeInfo {
    if (objectType === 'ModelLoader' && modelLoaderEvents.has(attributeName)) {
      return {
        name: attributeName,
        value: expression,
        propertySetter: `this.${privateName}.${attributeName}.subscribe(${expression});`
      };
    } else if (objectType === 'UpdatableTexture') {
      if (attributeName === 'url') {
        const propertySetterTemplate: string = `this.${privateName}.updateURL(@value);`;
        return {
          name: attributeName,
          value: expression,
          propertySetter: propertySetterTemplate.replace('@value', expression),
          addBinding: this._getAddBinding(expression, propertySetterTemplate)
        }
      } else if (attributeName === 'samplingMode') {
        const propertySetterTemplate: string = `this.${privateName}.updateSamplingMode(@value);`;
        return {
          name: attributeName,
          value: expression,
          propertySetter: propertySetterTemplate.replace('@value', expression),
          addBinding: this._getAddBinding(expression, propertySetterTemplate)
        };
      } else if (updatableTextureObservables.has(attributeName)) {
        return {
          name: attributeName,
          value: expression,
          propertySetter: `this.${privateName}.${attributeName}Observable.add(${expression});`
        };
      }
    } else if (objectType !== 'Custom' && attributeName === 'enabled') {
      const propertySetterTemplate: string = `this.${privateName}.setEnabled(@value);`;
      return {
        name: attributeName,
        value: expression,
        propertySetter: propertySetterTemplate.replace('@value', expression),
        addBinding: this._getAddBinding(expression, propertySetterTemplate)
      };
    }

    // The default way to assign a generic property
    const propertySetterTemplate: string = `this.${privateName}.${attributeName} = @value;`;
    return {
      name: attributeName,
      value: expression,
      propertySetter: propertySetterTemplate.replace('@value', expression),
      addBinding: this._getAddBinding(expression, propertySetterTemplate)
    };
  }

  private _cleanExpression(expression: string): string {
    return expression.trim().replace('this.', `this.${this._memberNames.host}.`);
  }

  private _getAddBinding(expression: string, propertySetterTemplate: string): string | undefined {
    return bindingKeyRegex.test(expression)
      ? `this.${this._memberNames.addBinding}('${expression}', (value) => { ${propertySetterTemplate.replace('@value', 'value')} });`
      : undefined;
  }

  private _tryParseObject(value: string): string | undefined {
    for (const parser of objectParsers) {
      if (parser.regex.test(value)) {
        return this._parseObject(parser.type, value);
      }
    }
  }

  private _parseObject(type: string, value: string): string {
    this._importsTracker.babylon.add(type);
    if (type.startsWith('Color') && value.startsWith('\'#')) {
      return `${type}.FromHexString(${value})`;
    } else {
      return `new ${type}(${value})`;
    }
  }
}