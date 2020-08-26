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

export function writeFile(path: string, contents: string, flag: string = 'w+'): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(path, contents, { flag }, error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}