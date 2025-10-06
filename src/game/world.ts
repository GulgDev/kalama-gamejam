import { Character } from "./objects/character";
import * as w4 from "../wasm4";
import {
  door,
  doorFlags,
  egg8,
  egg8Flags,
  egg8Height,
  egg8Width,
} from "../sprites";
import { StateMachine } from "../util/state-machine";
import { Game } from ".";
import { Level } from "./levels/level";
import { Egg } from "./objects/egg";
import { MusicPlayer } from "../util/music-player";
import { backgroundMusic, levelCompletedSfx } from "../music";
import { Body } from "./body";

export const GRAVITY: f32 = 0.05;

export const TILE_SIZE: u32 = 16;

const CAMERA_FOLLOW_THRESHOLD: f32 = 0.2;

export enum TileType {
  AIR,
  SPAWN_POINT,
  BLOCK,
  EGGABLE_BLOCK,
  PLATFORM,
  GATE,
  SHADOW_GATE,
  DOOR,
}

enum WorldState {
  PLAYING,
  PAUSED,
  LEVEL_COMPLETED,
}

const WORLD_TRANSITIONS: Map<WorldState, StaticArray<WorldState>> = new Map();
WORLD_TRANSITIONS.set(WorldState.PLAYING, [
  WorldState.PAUSED,
  WorldState.LEVEL_COMPLETED,
]);
WORLD_TRANSITIONS.set(WorldState.PAUSED, [WorldState.PLAYING]);
WORLD_TRANSITIONS.set(WorldState.LEVEL_COMPLETED, [WorldState.PLAYING]);

export class World extends StateMachine<WorldState> {
  private grid: StaticArray<StaticArray<TileType>> = [];

  private doors: StaticArray<StaticArray<u32>> = [];

  public primaryCharacter: Character | null = null;
  private egg: Egg | null = null;
  private characters: Character[] = [];

  get placedEgg(): boolean {
    return this.egg !== null;
  }

  private camX: f32 = <f32>w4.SCREEN_SIZE / 2;
  private camY: f32 = <f32>w4.SCREEN_SIZE / 2;

  get cameraOffsetX(): f32 {
    return floor(this.camX - <f32>w4.SCREEN_SIZE / 2);
  }
  get cameraOffsetY(): f32 {
    return floor(this.camY - <f32>w4.SCREEN_SIZE / 2);
  }

  private targetCamX: f32 = this.camX;
  private targetCamY: f32 = this.camY;

  constructor(public readonly game: Game) {
    super(WorldState.PLAYING, WORLD_TRANSITIONS);
    this.play(backgroundMusic());
  }

  private stateChangedAt: u32 = 0;
  protected override onStateChanged(
    newState: WorldState,
    oldState: WorldState
  ): void {
    this.stateChangedAt = this.frame;

    switch (newState) {
      case WorldState.LEVEL_COMPLETED: {
        this.play(levelCompletedSfx());
        break;
      }
    }
  }

  private completeLevel(): void {
    this.setState(WorldState.LEVEL_COMPLETED);
    this.game.completeLevel();
  }

  getTileAt(x: i32, y: i32): TileType {
    if (x < 0 || y < 0) return 0;
    if (y >= this.grid.length) return 0;
    const row = this.grid[y];
    if (x >= row.length) return 0;
    return row[x];
  }

  isCollidable<T>(tileX: u32, tileY: u32, body: Body<T>): boolean {
    switch (this.getTileAt(tileX, tileY)) {
      case TileType.BLOCK:
      case TileType.EGGABLE_BLOCK:
        return true;
      case TileType.PLATFORM:
        return body.vy > 0;
      case TileType.GATE:
        return !(body instanceof Character && (<Character>body).isPrimary);
      case TileType.SHADOW_GATE:
        return !(body instanceof Character && !(<Character>body).isPrimary);
      default:
        return false;
    }
  }

