import * as fs from 'fs';

export function readFile(path: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(path, undefined, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data.toString());
      }
    });
  });
}