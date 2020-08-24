import { getObjectNames, IObjectNames, declareObject, generatedNamesCounter } from './ObjectNames';
import ClassBuilder from '../builders/ClassBuilder';
import PropertyBuilder from '../builders/PropertyBuilder';

describe('getObjectNames', () => {
  afterEach(() => {
    generatedNamesCounter.clear();
  });

  it('uses given name for public name and creates private name', () => {
    const name: string = 'thing';
    const objectNames: IObjectNames = getObjectNames('string', name);
    expect(objectNames).toEqual({
      privateName: `x_${name}`,
      publicName: name,
      isReferenceable: true
    });
  });

  it('generates public and private names from type', () => {
    const type: string = 'Foo';
    const objectNames: IObjectNames = getObjectNames(type, undefined);
    expect(objectNames).toEqual({
      privateName: `x_${type}1`,
      publicName: type + '1',
      isReferenceable: false
    });
  });

  it('generates unique names for the same type', () => {
    const type: string = 'Item';
    const objectNames1: IObjectNames = getObjectNames(type, undefined);
    const objectNames2: IObjectNames = getObjectNames(type, undefined);

    expect(objectNames1).toEqual({
      privateName: `x_${type}1`,
      publicName: type + '1',
      isReferenceable: false
    });
    expect(objectNames2).toEqual({
      privateName: `x_${type}2`,
      publicName: type + '2',
      isReferenceable: false
    });
  });

  describe('declareObject', () => {
    const objectNames: IObjectNames = {
      privateName: 'x_foo',
      publicName: 'foo',
      isReferenceable: true
    };
    const objectType: string = 'Car';
    let classBuilder: ClassBuilder;

    beforeEach(() => {
      classBuilder = new ClassBuilder('ClassName', 'export');
      classBuilder.addMemberVariable = jest.fn();
      classBuilder.addProperty = jest.fn();
    });

    it('adds private member variable to class', () => {
      declareObject(objectType, objectNames, false, classBuilder);
      expect(classBuilder.addMemberVariable).toHaveBeenCalledWith(
        objectNames.privateName,
        objectType,
        'private',
        undefined,
        '!'
      );
    });

    it('adds possibly undefined private member variable to class if isDeferred is true', () => {
      declareObject(objectType, objectNames, true, classBuilder);
      expect(classBuilder.addMemberVariable).toHaveBeenCalledWith(
        objectNames.privateName,
        objectType,
        'private',
        undefined,
        '?'
      );
    });

    it('declares protected setter if object is referenceable', () => {
      declareObject(objectType, objectNames, false, classBuilder);
      const expectedProperty: PropertyBuilder = new PropertyBuilder(objectNames.publicName, objectType, 'protected');
      expectedProperty.addToGetterBody(`return this.${objectNames.privateName};`);
      expect(classBuilder.addProperty).toHaveBeenCalledWith(expectedProperty);
    });

    it('does not declare setter if object is not referenceable', () => {
      objectNames.isReferenceable = false;
      declareObject(objectType, objectNames, false, classBuilder);
      objectNames.isReferenceable = true;
      expect(classBuilder.addProperty).not.toHaveBeenCalled();
    });

    it('declares protected setter with type unioned with undefined if isDeferred is true', () => {
      declareObject(objectType, objectNames, true, classBuilder);
      const expectedProperty: PropertyBuilder = new PropertyBuilder(
        objectNames.publicName,
        objectType + ' | undefined',
        'protected'
      );
      expectedProperty.addToGetterBody(`return this.${objectNames.privateName};`);
      expect(classBuilder.addProperty).toHaveBeenCalledWith(expectedProperty);
    });
  });
});