  worldBorderLeft: f32 = 0;
  worldBorderRight: f32 = 0;
  worldBorderTop: f32 = 0;
  worldBorderBottom: f32 = 0;

  private followCharacter: u32 = 0;

  private level: Level | null = null;
  loadLevel(level: Level): void {
    this.musicPlayers = [];

    this.grid = level.grid;
    this.worldBorderLeft = 0;
    this.worldBorderRight = <f32>(
      (this.grid.reduce(
        (max, row) => (row.length > max ? row.length : max),
        0
      ) * TILE_SIZE)
    );
    this.worldBorderTop = -5 * <f32>TILE_SIZE;
    this.worldBorderBottom = <f32>(this.grid.length * TILE_SIZE);

    const doors: StaticArray<u32>[] = [];
    this.level = level;
    this.eggs = level.eggs;
    this.maxEggs = level.eggs;
    this.characters = [];
    this.followCharacter = 0;
    this.egg = null;
    for (let y = 0; y < this.grid.length; ++y)
      for (let x = 0; x < this.grid[y].length; ++x)
        switch (this.grid[y][x]) {
          case TileType.SPAWN_POINT:
            this.characters.push(
              new Character(
                this,
                (<f32>x + 0.5) * <f32>TILE_SIZE,
                (<f32>y + 0.5) * <f32>TILE_SIZE,
                true
              )
            );
            break;
          case TileType.DOOR:
            doors.push([x, y]);
            break;
        }
    this.doors = StaticArray.fromArray(doors);
    if (
      (this.primaryCharacter =
        this.characters.length > 0 ? this.characters[0] : null) !== null
    ) {
      this.targetCamX = this.camX = this.primaryCharacter!.x;
      this.targetCamY = this.camY = this.primaryCharacter!.y;
    }
    this.setState(WorldState.PLAYING);
  }

  private resetTimeout: i32 = -1;
  private processInput(): void {
    const gamepad = load<u8>(w4.GAMEPAD1);
    const pressedGamepad = gamepad & (gamepad ^ this.game.prevGamepad);

    if (pressedGamepad & w4.BUTTON_2 && this.characters.length > 1) {
      this.followCharacter =
        (this.followCharacter + this.characters.length - 1) %
        this.characters.length;
      const character = this.characters[this.followCharacter];
      this.targetCamX = this.camX = character.x;
      this.targetCamY = this.camY = character.y;
    }

    if (
      gamepad & w4.BUTTON_1 &&
      this.egg === null &&
      (this.primaryCharacter!.getTileBelow() !== TileType.EGGABLE_BLOCK ||
        this.eggs === 0) &&
      this.resetTimeout > 0
    ) {
      if (--this.resetTimeout === 0) this.loadLevel(this.level!);
    } else {
      this.resetTimeout = -1;
    }

    if (pressedGamepad & w4.BUTTON_1 && this.primaryCharacter !== null) {
      if (this.egg === null) {
        if (
          this.eggs > 0 &&
          this.primaryCharacter!.getTileBelow() === TileType.EGGABLE_BLOCK
        ) {
          --this.eggs;
          this.egg = new Egg(
            this,
            this.primaryCharacter!.x,
            this.primaryCharacter!.y
          );
          w4.tone(
            60 | (100 << 16),
            (8 << 16) | (3 << 8),
            50,
            w4.TONE_MODE1 | w4.TONE_PULSE1
          );
        } else {
          this.resetTimeout = 60 * 3;
        }
      } else {
        this.characters.unshift(
          new Character(this, this.egg!.x, this.egg!.y, false)
        );
        this.egg = null;
        w4.tone(
          70 | (80 << 16),
          (8 << 16) | (8 << 8),
          20,
          w4.TONE_MODE3 | w4.TONE_NOISE
        );
      }
    }
  }

  private musicPlayers: MusicPlayer[] = [];
  play(players: StaticArray<MusicPlayer>): void {
    for (let i = 0; i < players.length; ++i) this.musicPlayers.push(players[i]);
  }

