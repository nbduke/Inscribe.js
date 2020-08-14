import { Attribute } from 'libxmljs';

import AttributeTranslator, { IAttributeInfo } from './AttributeTranslator';
import { IMemberNames, IImportsTracker } from './DocumentTranslator';
import { IObjectNames } from './ObjectNames';

describe('AttributeTranslator', () => {
  const importsTracker: IImportsTracker = {
    babylon: new Set(),
    inscribe: new Set()
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
  const objectType: string = 'TransformNode';
  const objectNames: IObjectNames = {
    privateName: 'x_foo',
    publicName: 'foo',
    isNameGenerated: false
  };

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
      const info: IAttributeInfo = createUnit().translate(attribute, objectType, objectNames);

      const expectedPropSetter: string = `this.${objectNames.privateName}.${info.name} = ${info.value};`;
      expect(info).toEqual({
        name: 'primitiveBoolean',
        value: 'true',
        propertySetter: expectedPropSetter,
        addBinding: undefined
      });
    });

    it('can parse Vector3 primitive', () => {
      const attribute: Attribute = createAttribute('position', '0.4,10,-3');
      const info: IAttributeInfo = createUnit().translate(attribute, objectType, objectNames);

      const expectedValue: string = `new Vector3(0.4,10,-3)`;
      const expectedPropSetter: string = `this.${objectNames.privateName}.${info.name} = ${expectedValue};`;
      expect(info).toEqual({
        name: 'position',
        value: expectedValue,
        propertySetter: expectedPropSetter
      });
    });

    it('can parse Color3 primitive', () => {
      const attribute: Attribute = createAttribute('background', '0.4,0.0125,0.85');
      const info: IAttributeInfo = createUnit().translate(attribute, objectType, objectNames);

      const expectedValue: string = `new Color3(0.4,0.0125,0.85)`;
      const expectedPropSetter: string = `this.${objectNames.privateName}.${info.name} = ${expectedValue};`;
      expect(info).toEqual({
        name: 'background',
        value: expectedValue,
        propertySetter: expectedPropSetter
      });
    });

    it('can parse Color3 hex value primitive', () => {
      const attribute: Attribute = createAttribute('background', `'#AF103D'`);
      const info: IAttributeInfo = createUnit().translate(attribute, objectType, objectNames);

      const expectedValue: string = `Color3.FromHexString('#AF103D')`;
      const expectedPropSetter: string = `this.${objectNames.privateName}.${info.name} = ${expectedValue};`;
      expect(info).toEqual({
        name: 'background',
        value: expectedValue,
        propertySetter: expectedPropSetter
      });
    });

    it('can parse Color4 primitive', () => {
      const attribute: Attribute = createAttribute('background', '0,0.0125,0.85,1');
      const info: IAttributeInfo = createUnit().translate(attribute, objectType, objectNames);

      const expectedValue: string = `new Color4(0,0.0125,0.85,1)`;
      const expectedPropSetter: string = `this.${objectNames.privateName}.${info.name} = ${expectedValue};`;
      expect(info).toEqual({
        name: 'background',
        value: expectedValue,
        propertySetter: expectedPropSetter
      });
    });

    it('can parse Color4 hex value primitive', () => {
      const attribute: Attribute = createAttribute('background', `'#32AD80FF'`);
      const info: IAttributeInfo = createUnit().translate(attribute, objectType, objectNames);

      const expectedValue: string = `Color4.FromHexString('#32AD80FF')`;
      const expectedPropSetter: string = `this.${objectNames.privateName}.${info.name} = ${expectedValue};`;
      expect(info).toEqual({
        name: 'background',
        value: expectedValue,
        propertySetter: expectedPropSetter
      });
    });

    it('adds Babylon import if object is parsed', () => {
      const attribute: Attribute = createAttribute('background', `'#AF103D'`);
      createUnit().translate(attribute, objectType, objectNames);
      expect(importsTracker.babylon).toContain('Color3');
    });

    it('can extract expression that calls setEnabled on non-Custom types', () => {
      const attribute: Attribute = createAttribute('enabled', '{Constants.SHOULD_ENABLE}');
      const info: IAttributeInfo = createUnit().translate(attribute, objectType, objectNames);

      const expectedValue: string = 'Constants.SHOULD_ENABLE';
      const expectedPropSetter: string = `this.${objectNames.privateName}.setEnabled(${expectedValue});`;
      expect(info).toEqual({
        name: 'enabled',
        value: expectedValue,
        propertySetter: expectedPropSetter
      });
    });

    it('can extract binding function that calls setEnabled on non-Custom types', () => {
      const attribute: Attribute = createAttribute('enabled', '{this.viewModel.isShown}');
      const info: IAttributeInfo = createUnit().translate(attribute, objectType, objectNames);

      const expectedValue: string = `this.${memberNames.host}.viewModel.isShown`;
      const expectedPropSetter: string = `this.${objectNames.privateName}.setEnabled(${expectedValue});`;
      const expectedAddBinding: string = `this.${memberNames.addBinding}('${expectedValue}', (value) => { this.${objectNames.privateName}.setEnabled(value); });`
      expect(info).toEqual({
        name: 'enabled',
        value: expectedValue,
        propertySetter: expectedPropSetter,
        addBinding: expectedAddBinding
      });
    });

    it('does not call setEnabled for enabled attribute on Custom type', () => {
      const attribute: Attribute = createAttribute('enabled', '{this.viewModel.isShown}');
      const info: IAttributeInfo = createUnit().translate(attribute, 'Custom', objectNames);

      const expectedValue: string = `this.${memberNames.host}.viewModel.isShown`;
      const expectedPropSetter: string = `this.${objectNames.privateName}.enabled = ${expectedValue};`;
      const expectedAddBinding: string = `this.${memberNames.addBinding}('${expectedValue}', (value) => { this.${objectNames.privateName}.enabled = value; });`
      expect(info).toEqual({
        name: 'enabled',
        value: expectedValue,
        propertySetter: expectedPropSetter,
        addBinding: expectedAddBinding
      });
    });

    it('can subscribe events to ModelLoader type', () => {
      const attribute: Attribute = createAttribute('loadFailed', '{ this._onLoadFailed }');
      const info: IAttributeInfo = createUnit().translate(attribute, 'ModelLoader', objectNames);

      const expectedValue: string = `this.${memberNames.host}._onLoadFailed`;
      const expectedPropSetter: string = `this.${objectNames.privateName}.loadFailed.subscribe(${expectedValue});`;
      expect(info).toEqual({
        name: 'loadFailed',
        value: expectedValue,
        propertySetter: expectedPropSetter
      });
    });
  });

  describe('extractExpression', () => {
    it('extracts the value of expressions', () => {
      const attribute: Attribute = createAttribute('url', '{this.viewModel.imageUrl   }');
      const expression: string = createUnit().extractExpression(attribute);
      expect(expression).toBe(`this.${memberNames.host}.viewModel.imageUrl`);
    });

    it('returns the raw value if not an expression', () => {
      const attribute: Attribute = createAttribute('url', `'www.foo.com/image.png'`);
      const expression: string = createUnit().extractExpression(attribute);
      expect(expression).toBe(`'www.foo.com/image.png'`);
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
      expect(importsTracker.babylon).toContain('Color4');
    });

    it('returns the raw value if not an expression and type is not a known parseable type', () => {
      const expression: string = createUnit().extractExpressionFromTypeAndValue('Vec', '0.3,1,0.93');
      expect(expression).toBe('0.3,1,0.93');
    });
  });
});