import { Document, Element } from 'libxmljs';

import ClassBuilder, { lineDelim } from '../builders/ClassBuilder';
import MethodBuilder, { IMethodArgument } from '../builders/MethodBuilder';
import PropertyTranslator from './PropertyTranslator';
import NodeTranslator from './NodeTranslator';
import MaterialTranslator from './MaterialTranslator';
import TextureTranslator from './TextureTranslator';
import GuiTranslator from './GuiTranslator';

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
  babylonCore: Set<string>;
  babylonGui: Set<string>;
  inscribe: Set<string>;
  lodash: Set<string>;
}

export interface IReferenceableObjects {
  materials: Map<string, MethodBuilder>;
  textures: Map<string, MethodBuilder>;
  nodes: Map<string, MethodBuilder>;
}

export interface IImportLibs {
  allBabylon?: string;
  babylonCore?: string;
  babylonGui?: string;
  inscribe?: string;
  lodash?: string;
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
  private readonly _importLibs?: IImportLibs;
  private _class!: ClassBuilder;
  private _explicitImports!: string[];
  private _implicitImports!: IImportsTracker;
  private _referenceableObjects!: IReferenceableObjects;

  constructor(importLibs?: IImportLibs) {
    this._importLibs = importLibs;
  }

  public translate(document: Document): string {
    const root: Element = document.root()!;
    const className: string = root.attr('name')!.value();
    const isMixin: boolean = root.attr('isMixin')?.value() === 'true';
    this._class = new ClassBuilder(className, 'export default');
    this._explicitImports = [];
    this._implicitImports = {
      babylonCore: new Set(['Node', 'Scene']),
      babylonGui: new Set(),
      inscribe: new Set(['BindingEngine', 'Event']),
      lodash: new Set()
    };
    this._referenceableObjects = {
      materials: new Map(),
      textures: new Map(),
      nodes: new Map()
    };

    this._setupVariablesAndMethods(isMixin);
    this._getSharedMaterialsAndTextures(root);
    root.childNodes().forEach(section => this._translateSection(section));

    const classOutput: string = this._class.toString();
    const importLines: string = this._compileImports();
    return importLines + lineDelim + classOutput;
  }

  private _setupVariablesAndMethods(isMixin: boolean) {
    this._class.addMemberVariable(this._memberNames.root, 'Node | null', 'private', 'null');
    this._class.addMemberVariable(this._memberNames.scene, 'Scene', 'private', undefined, '!');
    this._class.addMemberVariable(this._memberNames.host, 'any', 'private', undefined, '!');
    this._class.addMemberVariable(this._memberNames.bindingEngine, 'BindingEngine', 'private', undefined, '!');
    this._class.addMemberVariable('_isInitialized', 'boolean', 'private', 'false');

    const rootArgument: IMethodArgument = { name: 'root', type: 'Node | Scene' };
    const initMethod: MethodBuilder = new MethodBuilder(
      this._memberNames.init,
      'void',
      'protected',
      rootArgument,
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
      `this.${this._memberNames.bindingEngine} = new BindingEngine(this);`,
      `if (!scriptProvider.${this._memberNames.propertyChanged}) {`,
      `  scriptProvider.${this._memberNames.propertyChanged} = new Event();`,
      `}`
    );
    this._class.addMethod(initMethod);

    if (!isMixin) {
      this._class.setConstructorArgs(rootArgument);
      this._class.addToConstructorBody(`this.__init(root, this);`);
    }
  }

  private _getSharedMaterialsAndTextures(root: Element): void {
    root.childNodes().forEach(sectionElement => {
      if (sectionElement.name() === 'Materials') {
        sectionElement.childNodes().forEach(materialElement => {
          const name: string | undefined = materialElement.attr('name')?.value();
          if (!name) {
            throw new Error('Shared materials must be named.');
          }

          this._referenceableObjects.materials.set(name, this._class.getMethod(this._memberNames.init)!);
        });
      } else if (sectionElement.name() === 'Textures') {
        sectionElement.childNodes().forEach(textureElement => {
          const name: string | undefined = textureElement.attr('name')?.value();
          if (!name) {
            throw new Error('Shared textures must be named.');
          }

          this._referenceableObjects.textures.set(name, this._class.getMethod(this._memberNames.init)!);
        });
      }
    });
  }

  private _translateSection(section: Element): void {
    switch (section.name()) {
      case 'Imports':
        // Split around line endings, removing any empty or whitespace-only strings
        const importLines: string[] = section.child(0)!.text()
          .split(/\r?\n/)
          .filter(s => !/^\s*$/.test(s));
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
          this._referenceableObjects,
          this._memberNames
        );
        nodeTranslator.translate(section);
        break;

      case 'Materials':
        const materialTranslator: MaterialTranslator = new MaterialTranslator(
          this._class,
          this._implicitImports,
          this._referenceableObjects,
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
          this._referenceableObjects,
          this._memberNames
        );
        section.childNodes().forEach(textureElement => {
          textureTranslator.translateSharedTexture(textureElement);
        });
        break;

      case 'Guis':
        const guiTranslator: GuiTranslator = new GuiTranslator(
          this._class,
          this._implicitImports,
          this._memberNames,
          this._referenceableObjects.nodes
        );
        guiTranslator.translate(section);
        break;
    }
  }

  private _compileImports(): string {
    let babylonImports: string;
    if (this._importLibs?.allBabylon) {
      const babylonTypes: string[] = Array.from(this._implicitImports.babylonCore)
        .concat(Array.from(this._implicitImports.babylonGui))
        .sort();
      babylonImports = `import { ${babylonTypes.join(',' + lineDelim)} } from '${this._importLibs.allBabylon}';`;
    } else {
      const babylonCoreTypes: string[] = Array.from(this._implicitImports.babylonCore).sort();
      const babylonGuiTypes: string[] = Array.from(this._implicitImports.babylonGui).sort();
      babylonImports = `import { ${babylonCoreTypes.join(',' + lineDelim)} } from '${this._importLibs?.babylonCore ?? '@babylonjs/core'}';`;
      babylonImports += lineDelim + `import { ${babylonGuiTypes.join(',' + lineDelim)} } from '${this._importLibs?.babylonGui ?? '@babylonjs/gui'}';`;
    }

    const inscribeTypes: string[] = Array.from(this._implicitImports.inscribe).sort();
    const inscribeImports: string = `import { ${inscribeTypes.join(',' + lineDelim)} } from '${this._importLibs?.inscribe ?? 'inscribejs'}';`;
    const lodashTypes: string[] = Array.from(this._implicitImports.lodash).sort();
    const lodashImports: string = `import { ${lodashTypes.join(',' + lineDelim)} } from '${this._importLibs?.lodash ?? 'lodash'}';`;

    return [...this._explicitImports, babylonImports, inscribeImports, lodashImports].join(lineDelim);
  }
}