  get acceptInput(): boolean {
    switch (this.state) {
      case WorldState.PLAYING:
        return true;
      default:
        return false;
    }
  }

  get simulatePhysics(): boolean {
    switch (this.state) {
      case WorldState.PLAYING:
      case WorldState.PAUSED:
        return true;
      default:
        return false;
    }
  }

  frame: u32 = 0;
  update(): void {
    for (let i = 0; i < this.musicPlayers.length; ++i)
      if (this.musicPlayers[i].update()) this.musicPlayers.splice(i--, 1);

    if (this.acceptInput) this.processInput();

    if (this.egg != null) this.egg!.update();
    for (let i = 0; i < this.characters.length; ++i)
      this.characters[i].update();

    this.moveCamera();
    this.draw();

    if (this.level !== null) this.level!.update();

    ++this.frame;

    if (
      this.state === WorldState.PLAYING &&
      this.characters.every(
        (character) => character.getTileAt() === TileType.DOOR
      )
    ) {
      for (let i = 0; i < this.doors.length; ++i) {
        const door = this.doors[i];
        let found = false;
        for (let j = 0; j < this.characters.length; ++j) {
          const character = this.characters[j];
          if (
            <u32>nearest(character.x / <f32>TILE_SIZE - 0.5) === door[0] &&
            <u32>nearest(character.y / <f32>TILE_SIZE - 0.5) === door[1]
          ) {
            found = true;
            break;
          }
        }
        if (!found) return;
      }
      this.completeLevel();
    }
  }

  pause(): void {
    assert(this.setState(WorldState.PAUSED));
  }

  resume(): void {
    assert(this.setState(WorldState.PLAYING));
  }

  private focusX: f32 = 0;
  private focusY: f32 = 0;
  private focused: boolean = false;
  private focusStartFrame: u32 = 0;
  focus(x: f32, y: f32): void {
    this.focusX = x;
    this.focusY = y;
    this.focused = true;
    this.focusStartFrame = this.frame;
  }
  unfocus(): void {
    this.focused = false;
  }

  focusOnTile(x: i32, y: i32): void {
    this.focus(<f32>((x + 0.5) * TILE_SIZE), <f32>((y + 0.5) * TILE_SIZE));
  }

  focusOnCharacter(): void {
    assert(this.primaryCharacter !== null);
    this.focus(this.primaryCharacter!.x, this.primaryCharacter!.y);
  }

  private moveCamera(): void {
    if (
      this.targetCamX <
      this.camX - <f32>w4.SCREEN_SIZE * CAMERA_FOLLOW_THRESHOLD
    ) {
      const target =
        this.targetCamX + <f32>w4.SCREEN_SIZE * CAMERA_FOLLOW_THRESHOLD;
      this.camX = max(
        this.camX - ((this.camX - target) * 0.02) ** 2 * 4,
        target
      );
    } else if (
      this.targetCamX >
      this.camX + <f32>w4.SCREEN_SIZE * CAMERA_FOLLOW_THRESHOLD
    ) {
      const target =
        this.targetCamX - <f32>w4.SCREEN_SIZE * CAMERA_FOLLOW_THRESHOLD;
      this.camX = min(
        this.camX + ((target - this.camX) * 0.02) ** 2 * 4,
        target
      );
    }

    if (
      this.targetCamY <
      this.camY - <f32>w4.SCREEN_SIZE * CAMERA_FOLLOW_THRESHOLD
    ) {
      const target =
        this.targetCamY + <f32>w4.SCREEN_SIZE * CAMERA_FOLLOW_THRESHOLD;
      this.camY = max(
        this.camY - ((this.camY - target) * 0.02) ** 2 * 4,
        target
      );
    } else if (
      this.targetCamY >
      this.camY + <f32>w4.SCREEN_SIZE * CAMERA_FOLLOW_THRESHOLD
    ) {
      const target =
        this.targetCamY - <f32>w4.SCREEN_SIZE * CAMERA_FOLLOW_THRESHOLD;
      this.camY = min(
        this.camY + ((target - this.camY) * 0.02) ** 2 * 4,
        target
      );
    }

    if (this.focused) this.cameraFollow(this.focusX, this.focusY);
    else {
      const character = this.characters[this.followCharacter];
      this.cameraFollow(character.x, character.y);
    }
  }

