import { MemberVisibility, lineDelim } from './ClassBuilder';

const getterFormat: string =
`
  @visibility get @name(): @type {
    @body
  }
`;
const setterFormat: string =
`@visibility set @name(@argName: @type) {
    @body
  }`;

  /**
   * Builds a class property (getter and optional setter).
   */
export default class PropertyBuilder {
  public name: string;
  public type: string;
  public visibility: MemberVisibility;
  public setterArgumentName: string = 'value';

  private _getterLines: string[] = [];
  private _setterLines: string[] = [];

  constructor(name: string, type: string, visibility: MemberVisibility) {
    this.name = name;
    this.type = type;
    this.visibility = visibility;
  }

  /**
   * Adds one or more lines of code to the body of the property getter.
   * @param lines - the lines
   */
  public addToGetterBody(...lines: string[]): void {
    this._getterLines.push(...lines);
  }

  /**
   * Adds one or more lines of code to the body of the property setter. If no lines are present, a setter
   * will not be generated.
   * @param lines - the lines
   */
  public addToSetterBody(...lines: string[]): void {
    this._setterLines.push(...lines);
  }

  public toString(): string {
    const getter: string = getterFormat
      .replace('@visibility', this.visibility)
      .replace('@name', this.name)
      .replace('@type', this.type)
      .replace('@body', this._getterLines.join(lineDelim + '    '));
    if (this._setterLines.length > 0) {
      const setter: string = setterFormat
        .replace('@visibility', this.visibility)
        .replace('@name', this.name)
        .replace('@type', this.type)
        .replace('@argName', this.setterArgumentName)
        .replace('@body', this._setterLines.join(lineDelim + '    '));
      return getter + lineDelim + '  ' + setter;
    } else {
      return getter;
    }
  }
}