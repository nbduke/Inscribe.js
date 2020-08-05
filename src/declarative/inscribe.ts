import { parseXml, Document } from 'libxmljs';

import { readFile } from './FileHelpers';

readFile('./src/declarative/View.xsd').then(xsdStr => {
  const xsd: Document = parseXml(xsdStr);
  console.log('Successfully parsed ./View.xsd');
}).catch(error => {
  console.error(error.toString());
});