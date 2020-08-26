import { Attribute } from 'libxmljs';

import AttributeTranslator, { IAttributeInfo } from './AttributeTranslator';
import { IMemberNames, IImportsTracker } from './DocumentTranslator';
import { IObjectNames } from './ObjectNames';

describe('AttributeTranslator', () => {
  const importsTracker: IImportsTracker = {
    babylonCore: new Set(),
    babylonGui: new Set(),
    inscribe: new Set(),
    lodash: new Set()
  };
  const memberNames: IMemberNames = {
    root: 'rooooot',
    host: 'HOST',
    init: 'initialize',
    scene: 'sc3n3',
    propertyChanged: 'propchgd',
    bindingEngine: 'be',
    addBinding: 'be.addBinding'
  };
  const objectName: string = 'x_foo';

  const createUnit: () => AttributeTranslator = () => {
    return new AttributeTranslator(importsTracker, memberNames);
  };
  const createAttribute: (name: string, value: string) => Attribute = (name, value) => {
    return {
      name: () => name,
      value: () => value
    } as Attribute;
  };

  describe('translate', () => {
    it('can handle primitive values', () => {
      const attribute: Attribute = createAttribute('primitiveBoolean', 'true');
      const info: IAttributeInfo = createUnit().translate(attribute, objectName);

      const expectedPropSetter: string = `this.${objectName}!.primitiveBoolean = true;`;
      expect(info).toEqual({
        name: 'primitiveBoolean',
        value: 'true',
        propertySetter: expectedPropSetter,
        addBinding: undefined
      });
    });

    it('can parse Vector3 primitive', () => {
      const attribute: Attribute = createAttribute('position', '0.4,10,-3');
      const info: IAttributeInfo = createUnit().translate(attribute, objectName);

      const expectedValue: string = `new Vector3(0.4,10,-3)`;
      const expectedPropSetter: string = `this.${objectName}!.position = ${expectedValue};`;
      expect(info).toEqual({
        name: 'position',
        value: expectedValue,
        propertySetter: expectedPropSetter,
        addBinding: undefined
      });
    });

    it('can parse Color3 primitive', () => {
      const attribute: Attribute = createAttribute('background', '0.4,0.0125,0.85');
      const info: IAttributeInfo = createUnit().translate(attribute, objectName);

      const expectedValue: string = `new Color3(0.4,0.0125,0.85)`;
      const expectedPropSetter: string = `this.${objectName}!.background = ${expectedValue};`;
      expect(info).toEqual({
        name: 'background',
        value: expectedValue,
        propertySetter: expectedPropSetter,
        addBinding: undefined
      });
    });

    it('can parse Color3 hex value primitive', () => {
      const attribute: Attribute = createAttribute('background', '#AF103D');
      const info: IAttributeInfo = createUnit().translate(attribute, objectName);

      const expectedValue: string = `Color3.FromHexString('#AF103D')`;
      const expectedPropSetter: string = `this.${objectName}!.background = ${expectedValue};`;
      expect(info).toEqual({
        name: 'background',
        value: expectedValue,
        propertySetter: expectedPropSetter,
        addBinding: undefined
      });
    });

    it('can parse Color4 primitive', () => {
      const attribute: Attribute = createAttribute('borderColor', '0,0.0125,0.85,1');
      const info: IAttributeInfo = createUnit().translate(attribute, objectName);

      const expectedValue: string = `new Color4(0,0.0125,0.85,1)`;
      const expectedPropSetter: string = `this.${objectName}!.borderColor = ${expectedValue};`;
      expect(info).toEqual({
        name: 'borderColor',
        value: expectedValue,
        propertySetter: expectedPropSetter,
        addBinding: undefined
      });
    });

    it('can parse Color4 hex value primitive', () => {
      const attribute: Attribute = createAttribute('borderColor', '#32AD80FF');
      const info: IAttributeInfo = createUnit().translate(attribute, objectName);

      const expectedValue: string = `Color4.FromHexString('#32AD80FF')`;
      const expectedPropSetter: string = `this.${objectName}!.borderColor = ${expectedValue};`;
      expect(info).toEqual({
        name: 'borderColor',
        value: expectedValue,
        propertySetter: expectedPropSetter,
        addBinding: undefined
      });
    });

    it('adds Babylon import if object is parsed', () => {
      const attribute: Attribute = createAttribute('background', '#AF103D');
      createUnit().translate(attribute, objectName);
      expect(importsTracker.babylonCore).toContain('Color3');
    });

    it('will not parse primitive if doNotParsePrimitives option is set', () => {
      const attribute: Attribute = createAttribute('background', '#32AD80FF');
      const info: IAttributeInfo = createUnit().translate(attribute, objectName, { doNotParsePrimitives: true });

      const expectedPropSetter: string = `this.${objectName}!.background = #32AD80FF;`;
      expect(info).toEqual({
        name: 'background',
        value: '#32AD80FF',
        propertySetter: expectedPropSetter,
        addBinding: undefined
      });
    });

    it('surrounds value in quotes if useQuotesIfNeeded option is set and value is not expression and non-numeric', () => {
      const attribute: Attribute = createAttribute('height', '100px');
      const info: IAttributeInfo = createUnit().translate(attribute, objectName, { useQuotesIfNeeded: true });

      const expectedValue: string = `'100px'`;
      const expectedPropSetter: string = `this.${objectName}!.height = ${expectedValue};`;
      expect(info).toEqual({
        name: 'height',
        value: expectedValue,
        propertySetter: expectedPropSetter,
        addBinding: undefined
      });
    });

    it('can call custom update method', () => {
      const attribute: Attribute = createAttribute('enabled', 'false');
      const info: IAttributeInfo = createUnit().translate(attribute, objectName, { updateMethod: 'setEnabled' });

      const expectedPropSetter: string = `this.${objectName}!.setEnabled(false);`;
      expect(info).toEqual({
        name: 'enabled',
        value: 'false',
        propertySetter: expectedPropSetter,
        addBinding: undefined
      });
    });

    it('can extract expression that calls custom update method', () => {
      const attribute: Attribute = createAttribute('enabled', '{Constants.SHOULD_ENABLE}');
      const info: IAttributeInfo = createUnit().translate(attribute, objectName, { updateMethod: 'enableIt' });

      const expectedValue: string = 'Constants.SHOULD_ENABLE';
      const expectedPropSetter: string = `this.${objectName}!.enableIt(${expectedValue});`;
      expect(info).toEqual({
        name: 'enabled',
        value: expectedValue,
        propertySetter: expectedPropSetter,
        addBinding: undefined
      });
    });

    it('can extract binding function that calls custom update method', () => {
      const attribute: Attribute = createAttribute('isOpen', '{this.viewModel.isShown}');
      const info: IAttributeInfo = createUnit().translate(attribute, objectName, { updateMethod: 'setIsOpen' });

      const expectedValue: string = `this.${memberNames.host}.viewModel.isShown`;
      const expectedPropSetter: string = `this.${objectName}!.setIsOpen(${expectedValue});`;
      const expectedAddBinding: string = `this.${memberNames.addBinding}('${expectedValue}', (value) => { this.${objectName}!.setIsOpen(value); });`;
      expect(info).toEqual({
        name: 'isOpen',
        value: expectedValue,
        propertySetter: expectedPropSetter,
        addBinding: expectedAddBinding
      });
    });

    it('can subscribe an expression to an event', () => {
      const attribute: Attribute = createAttribute('loadFailed', '{ this._onLoadFailed }');
      const info: IAttributeInfo = createUnit().translate(attribute, objectName, { isEvent: true });

      const expectedValue: string = `this.${memberNames.host}._onLoadFailed`;
      const expectedPropSetter: string = `this.${objectName}!.loadFailed.subscribe(${expectedValue});`;
      expect(info).toEqual({
        name: 'loadFailed',
        value: expectedValue,
        propertySetter: expectedPropSetter,
        addBinding: undefined
      });
    });

    it('can add an expression to an observable', () => {
      const attribute: Attribute = createAttribute('onImageLoaded', '{ () => this._display() }');
      const info: IAttributeInfo = createUnit().translate(attribute, objectName, { isObservable: true });

      const expectedValue: string = `() => this.${memberNames.host}._display()`;
      const expectedPropSetter: string = `this.${objectName}!.onImageLoadedObservable.add(${expectedValue});`;
      expect(info).toEqual({
        name: 'onImageLoaded',
        value: expectedValue,
        propertySetter: expectedPropSetter,
        addBinding: undefined
      });
    });

    it('can override the property path of the attribute with a custom path', () => {
      const attribute: Attribute = createAttribute('fizz', 'buzz');
      const info: IAttributeInfo = createUnit().translate(attribute, objectName, { propertyPathOverride: 'x_bar.a.b.c' });

      const expectedPropSetter: string = `this.x_bar.a.b.c!.fizz = buzz;`;
      expect(info).toEqual({
        name: 'fizz',
        value: 'buzz',
        propertySetter: expectedPropSetter,
        addBinding: undefined
      });
    });
  });

  it('will not add a binding if doNotBind option is set', () => {
    const attribute: Attribute = createAttribute('alpha', '{ this.viewModel.opacity }');
    const info: IAttributeInfo = createUnit().translate(attribute, objectName, { doNotBind: true });

    const expectedValue: string = `this.${memberNames.host}.viewModel.opacity`;
    const expectedPropSetter: string = `this.${objectName}!.alpha = ${expectedValue};`;
    expect(info).toEqual({
      name: 'alpha',
      value: expectedValue,
      propertySetter: expectedPropSetter,
      addBinding: undefined
    });
  });

  describe('extractExpression', () => {
    it('extracts the value of expressions', () => {
      const attribute: Attribute = createAttribute('url', '{this.viewModel.imageUrl   }');
      const expression: string = createUnit().extractExpression(attribute);
      expect(expression).toBe(`this.${memberNames.host}.viewModel.imageUrl`);
    });

    it('surrounds the value in quotes if not an expression and useQuotesIfNeeded is true', () => {
      const attribute: Attribute = createAttribute('url', 'www.foo.com/image.png');
      const expression: string = createUnit().extractExpression(attribute, true);
      expect(expression).toBe(`'www.foo.com/image.png'`);
    });

    it('returns the raw value if not an expression and useQuotesIfNeeded is false', () => {
      const attribute: Attribute = createAttribute('width', '1003');
      const expression: string = createUnit().extractExpression(attribute);
      expect(expression).toBe('1003');
    });
  });

  describe('extractExpressionFromValueAndType', () => {
    it('extracts the value of expressions', () => {
      const expression: string = createUnit().extractExpressionFromTypeAndValue('number', '{ this.visibility }');
      expect(expression).toBe(`this.${memberNames.host}.visibility`);
    });

    it('can parse a primitive object if the type matches', () => {
      const expression: string = createUnit().extractExpressionFromTypeAndValue('Vector3', '-1,0,-2.4');
      expect(expression).toBe('new Vector3(-1,0,-2.4)');
    });

    it('adds Babylon import if object is parsed', () => {
      createUnit().extractExpressionFromTypeAndValue('Color4', '0,0.23,0.59,1');
      expect(importsTracker.babylonCore).toContain('Color4');
    });

    it('surrounds the value in quotes if not an expression and type is string', () => {
      const expression: string = createUnit().extractExpressionFromTypeAndValue('string', 'Jack & Jill');
      expect(expression).toBe(`'Jack & Jill'`);
    });

    it('returns the raw value if not an expression and type is not string', () => {
      const expression: string = createUnit().extractExpressionFromTypeAndValue('Vec', '0.3,1,0.93');
      expect(expression).toBe('0.3,1,0.93');
    });
  });
});