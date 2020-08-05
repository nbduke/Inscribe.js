import MethodBuilder from './MethodBuilder';

describe('MethodBuilder', () => {
  it('can produce a method with no arguments', () => {
    const builder: MethodBuilder = new MethodBuilder('doStuff', 'void', 'public');
    const str: string = builder.toString();
    expect(str).toMatch(/public doStuff\(\): void \{\s*\}/);
  });

  it('can produce a method with varied arguments', () => {
    const builder: MethodBuilder = new MethodBuilder('setValues', 'boolean', 'protected',
      { name: 'x', type: 'number' },
      { name: 'y', type: 'number' },
      { name: 'z', type: 'number', optional: true }
    );
    const str: string = builder.toString();
    expect(str).toMatch(/protected setValues\(x: number, y: number, z\?: number\): boolean \{\s*\}/);
  });

  it('can produce a method with multiple lines', () => {
    const builder: MethodBuilder = new MethodBuilder('_add', 'number', 'private');
    builder.addToBody(
      'this._reset();',
      'this._x = -1;',
      'return this._y;'
    );
    const str: string = builder.toString();
    expect(str).toMatch(/private _add\(\): number \{\s*this\._reset\(\);\s*this\._x = -1;\s*return this\._y;\s*\}/);
  });

  it('can produce a static method', () => {
    const builder: MethodBuilder = new MethodBuilder('create', 'Foo', 'public');
    builder.isStatic = true;
    builder.addToBody('return new Foo();');
    const str: string = builder.toString();
    expect(str).toMatch(/public static create\(\): Foo \{\s*return new Foo\(\);\s*\}/);
  });

  it('can produce a method in arrow format', () => {
    const builder: MethodBuilder = new MethodBuilder('_onClick', 'void', 'private',
      { name: 'event', type: 'FormEvent' }
    );
    builder.isArrowFunction = true;
    const str: string = builder.toString();
    expect(str).toMatch(/private _onClick = \(event: FormEvent\): void => \{\s*\}/);
  });
});