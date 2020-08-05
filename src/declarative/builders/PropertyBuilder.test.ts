import PropertyBuilder from './PropertyBuilder';

describe('PropertyBuilder', () => {
  it('can produce a property with only a getter', () => {
    const builder: PropertyBuilder = new PropertyBuilder('node', 'Node', 'public');
    builder.addToGetterBody('return this._node;');
    const str: string = builder.toString();
    expect(str).toMatch(/public get node\(\): Node \{\s*return this\._node;\s*\}/);
  });

  it('can produce a property with both getter and setter', () => {
    const builder: PropertyBuilder = new PropertyBuilder('id', 'string', 'protected');
    builder.addToGetterBody('return this._id;');
    builder.addToSetterBody('this._id = value;');
    const str: string = builder.toString();
    expect(str).toMatch(
      /protected get id\(\): string \{\s*return this\._id;\s*\}\s*protected set id\(value: string\) \{\s*this\._id = value;\s*\}/
    );
  });

  it('has a configurable setter argument name', () => {
    const builder: PropertyBuilder = new PropertyBuilder('id', 'string', 'protected');
    builder.addToGetterBody('return this._id;');
    builder.addToSetterBody('this._id = t;');
    builder.setterArgumentName = 't';
    const str: string = builder.toString();
    expect(str).toMatch(
      /protected get id\(\): string \{\s*return this\._id;\s*\}\s*protected set id\(t: string\) \{\s*this\._id = t;\s*\}/
    );
  });
});