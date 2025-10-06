import { StateMachine } from "../util/state-machine";
import { GRAVITY, TILE_SIZE, World } from "./world";

export abstract class Body<T> extends StateMachine<T> {
  constructor(
    public world: World,
    public x: f32,
    public y: f32,
    currentState: T,
    transitions: Map<T, StaticArray<T>>
  ) {
    super(currentState, transitions);
  }

  public vx: f32 = 0;
  public vy: f32 = 0;

  update(): void {
    if (!this.world.simulatePhysics) return;

    this.x += this.vx;
    this.y += this.vy;
    this.vy += GRAVITY;

    this.resolveCollision(1, 1);
    this.resolveCollision(1, -1);
    this.resolveCollision(-1, 1);
    this.resolveCollision(-1, -1);

    const newX = min(
      max(this.x, this.world.worldBorderLeft + <f32>TILE_SIZE / 2),
      this.world.worldBorderRight - <f32>TILE_SIZE / 2
    );
    if (this.x !== newX) {
      this.x = newX;
      this.vx = 0;
    }
    const newY = min(
      max(this.y, this.world.worldBorderTop + <f32>TILE_SIZE / 2),
      this.world.worldBorderBottom - <f32>TILE_SIZE / 2
    );
    if (this.y !== newY) {
      this.y = newY;
      this.vy = 0;
    }
  }

  private resolveCollision(ox: i32, oy: i32): void {
    const tx: i32 = <i32>floor(this.x / <f32>TILE_SIZE + <f32>ox / 2),
      ty: i32 = <i32>floor(this.y / <f32>TILE_SIZE + <f32>oy / 2);
    if (!this.world.isCollidable(tx, ty, this)) return;

    const xEdge = (<f32>(tx - ox) + 0.5) * <f32>TILE_SIZE;
    const yEdge = (<f32>(ty - oy) + 0.5) * <f32>TILE_SIZE;

    const xOverlap = abs(this.x - xEdge);
    const yOverlap = abs(this.y - yEdge);

    if (xOverlap < yOverlap) {
      this.x = xEdge;
      this.vx = 0;
    } else {
      this.y = yEdge;
      this.vy = 0;
    }
  }

  abstract draw(world: World): void;
}
