import { Mesh, Scene, VertexData } from 'babylonjs';
import { isEqual, assign, cloneDeep } from 'lodash';

export default class Shape<TProps> extends Mesh {
  private _props: TProps;
  private readonly _getVertexData: (props: TProps) => VertexData;

  constructor(
    scene: Scene,
    name: string,
    props: TProps,
    getVertexData: (props: Readonly<TProps>) => VertexData
  ) {
    super(name, scene);
    this._props = props;
    this._getVertexData = getVertexData;

    this._getVertexData(props).applyToMesh(this, true);
  }

  protected get props(): Readonly<TProps> {
    return this._props;
  }

  protected update(props: Partial<TProps>): void {
    for (const key in props) {
      if (!isEqual(this.props[key], props[key])) {
        assign(this._props, cloneDeep(props));
        this._getVertexData(this._props).updateMesh(this);
      }
    }
  }
}