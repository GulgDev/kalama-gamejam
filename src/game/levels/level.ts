import * as w4 from "../../wasm4";
import { TileType, World } from "../world";

export abstract class Level {
  constructor(
    readonly eggs: u32,
    readonly grid: StaticArray<StaticArray<TileType>>
  ) {}

  update(): void {}
}

export function parseLayout(
  layout: string
): StaticArray<StaticArray<TileType>> {
  return StaticArray.fromArray(
    layout
      .trim()
      .split("\n")
      .map<StaticArray<TileType>>((row) =>
        StaticArray.fromArray(
          row
            .trim()
            .split("")
            .map<TileType>((tile) =>
              tile === "."
                ? TileType.AIR
                : tile === "*"
                ? TileType.SPAWN_POINT
                : tile === "#"
                ? TileType.BLOCK
                : tile === "&"
                ? TileType.EGGABLE_BLOCK
                : tile === "-"
                ? TileType.PLATFORM
                : tile === "%"
                ? TileType.GATE
                : tile === "$"
                ? TileType.SHADOW_GATE
                : tile === "@"
                ? TileType.DOOR
                : unreachable()
            )
        )
      )
  );
}

const FRAMES_PER_CHARACTER = 5;
const CONTINUE_TIMEOUT = 35;

const ENABLE_TUTORIAL = true;

export abstract class TutorialLevel extends Level {
  private currentStep: u32 = 0;
  private elapsedTime: u32 = 0;

  constructor(
    protected readonly world: World,
    eggs: u32,
    grid: StaticArray<StaticArray<TileType>>
  ) {
    super(eggs, grid);
  }

  public effect(forever: boolean = false): boolean {
    return (
      this.currentStep === this.stepOffset ||
      (forever && this.currentStep > this.stepOffset)
    );
  }

  protected showHint(
    str: string,
    colors: u8 = 0x12,
    waitForKey: boolean = true,
    timeout: u32 = 0
  ): boolean {
    store<u16>(w4.DRAW_COLORS, colors);

    if ((this.next(), this.effect())) {
      const sliced = str.slice(0, this.elapsedTime / FRAMES_PER_CHARACTER);
      w4.text(
        sliced,
        0,
        w4.SCREEN_SIZE - w4.FONT_SIZE * sliced.split("\n").length
      );
    }

    if (
      waitForKey
        ? (this.wait(str.length * FRAMES_PER_CHARACTER + CONTINUE_TIMEOUT),
          this.or(),
          this.waitForButton(w4.BUTTON_1),
          this.or(),
          this.waitForClick(),
          this.effect())
        : (this.wait(
            str.length * FRAMES_PER_CHARACTER + CONTINUE_TIMEOUT + timeout
          ),
          this.effect())
    ) {
      w4.text(
        str,
        0,
        w4.SCREEN_SIZE - w4.FONT_SIZE * (str.split("\n").length + 1)
      );
      if (waitForKey)
        w4.text("\x80 to continue", 0, w4.SCREEN_SIZE - w4.FONT_SIZE);
    }

    return waitForKey
      ? (this.waitForButton(w4.BUTTON_1),
        this.or(),
        this.waitForClick(),
        this.next())
      : this.next();
  }

  protected wait(time: u32): boolean {
    return this.waitUntil(this.elapsedTime >= time);
  }

  protected waitUntil(condition: boolean): boolean {
    return (
      this.stepOffset++ === this.currentStep &&
      condition &&
      (++this.nextStep, (this.elapsedTime = 0), true)
    );
  }

  protected waitForButton(button: u8): boolean {
    const gamepad = load<u8>(w4.GAMEPAD1);
    const pressedGamepad = gamepad & (gamepad ^ this.world.game.prevGamepad);
    return this.waitUntil((pressedGamepad & button) !== 0);
  }

  protected waitForClick(): boolean {
    const mouseButtons = load<u8>(w4.MOUSE_BUTTONS);
    const pressedMouseButtons =
      mouseButtons & (mouseButtons ^ this.world.game.prevMouseButtons);
    return this.waitUntil(pressedMouseButtons !== 0);
  }

  protected next(): boolean {
    return this.waitUntil(true);
  }

  protected or(): void {
    --this.stepOffset;
  }

  private stepOffset: u32 = 0;
  private nextStep: u32 = 0;
  update(): void {
    this.stepOffset = 0;
    this.nextStep = this.currentStep;
    if (ENABLE_TUTORIAL) this.tutorial();
    this.currentStep = this.nextStep;
    ++this.elapsedTime;
  }

  protected abstract tutorial(): void;
}
