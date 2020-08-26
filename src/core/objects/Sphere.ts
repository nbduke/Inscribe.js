import { Scene, VertexData } from '@babylonjs/core';

import Shape from './Shape';

/**
 * Properties of a sphere.
 */
export interface ISphereProps {
  diameter: number;
  segments: number;
}

/**
 * A spherical mesh with updatable vertices.
 */
export default class Sphere extends Shape<ISphereProps> {
  private static readonly DEFAULT_PROPS: ISphereProps = {
    diameter: 1,
    segments: 16
  };

  constructor(scene: Scene, name?: string, props?: Partial<ISphereProps>) {
    super(
      scene,
      name ?? 'Sphere',
      { ...Sphere.DEFAULT_PROPS, ...props },
      VertexData.CreateSphere
    );
  }

  public get diamter(): number {
    return this.props.diameter;
  }

  public set diameter(value: number) {
    this.update({ diameter: value });
  }

  public get segments(): number {
    return this.props.segments;
  }

  public set segments(value: number) {
    this.update({ segments: value });
  }
}