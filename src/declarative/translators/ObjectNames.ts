import ClassBuilder from '../builders/ClassBuilder';
import PropertyBuilder from '../builders/PropertyBuilder';

export interface IObjectNames {
  publicName: string;
  privateName: string;
  isNameGenerated: boolean;
}

export const generatedNamesCounter: Map<string, number> = new Map();

function generateName(type: string): string {
  let count: number = generatedNamesCounter.get(type) ?? 1;
  generatedNamesCounter.set(type, count + 1);
  return `${type}${count}`;
}

export function getObjectNames(type: string, name: string | undefined): IObjectNames {
  const validName: string = name ?? generateName(type);
  return {
    publicName: validName,
    privateName: 'x_' + validName,
    isNameGenerated: !name
  };
}

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

  if (!objectNames.isNameGenerated) {
    const propertyType: string = isDeferred ? type + ' | undefined' : type;
    const property: PropertyBuilder = new PropertyBuilder(objectNames.publicName, propertyType, 'protected');
    property.addToGetterBody(`return this.${objectNames.privateName};`);
    classBuilder.addProperty(property);
  }
}