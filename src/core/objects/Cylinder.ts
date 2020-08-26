import { Scene, VertexData } from '@babylonjs/core';

import Shape from './Shape';

/**
 * Properties of a cylinder.
 */
export interface ICylinderProps {
  diameter: number;
  diameterTop: number;
  diameterBottom: number;
  height: number;
  tessellation: number;
}

/**
 * A cylindrical mesh with updatable vertices.
 */
export default class Cylinder extends Shape<ICylinderProps> {
  private static readonly DEFAULT_PROPS: ICylinderProps = {
    diameter: 1,
    diameterTop: 1,
    diameterBottom: 1,
    height: 1,
    tessellation: 24
  };

  constructor(scene: Scene, name?: string, props?: Partial<ICylinderProps>) {
    super(
      scene,
      name ?? 'Cylinder',
      { ...Cylinder.DEFAULT_PROPS, ...props },
      VertexData.CreateCylinder
    );
  }

  public get diameter(): number {
    return this.props.diameter;
  }

  public set diameter(value: number) {
    this.update({ diameter: value });
  }

  public get diameterTop(): number {
    return this.props.diameterTop;
  }

  public set diameterTop(value: number) {
    this.update({ diameterTop: value });
  }

  public get diameterBottom(): number {
    return this.props.diameterBottom;
  }

  public set diameterBottom(value: number) {
    this.update({ diameterBottom: value });
  }

  public get height(): number {
    return this.props.height;
  }

  public set height(value: number) {
    this.update({ height: value });
  }

  public get tessellation(): number {
    return this.props.tessellation;
  }

  public set tessellation(value: number) {
    this.update({ tessellation: value });
  }
}