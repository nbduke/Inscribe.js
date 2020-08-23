import { Attribute } from 'libxmljs';

import { IMemberNames, IImportsTracker } from './DocumentTranslator';

const expressionRegex: RegExp = /^\{(.+)\}$/;
const bindingKeyRegex: RegExp = /^this(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/;
const objectParsers: { type: string, regex: RegExp }[] = [
  { type: 'Color3', regex: /^(((0?\.\d+|0|1),(0?\.\d+|0|1),(0?\.\d+|0|1))|#[0-9a-fA-F]{6})$/ },
  { type: 'Color4', regex: /^(((0?\.\d+|0|1),(0?\.\d+|0|1),(0?\.\d+|0|1),(0?\.\d+|0|1))|#[0-9a-fA-F]{8})$/ },
  { type: 'Vector3', regex: /^((\-?((([1-9]\d*\.?|0?\.)\d+)|\d)),(\-?((([1-9]\d*\.?|0?\.)\d+)|\d)),(\-?((([1-9]\d*\.?|0?\.)\d+)|\d)))$/ }
];

export interface IAttributeInfo {
  name: string;
  value: string;
  propertySetter: string;
  addBinding?: string;
}

export interface ITranslationOptions {
  isEvent?: boolean;
  isObservable?: boolean;
  doNotParsePrimitives?: boolean;
  doNotBind?: boolean;
  useQuotesIfNeeded?: boolean;
  updateMethod?: string;
  propertyPathOverride?: string;
}

export default class AttributeTranslator {
  private readonly _importsTracker: IImportsTracker;
  private readonly _memberNames: IMemberNames;

  constructor(importsTracker: IImportsTracker, memberNames: IMemberNames) {
    this._importsTracker = importsTracker;
    this._memberNames = memberNames;
  }

  public translate(attribute: Attribute, privateName: string, options?: ITranslationOptions): IAttributeInfo {
    const name: string = attribute.name();
    let value: string = attribute.value().trim();

    const expression: string | undefined = this._tryExtractExpression(value);
    if (expression) {
      return this._handleExpression(name, expression, privateName, options);
    } else if (!options?.doNotParsePrimitives) {
      const parsedObject: string | undefined = this._tryParseObject(value);
      if (parsedObject) {
        return {
          name,
          value: parsedObject,
          propertySetter: `this.${options?.propertyPathOverride ?? privateName}.${name} = ${parsedObject};`
        };
      }
    }

    // Enclose the value in quotes if the content is non-numeric
    if (options?.useQuotesIfNeeded && /\D/.test(value)) {
      value = `'${value}'`;
    }

    const propertyPath: string = `this.${options?.propertyPathOverride ?? privateName}`;
    const propertySetter: string = options?.updateMethod
      ? `${propertyPath}.${options.updateMethod}(${value});`
      : `${propertyPath}.${name} = ${value};`;

    return {
      name,
      value,
      propertySetter
    };
  }

  public extractExpression(attribute: Attribute, useQuotesIfNeeded?: boolean): string {
    const value: string = attribute.value().trim();
    return this._tryExtractExpression(value) ?? (useQuotesIfNeeded ? `'${value}'` : value);
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

    return type === 'string' ? `'${value}'` : value;
  }

  private _tryExtractExpression(value: string): string | undefined {
    const expressionMatch: RegExpMatchArray | null = value.match(expressionRegex);
    if (expressionMatch) {
      return this._cleanExpression(expressionMatch[1]);
    }
  }

  private _cleanExpression(expression: string): string {
    return expression.trim().replace('this.', `this.${this._memberNames.host}.`);
  }

  private _handleExpression(
    attributeName: string,
    expression: string,
    privateName: string,
    options?: ITranslationOptions
  ): IAttributeInfo {
    const propertyPath: string = `this.${options?.propertyPathOverride ?? privateName}`;
    let propertySetter: string;
    let addBinding: string | undefined = undefined;

    if (options?.isEvent) {
      propertySetter = `${propertyPath}.${attributeName}.subscribe(${expression});`;
    } else if (options?.isObservable) {
      propertySetter = `${propertyPath}.${attributeName}Observable.add(${expression});`;
    } else if (options?.updateMethod) {
      const propertySetterTemplate: string = `${propertyPath}.${options.updateMethod}(@value);`;
      propertySetter = propertySetterTemplate.replace('@value', expression);
      addBinding = !options?.doNotBind ? this._getAddBinding(expression, propertySetterTemplate) : undefined;
    } else {
      const propertySetterTemplate: string = `${propertyPath}.${attributeName} = @value;`;
      propertySetter = propertySetterTemplate.replace('@value', expression);
      addBinding = !options?.doNotBind ? this._getAddBinding(expression, propertySetterTemplate) : undefined;
    }

    return {
      name: attributeName,
      value: expression,
      propertySetter,
      addBinding
    };
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
    if (type.startsWith('Color') && value.startsWith('#')) {
      return `${type}.FromHexString('${value}')`;
    } else {
      return `new ${type}(${value})`;
    }
  }
}