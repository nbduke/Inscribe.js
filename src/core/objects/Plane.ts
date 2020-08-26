import { Scene, VertexData } from '@babylonjs/core';

import Shape from './Shape';

/**
 * Properties of a plane.
 */
export interface IPlaneProps {
  size: number;
  width: number;
  height: number;
}

/**
 * A plane mesh with updatable vertices.
 */
export default class Plane extends Shape<IPlaneProps> {
  private static readonly DEFAULT_PROPS: IPlaneProps = {
    size: 1,
    width: 1,
    height: 1
  };

  constructor(scene: Scene, name?: string, props?: Partial<IPlaneProps>) {
    super(
      scene,
      name ?? 'Plane',
      { ...Plane.DEFAULT_PROPS, ...props },
      VertexData.CreatePlane
    );
  }

  public get size(): number {
    return this.props.size;
  }

  public set size(value: number) {
    this.update({ size: value });
  }

  public get width(): number {
    return this.props.width;
  }

  public set width(value: number) {
    this.update({ width: value });
  }

  public get height(): number {
    return this.props.height;
  }

  public set height(value: number) {
    this.update({ height: value });
  }
}