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

    let originalX = this.x,
      originalY = this.y,
      originalVx = this.vx,
      originalVy = this.vy;

    for (let k = 0; k < 3; ++k) {
      if (k === 2) {
        originalX = this.x;
        originalY = this.y;
        originalVx = this.vx;
        originalVy = this.vy;
      }

      let minOverlap = f32.POSITIVE_INFINITY;
      for (let i: f32 = 0; i <= 1; ++i)
        for (let j: f32 = 0; j <= 1; ++j) {
          const tx = <i32>(
            floor(
              (this.x -
                i * f32(this.x % <f32>TILE_SIZE === <f32>TILE_SIZE / 2)) /
                <f32>TILE_SIZE +
                i -
                0.5
            )
          );
          const ty = <i32>(
            floor(
              (this.y -
                j * f32(this.y % <f32>TILE_SIZE === <f32>TILE_SIZE / 2)) /
                <f32>TILE_SIZE +
                j -
                0.5
            )
          );
          if (this.world.isCollidable(tx, ty, this)) {
            const xEdge = (<f32>tx - i * 2 + 1.5) * <f32>TILE_SIZE;
            const yEdge = (<f32>ty - j * 2 + 1.5) * <f32>TILE_SIZE;

            const xOverlap = abs(this.x - xEdge);
            const yOverlap = abs(this.y - yEdge);

            if (xOverlap < yOverlap) {
              if (xOverlap < minOverlap) {
                minOverlap = xOverlap;
                this.x = xEdge;
                this.vx = 0;
                this.y = originalY;
                this.vy = originalVy;
              }
            } else {
              if (yOverlap < minOverlap) {
                minOverlap = yOverlap;
                this.x = originalX;
                this.vx = originalVx;
                this.y = yEdge;
                this.vy = 0;
              }
            }
          }
        }
    }

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

  abstract draw(world: World): void;
}
