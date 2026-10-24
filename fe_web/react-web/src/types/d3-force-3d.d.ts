declare module 'd3-force-3d' {
  export interface SimulationNode3D {
    index?: number;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
  }

  export interface SimulationLink3D<N extends SimulationNode3D> {
    source: string | N;
    target: string | N;
    index?: number;
  }

  type Accessor<T, R> = R | ((datum: T, index: number, data: T[]) => R);

  export interface Force<N extends SimulationNode3D> {
    (alpha: number): void;
    initialize?: (nodes: N[], ...args: unknown[]) => void;
  }

  export interface Simulation3D<N extends SimulationNode3D> {
    nodes(): N[];
    nodes(nodes: N[]): this;
    alpha(): number;
    alpha(alpha: number): this;
    alphaMin(): number;
    alphaMin(min: number): this;
    alphaDecay(decay: number): this;
    alphaTarget(target: number): this;
    velocityDecay(decay: number): this;
    force(name: string): Force<N> | undefined;
    force(name: string, force: Force<N> | null): this;
    tick(iterations?: number): this;
    restart(): this;
    stop(): this;
    on(type: string, listener: (() => void) | null): this;
  }

  export interface LinkForce<N extends SimulationNode3D, L extends SimulationLink3D<N>> extends Force<N> {
    links(links: L[]): this;
    id(id: (node: N) => string): this;
    distance(distance: Accessor<L, number>): this;
    strength(strength: Accessor<L, number>): this;
  }

  export interface ManyBodyForce<N extends SimulationNode3D> extends Force<N> {
    strength(strength: Accessor<N, number>): this;
    distanceMax(distance: number): this;
  }

  export interface PositionForce<N extends SimulationNode3D> extends Force<N> {
    strength(strength: Accessor<N, number>): this;
  }

  export interface CollideForce<N extends SimulationNode3D> extends Force<N> {
    radius(radius: Accessor<N, number>): this;
    strength(strength: number): this;
  }

  export function forceSimulation<N extends SimulationNode3D>(nodes?: N[], numDimensions?: 1 | 2 | 3): Simulation3D<N>;
  export function forceLink<N extends SimulationNode3D, L extends SimulationLink3D<N>>(links?: L[]): LinkForce<N, L>;
  export function forceManyBody<N extends SimulationNode3D>(): ManyBodyForce<N>;
  export function forceCenter<N extends SimulationNode3D>(x?: number, y?: number, z?: number): Force<N>;
  export function forceCollide<N extends SimulationNode3D>(radius?: Accessor<N, number>): CollideForce<N>;
  export function forceX<N extends SimulationNode3D>(x?: Accessor<N, number>): PositionForce<N>;
  export function forceY<N extends SimulationNode3D>(y?: Accessor<N, number>): PositionForce<N>;
  export function forceZ<N extends SimulationNode3D>(z?: Accessor<N, number>): PositionForce<N>;
}