  private cameraFollow(x: f32, y: f32): void {
    this.targetCamX = x;
    this.targetCamY = y;
  }

  private eggs: u32 = 0;
  private maxEggs: u32 = 0;
  private draw(): void {
    for (let y: u32 = 0; y < <u32>this.grid.length; ++y)
      for (let x: u32 = 0; x < <u32>this.grid[y].length; ++x)
        switch (this.getTileAt(x, y)) {
          case TileType.AIR:
          case TileType.SPAWN_POINT:
            break;
          case TileType.BLOCK:
            store<u16>(w4.DRAW_COLORS, 0x43);
            w4.rect(
              x * TILE_SIZE - <i32>nearest(this.cameraOffsetX),
              y * TILE_SIZE - <i32>nearest(this.cameraOffsetY),
              TILE_SIZE,
              TILE_SIZE
            );
            break;
          case TileType.EGGABLE_BLOCK:
            store<u16>(w4.DRAW_COLORS, 0x42);
            w4.rect(
              x * TILE_SIZE - <i32>nearest(this.cameraOffsetX),
              y * TILE_SIZE - <i32>nearest(this.cameraOffsetY),
              TILE_SIZE,
              TILE_SIZE
            );
            break;
          case TileType.PLATFORM:
            store<u16>(w4.DRAW_COLORS, 0x43);
            w4.rect(
              x * TILE_SIZE - <i32>nearest(this.cameraOffsetX),
              y * TILE_SIZE - <i32>nearest(this.cameraOffsetY),
              TILE_SIZE,
              TILE_SIZE / 4
            );
            store<u16>(w4.DRAW_COLORS, 0x03);
            w4.hline(
              x * TILE_SIZE - <i32>nearest(this.cameraOffsetX) + 1,
              y * TILE_SIZE -
                <i32>nearest(this.cameraOffsetY) +
                TILE_SIZE / 4 -
                1,
              TILE_SIZE - 2
            );
            break;
          case TileType.GATE:
            store<u16>(w4.DRAW_COLORS, 0x21);
            w4.rect(
              x * TILE_SIZE - <i32>nearest(this.cameraOffsetX),
              y * TILE_SIZE - <i32>nearest(this.cameraOffsetY),
              TILE_SIZE,
              TILE_SIZE
            );
            break;
          case TileType.SHADOW_GATE:
            store<u16>(w4.DRAW_COLORS, 0x31);
            w4.rect(
              x * TILE_SIZE - <i32>nearest(this.cameraOffsetX),
              y * TILE_SIZE - <i32>nearest(this.cameraOffsetY),
              TILE_SIZE,
              TILE_SIZE
            );
            break;
          case TileType.DOOR:
            store<u16>(w4.DRAW_COLORS, 0x4321);
            w4.blit(
              door,
              x * TILE_SIZE - <i32>nearest(this.cameraOffsetX),
              y * TILE_SIZE - <i32>nearest(this.cameraOffsetY),
              TILE_SIZE,
              TILE_SIZE,
              doorFlags
            );
            break;
          default:
            unreachable();
        }

    if (this.egg !== null) this.egg!.draw();
    for (let i = 0; i < this.characters.length; ++i) this.characters[i].draw();

    if (this.focused && (this.frame - this.focusStartFrame) % 60 <= 30) {
      store<u16>(w4.DRAW_COLORS, 0x20);
      w4.oval(
        <i32>(
          nearest(this.focusX - (<f32>TILE_SIZE * 1.5) / 2 - this.cameraOffsetX)
        ),
        <i32>(
          nearest(this.focusY - (<f32>TILE_SIZE * 1.5) / 2 - this.cameraOffsetY)
        ),
        <i32>nearest(<f32>TILE_SIZE * 1.5),
        <i32>nearest(<f32>TILE_SIZE * 1.5)
      );
    }

    let y = 0;
    switch (this.state) {
      case WorldState.PLAYING:
        if (this.maxEggs > 0) {
          store<u16>(w4.DRAW_COLORS, 0x12);
          if (this.egg === null) {
            if (
              this.eggs > 0 &&
              this.primaryCharacter !== null &&
              this.primaryCharacter!.getTileBelow() === TileType.EGGABLE_BLOCK
            )
              w4.text("\x80 lay", 0, y++ * w4.FONT_SIZE);
            else
              w4.text(
                this.resetTimeout === -1
                  ? "\x80 reset"
                  : `\x80 reset ${(this.resetTimeout + 30) / 60}`,
                0,
                y++ * w4.FONT_SIZE
              );
          } else {
            w4.text("\x80 hatch", 0, y++ * w4.FONT_SIZE);
          }

          const text = `${this.eggs}/${this.maxEggs}`;
          const x = w4.SCREEN_SIZE - text.length * w4.FONT_SIZE;
          w4.text(text, x, 0);
          store<u16>(w4.DRAW_COLORS, 0x21);
          w4.blit(egg8, x - egg8Width, 0, egg8Width, egg8Height, egg8Flags);
        }
        break;
      case WorldState.LEVEL_COMPLETED:
        this.drawLevelCompleted();
        break;
    }
    if (this.characters.length > 1) {
      store<u16>(w4.DRAW_COLORS, 0x12);
      w4.text("\x81 toggle view", 0, y++ * w4.FONT_SIZE);
    }
  }

