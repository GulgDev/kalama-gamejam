import * as w4 from "../../wasm4";
import { World } from "../world";
import { level_1 } from "./layout";
import { TutorialLevel } from "./level";

export class Level1 extends TutorialLevel {
  constructor(world: World) {
    super(world, 1, level_1);
  }

  protected tutorial(): void {
    if (this.next()) {
      this.world.pause();
      this.world.primaryCharacter!.sleep();
    }

    if (this.wait(120)) this.world.focusOnCharacter();

    if (
      (this.showHint("This is you."),
      this.showHint("You can move\nyourself using \x84\x86\x85."))
    )
      this.world.unfocus();

    this.waitForButton(w4.BUTTON_LEFT);
    this.or();
    this.waitForButton(w4.BUTTON_RIGHT);
    this.or();
    this.waitForButton(w4.BUTTON_UP);

    this.wait(180);

    this.showHint("...");
    this.showHint("Why are you\nsleeping?");

    this.wait(60);

    if (this.showHint("WAAAKEEE UUUUPPPP!!!\n!!!!!!!!!!!!!!!!!!!!"))
      this.world.primaryCharacter!.wakeUp();

    this.wait(120);

    this.showHint("That's better.");
    this.showHint("Have you completed\nthe order yet?");

    this.wait(180);

    this.showHint("What do you mean you\ndidn't? That's just\noutrageous!");
    this.showHint("You need to get the\njob done ASAP!");

    this.wait(60);

    if (
      (this.showHint("So..."),
      this.showHint("You better get going"),
      this.showHint("NOOOWWWWWWW!!!"))
    )
      this.world.resume();

    if (this.waitUntil(this.world.primaryCharacter!.x >= 16 * 6.5))
      this.world.pause();

    if (this.wait(20)) this.world.focusOnTile(8, 3);

    if (
      (this.showHint("This is a nest."),
      this.showHint("You can lay an egg\nthere by pressing \x80."))
    )
      this.world.resume();

    if (this.waitUntil(this.world.primaryCharacter!.x >= 16 * 8))
      this.world.unfocus();

    if (this.waitUntil(this.world.placedEgg)) this.world.pause();

    if (
      (this.showHint(
        "Great! Now all you\nhave to do is hatch\nthe egg and walk the\nfrogs to the exits."
      ),
      this.showHint(
        "Keep in mind that\nfrogs need to be\nproperly aligned in\norder to fit."
      ))
    )
      this.world.resume();
  }
}
