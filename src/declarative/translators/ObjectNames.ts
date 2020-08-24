import ClassBuilder from '../builders/ClassBuilder';
import PropertyBuilder from '../builders/PropertyBuilder';

export interface IObjectNames {
  publicName: string;
  privateName: string;
  isReferenceable: boolean;
}

export const generatedNamesCounter: Map<string, number> = new Map();

/**
 * Generates a name for an object when it wasn't given a name.
 * @param type - the object's type
 */
function generateName(type: string): string {
  let count: number = generatedNamesCounter.get(type) ?? 1;
  generatedNamesCounter.set(type, count + 1);
  return `${type}${count}`;
}

/**
 * Creates the public and private names for an object.
 * @param type - the object's type
 * @param name - the object's given name attribute, if any
 */
export function getObjectNames(type: string, name: string | undefined): IObjectNames {
  const validName: string = name ?? generateName(type);
  return {
    publicName: validName,
    privateName: getPrivateNameFor(validName),
    isReferenceable: !!name
  };
}

/**
 * Creates the private name for an object.
 * @param identifier - the object's identifier
 */
export function getPrivateNameFor(identifier: string): string {
  return 'x_' + identifier;
}

/**
 * Declares a member variable for an object. If the object is referenceable, a protected property getter
 * is added as well.
 * @param type - the object's type
 * @param objectNames - the object's names
 * @param isDeferred - whether the object is defer-initialized
 * @param classBuilder - the class
 */
export function declareObject(
  type: string,
  objectNames: IObjectNames,
  isDeferred: boolean,
  classBuilder: ClassBuilder
): void {
  classBuilder.addMemberVariable(
    objectNames.privateName,
    type,
    'private',
    undefined,
    isDeferred ? '?' : '!'
  );

  if (objectNames.isReferenceable) {
    const propertyType: string = isDeferred ? type + ' | undefined' : type;
    const property: PropertyBuilder = new PropertyBuilder(objectNames.publicName, propertyType, 'protected');
    property.addToGetterBody(`return this.${objectNames.privateName};`);
    classBuilder.addProperty(property);
  }
}