  private drawLevelCompleted(): void {
    {
      const panelHeight: u32 = min((this.frame - this.stateChangedAt) * 4, 80);
      store<u16>(w4.DRAW_COLORS, 0x13);
      w4.rect(
        -1,
        (w4.SCREEN_SIZE - panelHeight) / 2,
        w4.SCREEN_SIZE + 2,
        panelHeight
      );
    }

    if (this.frame - this.stateChangedAt >= 20) {
      store<u16>(w4.DRAW_COLORS, 0x02);
      const text = "Level completed!";
      w4.text(
        text.slice(
          0,
          min(max(this.frame - this.stateChangedAt, 20) - 20, text.length)
        ),
        16,
        58
      );
    }

    if (this.frame - this.stateChangedAt >= 45) {
      const maxHeight = w4.FONT_SIZE * 2 + 8;

      store<u16>(w4.DRAW_COLORS, 0x01);
      const textHeight =
        maxHeight -
        min((max(this.frame - this.stateChangedAt, 45) - 45) / 2, maxHeight);
      w4.text("press \x80 to continue", 4, 86);
      w4.text("or \x81 to select level", 0, 98);

      store<u16>(w4.DRAW_COLORS, 0x03);
      w4.rect(0, 86 + maxHeight - textHeight, w4.SCREEN_SIZE, textHeight);
    }

    const gamepad = load<u8>(w4.GAMEPAD1);
    const pressedGamepad = gamepad & (gamepad ^ this.game.prevGamepad);

    const mouseButtons = load<u8>(w4.MOUSE_BUTTONS);
    const pressedMouseButtons =
      mouseButtons & (mouseButtons ^ this.game.prevMouseButtons);

    if (pressedGamepad & w4.BUTTON_1 || pressedMouseButtons)
      this.game.nextLevel();
    if (pressedGamepad & w4.BUTTON_2) this.game.goToLevelSelect();
  }
}
