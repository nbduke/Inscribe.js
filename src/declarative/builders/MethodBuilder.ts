import { MemberVisibility, lineDelim } from './ClassBuilder';

export interface IMethodArgument {
  name: string;
  type: string;
  optional?: boolean;
}

const format: string =
`
  @visibility @name(@args): @returnType {
    @body
  }`;
const arrowFormat: string =
`
  @visibility @name = (@args): @returnType => {
    @body
  }`;

/**
 * Builds a class method.
 */
export default class MethodBuilder {
  public name: string;
  public returnType: string;
  public visibility: MemberVisibility;
  public readonly args: IMethodArgument[];
  public isStatic: boolean = false;

  /**
   * If true (default is false), the method will use arrow function syntax.
   */
  public isArrowFunction: boolean = false;

  private _bodyLines: string[] = [];

  public static stringifyArgument(arg: IMethodArgument): string {
    return `${arg.name}${arg.optional ? '?' : ''}: ${arg.type}`;
  }

  constructor(
    name: string,
    returnType: string,
    visibility: MemberVisibility,
    ...args: IMethodArgument[]
  ) {
    this.name = name;
    this.returnType = returnType;
    this.visibility = visibility;
    this.args = args;
  }

  /**
   * Adds one or more lines of code to the method body.
   * @param lines - the lines
   */
  public addToBody(...lines: string[]): void {
    this._bodyLines.push(...lines);
  }

  public toString(): string {
    return (this.isArrowFunction ? arrowFormat : format)
      .replace('@visibility', this.visibility + (this.isStatic ? ' static' : ''))
      .replace('@name', this.name)
      .replace('@args', this.args.map(a => MethodBuilder.stringifyArgument(a)).join(', '))
      .replace('@returnType', this.returnType)
      .replace('@body', this._bodyLines.join(lineDelim + '    '));
  }
}