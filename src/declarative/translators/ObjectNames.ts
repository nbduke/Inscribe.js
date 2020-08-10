export interface IObjectNames {
  publicName: string;
  privateName: string;
  isNameGenerated: boolean;
}

const generatedNamesCounter: Map<string, number> = new Map();

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