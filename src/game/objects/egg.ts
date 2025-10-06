import { egg, eggFlags, eggHeight, eggWidth } from "../../sprites";
import * as w4 from "../../wasm4";
import { Body } from "../body";
import { World } from "../world";

export class Egg extends Body<u8> {
  constructor(world: World, x: f32, y: f32) {
    super(world, x, y, 0, new Map());
  }

  draw(): void {
    store<u16>(w4.DRAW_COLORS, 0x21);
    w4.blit(
      egg,
      <i32>nearest(this.x - <f32>eggWidth / 2 - this.world.cameraOffsetX),
      <i32>nearest(this.y - <f32>eggHeight / 2 - this.world.cameraOffsetY),
      eggWidth,
      eggHeight,
      eggFlags
    );
  }
}
