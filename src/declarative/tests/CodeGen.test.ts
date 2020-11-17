import { parseXml, Document } from 'libxmljs';

import { readFile, writeFile } from '../FileHelpers';
import DocumentTranslator from '../translators/DocumentTranslator';

describe('Code generation', () => {
  it('can translate a View XML specification into a TypeScript class', async () => {
    return readFile('./src/declarative/tests/TestValid.xml').then(xmlStr => {
      const xml: Document = parseXml(xmlStr, { noblanks: true });
      const documentTranslator: DocumentTranslator = new DocumentTranslator({
        inscribe: '../../index'
      });
      const fileOutput: string = documentTranslator.translate(xml);
      return writeFile('./src/declarative/tests/Valid.ts', fileOutput);
    });
  });

  it('can translate a View XML specification with isMixin=true into a TypeScript mixin', () => {
    return readFile('./src/declarative/tests/TestMixin.xml').then(xmlStr => {
      const xml: Document = parseXml(xmlStr, { noblanks: true });
      const documentTranslator: DocumentTranslator = new DocumentTranslator({
        inscribe: '../../index'
      });
      const fileOutput: string = documentTranslator.translate(xml);
      return writeFile('./src/declarative/tests/Mixin.ts', fileOutput);
    });
  });
});