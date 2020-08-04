import { Scene, VertexData } from 'babylonjs';

import Shape from './Shape';

/**
 * Properties of a disc.
 */
export interface IDiscProps {
  radius: number;
  tessellation: number;
}

/**
 * A disc mesh with updatable vertices.
 */
export default class Disc extends Shape<IDiscProps> {
  private static readonly DEFAULT_PROPS: IDiscProps = {
    radius: 0.5,
    tessellation: 24
  };

  constructor(scene: Scene, name?: string, props?: Partial<IDiscProps>) {
    super(
      scene,
      name ?? 'Disc',
      { ...Disc.DEFAULT_PROPS, ...props },
      VertexData.CreateDisc
    );
  }

  public get radius(): number {
    return this.props.radius;
  }

  public set radius(value: number) {
    this.update({ radius: value });
  }

  public get tessellation(): number {
    return this.props.tessellation;
  }

  public set tessellation(value: number) {
    this.update({ tessellation: value });
  }
}