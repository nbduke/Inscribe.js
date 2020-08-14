import { Document, Element } from 'libxmljs';

import ClassBuilder, { lineDelim } from '../builders/ClassBuilder';
import MethodBuilder from '../builders/MethodBuilder';
import PropertyTranslator from './PropertyTranslator';
import NodeTranslator from './NodeTranslator';
import MaterialTranslator from './MaterialTranslator';
import TextureTranslator from './TextureTranslator';

export interface IMemberNames {
  root: string;
  host: string;
  init: string;
  scene: string;
  propertyChanged: string;
  bindingEngine: string;
  addBinding: string;
}

export interface IImportsTracker {
  babylon: Set<string>;
  inscribe: Set<string>;
}

export interface ISharedObjects {
  materials: Set<string>;
  textures: Set<string>;
}

export default class DocumentTranslator {
  private readonly _memberNames: IMemberNames = {
    root: '_root',
    host: '_host',
    init: '__init',
    scene: '_scene',
    propertyChanged: 'propertyChanged',
    bindingEngine: '_bindingEngine',
    addBinding: '_bindingEngine.addBinding'
  };
  private readonly _babylonLib: string;
  private readonly _inscribeLib: string;
  private _class!: ClassBuilder;
  private _explicitImports!: string[];
  private _implicitImports!: IImportsTracker;
  private _sharedObjects!: ISharedObjects;

  constructor(babylonLib: string, inscribeLib: string) {
    this._babylonLib = babylonLib;
    this._inscribeLib = inscribeLib;
  }

  public translate(document: Document): string {
    const root: Element = document.root()!;
    const className: string = root.attr('name')!.value();
    this._class = new ClassBuilder(className, 'export default');
    this._explicitImports = [];
    this._implicitImports = {
      babylon: new Set(['Node', 'Scene']),
      inscribe: new Set(['BindingEngine', 'Event', 'IPropertyChangedArgs'])
    };
    this._sharedObjects = {
      materials: new Set(),
      textures: new Set()
    };

    this._setupVariablesAndMethods();
    this._recordSharedObjects(root);
    root.childNodes().forEach(section => this._translateSection(section));

    const classOutput: string = this._class.toString();
    const importLines: string = this._compileImports();
    return importLines + lineDelim + classOutput;
  }

  private _setupVariablesAndMethods() {
    this._class.addMemberVariable(this._memberNames.root, 'Node | null', 'private', 'null');
    this._class.addMemberVariable(this._memberNames.scene, 'Scene', 'private', undefined, '!');
    this._class.addMemberVariable(this._memberNames.host, 'any', 'private', undefined, '!');
    this._class.addMemberVariable(this._memberNames.bindingEngine, 'BindingEngine', 'private', undefined, '!');
    this._class.addMemberVariable(
      this._memberNames.propertyChanged,
      'Event<IPropertyChangedArgs>',
      'public',
      undefined,
      '!'
    );
    this._class.addMemberVariable('_isInitialized', 'boolean', 'private', 'false');

    const initMethod: MethodBuilder = new MethodBuilder(
      this._memberNames.init,
      'void',
      'protected',
      { name: 'root', type: 'Node | Scene' },
      { name: 'scriptProvider', type: 'any' }
    );
    initMethod.addToBody(
      'if (this._isInitialized) return;',
      'this._isInitialized = true;',
      `if (root instanceof Scene) {`,
      `  this.${this._memberNames.root} = null;`,
      `  this.${this._memberNames.scene} = root;`,
      `} else {`,
      `  this.${this._memberNames.root} = root;`,
      `  this.${this._memberNames.scene} = root.getScene();`,
      `}`,
      `this.${this._memberNames.host} = scriptProvider;`,
      `this.${this._memberNames.bindingEngine} = new BindingEngine();`,
      `this.${this._memberNames.propertyChanged} = new Event();`
    );
    this._class.addMethod(initMethod);
  }

  private _recordSharedObjects(root: Element): void {
    root.childNodes().forEach(sectionElement => {
      if (sectionElement.name() === 'Materials') {
        sectionElement.childNodes().forEach(materialElement => {
          const name: string | undefined = materialElement.attr('name')?.value();
          if (!name) {
            throw new Error('Shared materials must be named.');
          }

          this._sharedObjects.materials.add(name);
        });
      } else if (sectionElement.name() === 'Textures') {
        sectionElement.childNodes().forEach(textureElement => {
          const name: string | undefined = textureElement.attr('name')?.value();
          if (!name) {
            throw new Error('Shared textures must be named.');
          }

          this._sharedObjects.textures.add(name);
        });
      }
    });
  }

  private _translateSection(section: Element): void {
    switch (section.name()) {
      case 'Imports':
        const importLines: string[] = section.child(0)!.text().split(/(\r?\n)+/);
        this._explicitImports.push(...importLines);
        break;

      case 'Properties':
        const propTranslator: PropertyTranslator = new PropertyTranslator(
          this._class,
          this._implicitImports,
          this._memberNames
        );
        propTranslator.translate(section);
        break;

      case 'Nodes':
        const nodeTranslator: NodeTranslator = new NodeTranslator(
          this._class,
          this._implicitImports,
          this._sharedObjects,
          this._memberNames
        );
        nodeTranslator.translate(section);
        break;

      case 'Materials':
        const materialTranslator: MaterialTranslator = new MaterialTranslator(
          this._class,
          this._implicitImports,
          this._sharedObjects,
          this._memberNames
        );
        section.childNodes().forEach(materialElement => {
          materialTranslator.translateSharedMaterial(materialElement);
        });
        break;

      case 'Textures':
        const textureTranslator: TextureTranslator = new TextureTranslator(
          this._class,
          this._implicitImports,
          this._memberNames
        );
        section.childNodes().forEach(textureElement => {
          textureTranslator.translateSharedTexture(textureElement);
        });
        break;
    }
  }

  private _compileImports(): string {
    const babylonTypes: string[] = Array.from(this._implicitImports.babylon).sort();
    const babylonImports: string = `import {${babylonTypes.join(',' + lineDelim)}} from ${this._babylonLib};`;
    const inscribeTypes: string[] = Array.from(this._implicitImports.inscribe).sort();
    const inscribeImports: string = `import {${inscribeTypes.join(',' + lineDelim)}} from ${this._inscribeLib};`;

    return [...this._explicitImports, babylonImports, inscribeImports].join(lineDelim);
  }
}