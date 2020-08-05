import MethodBuilder, { IMethodArgument } from './MethodBuilder';
import PropertyBuilder from './PropertyBuilder';

export type ClassVisibility =
  'private' |
  'export' |
  'export default';

export type MemberVisibility =
  'public' |
  'protected' |
  'private';

export const lineDelim: string = '\r\n';

interface IMemberVariable {
  name: string;
  type: string;
  visibility: MemberVisibility;
  modifier?: '?' | '!';
  defaultValue?: string;
}

const format: string =
`@visibility class @className @baseClass @interfaces {
  @publicMemberVariables
  @protectedMemberVariables
  @privateMemberVariables
  @constructor
  @publicProperties
  @publicMethods
  @protectedProperties
  @protectedMethods
  @privateProperties
  @privateMethods
}`;

const constructorFormat: string =
`
  constructor(@args) {
    @body
  }`;

/**
 * Builds a TypeScript class.
 */
export default class ClassBuilder {
  public className: string;
  public visibility: ClassVisibility;
  public baseClass: string = '';

  private _interfaces: string[] = [];
  private _constructorArgs: IMethodArgument[] = [];
  private _constructorLines: string[] = [];
  private _memberVariables: IMemberVariable[] = [];
  private _properties: PropertyBuilder[] = [];
  private _methods: MethodBuilder[] = [];

  constructor(name: string, visibility: ClassVisibility) {
    this.className = name;
    this.visibility = visibility;
  }

  /**
   * Adds an interface to the `implements` list on the class.
   * @param name - the interface name
   */
  public addInterface(name: string): void {
    this._interfaces.push(name);
  }

  /**
   * Sets the args of the constructor.
   * @param args - the args
   */
  public setConstructorArgs(...args: IMethodArgument[]): void {
    this._constructorArgs = args;
  }

  /**
   * Adds one or more lines of code to the body of the constructor. If no lines are present, a constructor will not
   * be generated.
   * @param lines - the lines
   */
  public addToConstructorBody(...lines: string[]): void {
    this._constructorLines.push(...lines);
  }

  /**
   * Adds a member variable to the class.
   * @param name - the variable name
   * @param type - the variable type
   * @param visibility - the variable visibility
   * @param defaultValue - (optional) a default value assigned in the declaration
   * @param modifier - (optional) type modifiers for TypeScript
   */
  public addMemberVariable(
    name: string,
    type: string,
    visibility: MemberVisibility,
    defaultValue?: string,
    modifier?: '?' | '!'
  ): void {
    this._memberVariables.push({
      name,
      type,
      visibility,
      defaultValue,
      modifier
    });
  }

  /**
   * Adds a property to the class.
   * @param property - the property
   */
  public addProperty(property: PropertyBuilder): void {
    this._properties.push(property);
  }

  /**
   * Adds a method to the class.
   * @param method - the method
   */
  public addMethod(method: MethodBuilder): void {
    this._methods.push(method);
  }

  public toString(): string {
    return format
      .replace('@visibility', this.visibility === 'private' ? '' : this.visibility)
      .replace('@className', this.className)
      .replace('@baseClass', this.baseClass ? `extends ${this.baseClass}` : '')
      .replace('@interfaces', this._interfaces.length > 0 ? `implements ${this._interfaces.join(', ')}` : '')
      .replace('@publicMemberVariables', this._stringifyMemberVariablesBy('public'))
      .replace('@protectedMemberVariables', this._stringifyMemberVariablesBy('protected'))
      .replace('@privateMemberVariables', this._stringifyMemberVariablesBy('private'))
      .replace('@constructor', this._getConstructor())
      .replace('@publicProperties', this._stringifyPropertiesBy('public'))
      .replace('@publicMethods', this._stringifyMethodsBy('public'))
      .replace('@protectedProperties', this._stringifyPropertiesBy('protected'))
      .replace('@protectedMethods', this._stringifyMethodsBy('protected'))
      .replace('@privateProperties', this._stringifyPropertiesBy('private'))
      .replace('@privateMethods', this._stringifyMethodsBy('private'));
  }

  private _stringifyMemberVariablesBy(visibility: MemberVisibility): string {
    return this._memberVariables.filter(v => v.visibility === visibility).map(v => {
      let vString: string = `${v.visibility} ${v.name}${v.modifier ?? ''}: ${v.type}`;
      if (v.defaultValue !== undefined) {
        vString += ` = ${v.defaultValue}`
      }
      return vString + ';';
    }).join(this._getLineDelim());
  }

  private _getConstructor(): string {
    if (this._constructorLines.length > 0) {
      const args: string = this._constructorArgs.map(a => MethodBuilder.stringifyArgument(a)).join(', ');
      const body: string = this._constructorLines.join(this._getLineDelim(2));
      return constructorFormat.replace('@args', args).replace('@body', body);
    } else {
      return '';
    }
  }

  private _stringifyPropertiesBy(visibility: MemberVisibility): string {
    return this._properties.filter(p => p.visibility === visibility).map(p => p.toString()).join(this._getLineDelim());
  }

  private _stringifyMethodsBy(visibility: MemberVisibility): string {
    return this._methods.filter(m => m.visibility === visibility).map(m => m.toString()).join(this._getLineDelim());
  }

  private _getLineDelim(indentation: number = 1): string {
    return lineDelim + '  '.repeat(indentation);
  }
}