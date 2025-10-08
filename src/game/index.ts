import { StateMachine } from "../util/state-machine";
import { World } from "./world";
import * as w4 from "../wasm4";
import { drawRoundedRect } from "../util/drawing";
import { createLevel, LEVEL_COUNT } from "./levels";

enum GameState {
  TITLE,
  LEVELS,
  LEVEL,
}

const GAME_TRANSITIONS: Map<GameState, StaticArray<GameState>> = new Map();
GAME_TRANSITIONS.set(GameState.TITLE, [GameState.LEVELS]);
GAME_TRANSITIONS.set(GameState.LEVELS, [GameState.LEVEL]);
GAME_TRANSITIONS.set(GameState.LEVEL, [GameState.LEVELS]);

const UNLOCK_ALL = true;

export class Game extends StateMachine<GameState> {
  private unlockedLevel: u32 = UNLOCK_ALL ? LEVEL_COUNT - 1 : 0;
  private world: World = new World(this);

  constructor() {
    super(GameState.TITLE, GAME_TRANSITIONS);
  }

  prevGamepad: u8 =
    w4.BUTTON_1 |
    w4.BUTTON_2 |
    w4.BUTTON_LEFT |
    w4.BUTTON_RIGHT |
    w4.BUTTON_UP |
    w4.BUTTON_DOWN;
  prevMouseButtons: u8 = w4.MOUSE_LEFT | w4.MOUSE_MIDDLE | w4.MOUSE_RIGHT;

  private selectedLevel: u32 = 0;
  update(): void {
    switch (this.state) {
      case GameState.TITLE:
        this.updateTitleScreen();
        break;
      case GameState.LEVELS:
        this.updateLevelSelect();
        break;
      case GameState.LEVEL:
        this.world.update();
        break;
    }

    this.prevGamepad = load<u8>(w4.GAMEPAD1);
    this.prevMouseButtons = load<u8>(w4.MOUSE_BUTTONS);
  }

  private updateTitleScreen(): void {
    store<u16>(w4.DRAW_COLORS, 0x03);
    w4.text("Fregg", 60, 72);
    store<u16>(w4.DRAW_COLORS, 0x02);
    w4.text("Press \x80 or", 40, 88);
    w4.text("click anywhere", 24, 96);
    w4.text("to play", 52, 104);

    if (load<u8>(w4.GAMEPAD1) & w4.BUTTON_1 || load<u8>(w4.MOUSE_BUTTONS))
      this.setState(GameState.LEVELS);
  }

  private updateLevelSelect(): void {
    const gamepad = load<u8>(w4.GAMEPAD1);
    const pressedGamepad = gamepad & (gamepad ^ this.prevGamepad);

    const mouseButtons = load<u8>(w4.MOUSE_BUTTONS);
    const pressedMouseButtons =
      mouseButtons & (mouseButtons ^ this.prevMouseButtons);

    store<u16>(w4.DRAW_COLORS, 0x03);
    w4.text("Levels", 56, 24);

    const mouseX: i16 = load<i16>(w4.MOUSE_X);
    const mouseY: i16 = load<i16>(w4.MOUSE_Y);

    if (pressedGamepad & w4.BUTTON_LEFT)
      this.selectedLevel += this.unlockedLevel;
    if (pressedGamepad & w4.BUTTON_RIGHT) this.selectedLevel += 1;
    if (pressedGamepad & w4.BUTTON_UP)
      this.selectedLevel += this.unlockedLevel - 2;
    if (pressedGamepad & w4.BUTTON_DOWN) this.selectedLevel += 3;
    this.selectedLevel %= this.unlockedLevel + 1;

    let selectedLevel: u32 = this.selectedLevel;
    for (let i: u32 = 0; i <= this.unlockedLevel; ++i) {
      const x: u32 = 48 + (i % 3) * 24,
        y: u32 = 48 + (i / 3) * 24;
      if (
        mouseX >= <i32>x &&
        mouseX <= <i32>x + 16 &&
        mouseY >= <i32>y &&
        mouseY <= <i32>y + 16
      ) {
        selectedLevel = i;
        if (pressedMouseButtons) return this.selectLevel(i);
        break;
      }
    }

    if (pressedGamepad & w4.BUTTON_1)
      return this.selectLevel(this.selectedLevel);

    for (let i: u32 = 0; i <= this.unlockedLevel; ++i) {
      const x: u32 = 48 + (i % 3) * 24,
        y: u32 = 48 + (i / 3) * 24;
      store<u16>(w4.DRAW_COLORS, i === selectedLevel ? 0x33 : 0x32);
      drawRoundedRect(x, y, 16, 16, 4);
      store<u16>(w4.DRAW_COLORS, 0x01);
      w4.text(`${i + 1}`, x + 4, y + 4);
    }
  }

  goToLevelSelect(): void {
    this.setState(GameState.LEVELS);
  }

  selectLevel(level: u32): void {
    this.selectedLevel = level;
    this.setState(GameState.LEVEL);
    this.world.loadLevel(createLevel(level, this.world));
  }

  completeLevel(): void {
    if (
      this.selectedLevel + 1 > this.unlockedLevel &&
      this.selectedLevel < LEVEL_COUNT - 1
    )
      this.unlockedLevel = this.selectedLevel + 1;
  }

  nextLevel(): void {
    this.selectLevel(this.selectedLevel + 1);
  }
}
