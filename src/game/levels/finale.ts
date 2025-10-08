import * as w4 from "../../wasm4";
import { World } from "../world";
import { level_1 } from "./layout";
import { TutorialLevel } from "./level";

export class Finale extends TutorialLevel {
  constructor(world: World) {
    super(world, 1, level_1);
  }

  private showLevel: boolean = false;
  protected tutorial(): void {
    if (this.next()) {
      this.world.pause();
      this.world.primaryCharacter!.sleep();
    }

    if ((this.next(), this.effect(true)) && !this.showLevel) {
      store<u8>(w4.DRAW_COLORS, 0x1);
      w4.rect(0, 0, w4.SCREEN_SIZE, w4.SCREEN_SIZE);
    }

    this.showHint("Good job!");
    this.showHint("You did it!");

    if (this.wait(120)) w4.tone(440, 45, 70, w4.TONE_NOISE);

    if ((this.next(), this.effect(true)) && !this.showLevel) {
      store<u8>(w4.DRAW_COLORS, 0x4);
      w4.rect(0, 0, w4.SCREEN_SIZE, w4.SCREEN_SIZE);
    }

    this.wait(45);

    this.showHint("But do you know...", 0x1);
    this.showHint("Why were you doing\nthis?", 0x1);
    this.showHint("What was the purpose\nof all this?", 0x1);
    this.wait(60);
    this.showHint("...", 0x1);
    this.wait(60);
    this.showHint("Everything you\ndid...", 0x1);
    this.showHint("Every level you\ncompleted...", 0x1);
    this.showHint("All of this just to", 0x1, false, 300);

    if (this.next()) {
      w4.tone(440, 45, 70, w4.TONE_NOISE);
      this.showLevel = true;
    }

    this.showHint("get started again?..", 0x12, false, 600);
    this.wait(300);

    if ((this.next(), this.effect(true))) {
      store<u8>(w4.DRAW_COLORS, 0x4);
      w4.rect(0, 0, w4.SCREEN_SIZE, w4.SCREEN_SIZE);

      store<u16>(w4.DRAW_COLORS, 0x2);
      w4.text("Fregg", 60, 72);
      store<u16>(w4.DRAW_COLORS, 0x1);
      w4.text("by Gulg", 80, 88);
    }

    if ((this.wait(120), this.effect(true))) {
      store<u16>(w4.DRAW_COLORS, 0x1);
      w4.text("Thx for playing <3", 8, 112);
    }
  }
}
