#!/usr/bin/env node
import { parseXml, Document } from 'libxmljs';

import { readFile, writeFile } from './FileHelpers';
import DocumentTranslator from './translators/DocumentTranslator';

let xsd: Document;
let config: any; // TODO define interface

// TODO this does not work in general! It is only a test.
console.log('Parsing schema definition...');
readFile('./node_modules/inscribejs/View.xsd')
  .then(xsdStr => {
    xsd = parseXml(xsdStr);
    console.log('Parsed View.xsd');
  })
  .then(() => {
    console.log('Looking for configuration file...');
    return readFile('./inscribeConfig.json')
      .then(configStr => {
        config = JSON.parse(configStr);
        console.log('Parsed inscribeConfig.json');
      })
      .catch(() => {
        config = {}; // TODO defaults
        console.log('No configuration file found. Using defaults.');
      });
  })
  .then(() => {
    console.log('Translating TextView.xml...');
    return readFile('./src/TextView.xml').then(xmlStr => {
      return parseXml(xmlStr, { noblanks: true });
    });
  })
  .then(xml => {
    if (!xml.validate(xsd)) {
      xml.validationErrors.forEach(error => console.error(error));
      throw new Error('Could not parse TextView.xml');
    }
    const translator: DocumentTranslator = new DocumentTranslator();
    const output: string = translator.translate(xml);
    return writeFile('./src/TextView.ts', output);
  })
  .then(() => {
    console.log('Translating ContainerView.xml...');
    return readFile('./src/ContainerView.xml').then(xmlStr => {
      return parseXml(xmlStr, { noblanks: true });
    });
  })
  .then(xml => {
    if (!xml.validate(xsd)) {
      xml.validationErrors.forEach(error => console.log(error));
      throw new Error('Could not parse ContainerView.xml');
    }
    const translator: DocumentTranslator = new DocumentTranslator();
    const output: string = translator.translate(xml);
    return writeFile('./src/ContainerViewMixin.ts', output);
  })
  .catch(error => {
    console.error(error.message);
  });